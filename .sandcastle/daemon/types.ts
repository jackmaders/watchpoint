import type {
	CandidateIssue,
	GithubClient,
	ProcessRunner,
} from "../github/types";
import type { AgentType, VerificationResult } from "../types";
import type {
	AgentRunner,
	ExecutionResult,
	WorkflowOptions,
} from "../workflow/types";
import type { RunnerLockManager, WorktreeManager } from "../worktree/types";

export interface WatcherClock {
	sleep(ms: number, signal?: AbortSignal): Promise<void>;
	now(): number;
}

export interface WatcherDaemonStats {
	processedCount: number;
	successCount: number;
	failureCount: number;
	aborted: boolean;
}

export interface WatcherTelemetryEvents {
	onTicketDetected?: (issue: CandidateIssue) => void;
	onTicketClaimed?: (issue: CandidateIssue) => void;
	onTicketStarted?: (issue: CandidateIssue) => void;
	onTicketCompleted?: (issue: CandidateIssue, result: ExecutionResult) => void;
	onTicketFailed?: (issue: CandidateIssue, result: ExecutionResult) => void;
}

export interface WatcherDaemonOptions extends WatcherTelemetryEvents {
	readonly intervalSeconds?: number;
	readonly once?: boolean;
	readonly limit?: number;
	readonly dryRun?: boolean;
	readonly agent?: AgentType;
	readonly model?: string;
	readonly maxAttempts?: number;
	readonly branch?: string;
	readonly pr?: boolean;
	readonly localOnly?: boolean;

	readonly githubClient?: GithubClient;
	readonly worktreeManager?: WorktreeManager;
	readonly lockManager?: RunnerLockManager;
	readonly agentRunner?: AgentRunner;
	readonly gitRunner?: ProcessRunner;
	readonly validator?: (worktreePath: string) => Promise<VerificationResult>;
	readonly clock?: WatcherClock;
	readonly signal?: AbortSignal;
	readonly logger?: (msg: string) => void;
	readonly output?: {
		write(chunk: string): boolean | undefined;
		isTTY?: boolean;
	};
	readonly cwd?: string;
	readonly executeWorkflow?: (
		options: WorkflowOptions,
	) => Promise<ExecutionResult>;
}

export interface WatchCliArgs {
	readonly intervalSeconds: number;
	readonly once: boolean;
	readonly limit?: number;
	readonly agent: AgentType;
	readonly model?: string;
	readonly maxAttempts: number;
	readonly dryRun: boolean;
	readonly pr: boolean;
	readonly localOnly: boolean;
	readonly branch?: string;
	readonly help: boolean;
}

export interface WatchCommandOptions extends Partial<WatcherDaemonOptions> {
	readonly args?: Partial<WatchCliArgs>;
}
