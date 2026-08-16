import { DefaultGithubClient } from "../github/client";
import { isClaimContention } from "../github/errors";
import { resolveFrontier } from "../github/frontier";
import type { CandidateIssue, GithubClient } from "../github/types";
import { MockAgentRunner } from "../workflow/agent-runner";
import type { ExecutionResult, WorkflowOptions } from "../workflow/types";
import { executeTicketWorkflow } from "../workflow/workflow";
import { DefaultWatcherClock, renderHeartbeatCountdown } from "./heartbeat";
import type {
	WatcherClock,
	WatcherDaemonOptions,
	WatcherDaemonStats,
} from "./types";

export { isClaimContention };

export const defaultDaemonLogger = (msg: string): void => {
	console.log(msg);
};

export class WatcherDaemon {
	private readonly options: WatcherDaemonOptions;
	private readonly intervalSeconds: number;
	private readonly clock: WatcherClock;
	private readonly githubClient: GithubClient;
	private readonly logger: (msg: string) => void;
	private readonly executeWorkflow: (
		options: WorkflowOptions,
	) => Promise<ExecutionResult>;

	constructor(options: WatcherDaemonOptions = {}) {
		this.options = options;
		this.intervalSeconds = Math.max(1, options.intervalSeconds ?? 60);
		this.clock = options.clock ?? new DefaultWatcherClock();
		this.githubClient =
			options.githubClient ?? new DefaultGithubClient({ cwd: options.cwd });
		this.logger = options.logger ?? defaultDaemonLogger;
		this.executeWorkflow = options.executeWorkflow ?? executeTicketWorkflow;
	}

	private isLimitReached(stats: WatcherDaemonStats): boolean {
		if (this.options.once && stats.processedCount >= 1) {
			return true;
		}
		if (
			this.options.limit !== undefined &&
			stats.processedCount >= this.options.limit
		) {
			return true;
		}
		return false;
	}

	private async queryFrontier(): Promise<CandidateIssue[] | null> {
		try {
			const candidates = await this.githubClient.listCandidateIssues();
			return resolveFrontier(candidates);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			this.logger(
				`⚠️  [Sandcastle Watcher] Failed to query GitHub issues: ${msg}. Retrying next cycle...`,
			);
			return null;
		}
	}

	private async handleDryRun(
		issue: CandidateIssue,
		stats: WatcherDaemonStats,
	): Promise<void> {
		this.logger(`[Dry-Run] Target ticket: #${issue.number} (${issue.title})`);
		this.logger(
			`[Dry-Run] Agent: ${this.options.agent ?? "agy"}, Model: ${this.options.model ?? "default"}`,
		);
		stats.processedCount++;
		stats.successCount++;
		const dryResult: ExecutionResult = {
			attempts: 0,
			branch: this.options.branch ?? `dry-run/issue-${issue.number}`,
			durationMs: 0,
			issueNumber: issue.number,
			success: true,
		};
		this.options.onTicketCompleted?.(issue, dryResult);
	}

	private handleWorkflowSuccess(
		issue: CandidateIssue,
		result: ExecutionResult,
		stats: WatcherDaemonStats,
	): void {
		stats.processedCount++;
		stats.successCount++;
		this.options.onTicketCompleted?.(issue, result);
		this.logger(
			`✨ [Sandcastle Watcher] Successfully processed issue #${issue.number}!${result.prUrl ? ` (PR: ${result.prUrl})` : ""}`,
		);
	}

	private handleWorkflowFailure(
		issue: CandidateIssue,
		result: ExecutionResult,
		stats: WatcherDaemonStats,
	): void {
		stats.processedCount++;
		stats.failureCount++;
		this.options.onTicketFailed?.(issue, result);
		this.logger(
			`❌ [Sandcastle Watcher] Execution failed for issue #${issue.number}: ${result.error ?? "Unknown error"}`,
		);
	}

	private handleWorkflowResult(
		issue: CandidateIssue,
		result: ExecutionResult,
		stats: WatcherDaemonStats,
	): boolean {
		if (result.aborted) {
			stats.aborted = true;
			this.logger(
				`🛑 [Sandcastle Watcher] Workflow execution for issue #${issue.number} was aborted.`,
			);
			return false;
		}

		if (result.success) {
			this.handleWorkflowSuccess(issue, result, stats);
			return true;
		}

		if (result.error && isClaimContention(result.error)) {
			this.logger(
				`⚠️  [Sandcastle Watcher] Issue #${issue.number} was claimed concurrently. Refreshing queue...`,
			);
			return true;
		}

		this.handleWorkflowFailure(issue, result, stats);
		return true;
	}

	private handleWorkflowException(
		issue: CandidateIssue,
		err: unknown,
		stats: WatcherDaemonStats,
	): boolean {
		if (isClaimContention(err)) {
			this.logger(
				`⚠️  [Sandcastle Watcher] Issue #${issue.number} is already claimed. Refreshing queue...`,
			);
			return true;
		}

		const msg = err instanceof Error ? err.message : String(err);
		this.logger(
			`⚠️  [Sandcastle Watcher] Unexpected error executing issue #${issue.number}: ${msg}`,
		);
		stats.processedCount++;
		stats.failureCount++;
		const failureResult: ExecutionResult = {
			attempts: 1,
			branch: this.options.branch ?? "",
			durationMs: 0,
			error: msg,
			issueNumber: issue.number,
			success: false,
		};
		this.options.onTicketFailed?.(issue, failureResult);
		return true;
	}

	private async executeCandidate(
		issue: CandidateIssue,
		stats: WatcherDaemonStats,
	): Promise<boolean> {
		this.options.onTicketStarted?.(issue);
		this.logger(
			`🚀 [Sandcastle Watcher] Starting workflow execution for issue #${issue.number}...`,
		);

		try {
			const result = await this.executeWorkflow({
				agentRunner: this.options.agentRunner ?? new MockAgentRunner(),
				branch: this.options.branch,
				cwd: this.options.cwd,
				githubClient: this.githubClient,
				gitRunner: this.options.gitRunner,
				issueNumber: issue.number,
				localOnly: this.options.localOnly,
				lockManager: this.options.lockManager,
				maxAttempts: this.options.maxAttempts,
				onProgress: (stage, detail) => {
					if (stage === "claiming") {
						this.options.onTicketClaimed?.(issue);
					}
					if (detail) {
						this.logger(`[${stage}] ${detail}`);
					}
				},
				pr: this.options.pr,
				signal: this.options.signal,
				validator: this.options.validator,
				worktreeManager: this.options.worktreeManager,
			});

			return this.handleWorkflowResult(issue, result, stats);
		} catch (err: unknown) {
			return this.handleWorkflowException(issue, err, stats);
		}
	}

	private async processFrontierCandidate(
		issue: CandidateIssue,
		stats: WatcherDaemonStats,
	): Promise<boolean> {
		this.options.onTicketDetected?.(issue);
		this.logger(
			`🎯 [Sandcastle Watcher] Found eligible ticket #${issue.number}: "${issue.title}"`,
		);

		if (this.options.dryRun) {
			await this.handleDryRun(issue, stats);
			return true;
		}

		return await this.executeCandidate(issue, stats);
	}

	async run(): Promise<WatcherDaemonStats> {
		const stats: WatcherDaemonStats = {
			aborted: false,
			failureCount: 0,
			processedCount: 0,
			successCount: 0,
		};

		while (!this.options.signal?.aborted && !this.isLimitReached(stats)) {
			const frontier = await this.queryFrontier();

			if (!frontier || frontier.length === 0) {
				await renderHeartbeatCountdown({
					clock: this.clock,
					durationSeconds: this.intervalSeconds,
					logger: this.logger,
					output: this.options.output,
					signal: this.options.signal,
				});
				continue;
			}

			const shouldContinue = await this.processFrontierCandidate(
				frontier[0],
				stats,
			);
			if (!shouldContinue || this.isLimitReached(stats)) {
				break;
			}
		}

		if (this.options.signal?.aborted) {
			stats.aborted = true;
		}

		return stats;
	}
}

export async function runWatcherDaemon(
	options: WatcherDaemonOptions = {},
): Promise<WatcherDaemonStats> {
	const daemon = new WatcherDaemon(options);
	return daemon.run();
}
