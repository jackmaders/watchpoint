import { generateBranchName } from "../git-manager";
import { DefaultGithubClient, defaultBunSpawnRunner } from "../github/client";
import type {
	CandidateIssue,
	GithubClient,
	ProcessRunner,
} from "../github/types";
import { buildSelfHealingPrompt, runVerificationChecks } from "../self-healing";
import type { VerificationResult } from "../types";
import {
	DefaultRunnerLockManager,
	DefaultWorktreeManager,
	type RunnerLockManager,
	type WorktreeInfo,
	type WorktreeManager,
} from "../worktree";
import { handleExecutionFailure } from "./failure-handler";
import { deliverPullRequest } from "./pr-delivery";
import type { ExecutionResult, WorkflowOptions } from "./types";

interface WorkflowContext {
	readonly options: WorkflowOptions;
	readonly startTime: number;
	readonly githubClient: GithubClient;
	readonly worktreeManager: WorktreeManager;
	readonly lockManager: RunnerLockManager;
	readonly gitRunner: ProcessRunner;
	readonly validator: (worktreePath: string) => Promise<VerificationResult>;
	readonly maxAttempts: number;
}

interface WorkflowState {
	lockAcquired: boolean;
	issueClaimed: boolean;
	branch: string;
	issue: CandidateIssue | null;
	worktreeInfo: WorktreeInfo | null;
	attempts: number;
	lastValidationOutput: string;
	routedModel?: string;
}

interface ProvisionedWorkflow {
	readonly issue: CandidateIssue;
	readonly worktreeInfo: WorktreeInfo;
}

function createDefaultValidator(gitRunner: ProcessRunner) {
	return async (worktreePath: string): Promise<VerificationResult> => {
		return runVerificationChecks(async (cmd) => {
			const parts = cmd.split(" ");
			const res = await gitRunner(parts, { cwd: worktreePath });
			return {
				exitCode: res.exitCode,
				stderr: res.stderr,
				stdout: res.stdout,
			};
		});
	};
}

function buildInitialContext(
	options: WorkflowOptions,
	startTime: number,
	gitRunner: ProcessRunner,
): WorkflowContext {
	return {
		githubClient:
			options.githubClient ?? new DefaultGithubClient({ cwd: options.cwd }),
		gitRunner,
		lockManager: options.lockManager ?? new DefaultRunnerLockManager(),
		maxAttempts: options.maxAttempts ?? 3,
		options,
		startTime,
		validator: options.validator ?? createDefaultValidator(gitRunner),
		worktreeManager:
			options.worktreeManager ??
			new DefaultWorktreeManager({ cwd: options.cwd }),
	};
}

async function handleWorkflowCancellation(
	ctx: WorkflowContext,
	state: WorkflowState,
	reason: string,
): Promise<ExecutionResult> {
	if (state.issueClaimed) {
		try {
			await ctx.githubClient.releaseClaim(ctx.options.issueNumber);
		} catch {
			// Ignore release failure on abort
		}
	}
	return {
		aborted: true,
		attempts: state.attempts,
		branch: state.branch,
		durationMs: Date.now() - ctx.startTime,
		error: reason,
		issueNumber: ctx.options.issueNumber,
		success: false,
	};
}

async function provisionWorkflow(
	ctx: WorkflowContext,
	state: WorkflowState,
): Promise<
	| { success: true; provisioned: ProvisionedWorkflow }
	| { success: false; abortResult: ExecutionResult }
> {
	const issue = await ctx.githubClient.getIssue(ctx.options.issueNumber);
	state.issue = issue;
	state.branch =
		ctx.options.branch ??
		generateBranchName({
			issue: { number: issue.number, title: issue.title },
		});

	ctx.options.onProgress?.(
		"locking",
		`Acquiring lock for issue #${ctx.options.issueNumber}...`,
	);
	await ctx.lockManager.acquireLock({
		branch: state.branch,
		issueNumber: ctx.options.issueNumber,
	});
	state.lockAcquired = true;

	if (ctx.options.signal?.aborted) {
		const abortResult = await handleWorkflowCancellation(
			ctx,
			state,
			"Workflow aborted before claiming",
		);
		return { abortResult, success: false };
	}

	ctx.options.onProgress?.(
		"claiming",
		`Claiming issue #${ctx.options.issueNumber}...`,
	);
	await ctx.githubClient.claimIssue(ctx.options.issueNumber);
	state.issueClaimed = true;

	if (ctx.options.signal?.aborted) {
		const abortResult = await handleWorkflowCancellation(
			ctx,
			state,
			"Workflow aborted after claiming",
		);
		return { abortResult, success: false };
	}

	ctx.options.onProgress?.(
		"worktree",
		`Creating worktree for branch ${state.branch}...`,
	);
	const worktreeInfo = await ctx.worktreeManager.createWorktree({
		branch: state.branch,
	});
	state.worktreeInfo = worktreeInfo;
	state.branch = worktreeInfo.branch;

	return {
		provisioned: {
			issue,
			worktreeInfo,
		},
		success: true,
	};
}

async function executeAttemptIteration(
	ctx: WorkflowContext,
	state: WorkflowState,
	worktreePath: string,
	currentPrompt: string,
): Promise<boolean> {
	state.attempts++;
	ctx.options.onProgress?.(
		"executing",
		`Running agent attempt ${state.attempts}/${ctx.maxAttempts}...`,
	);
	const runResult = await ctx.options.agentRunner.run({
		attempt: state.attempts,
		branch: state.branch,
		maxAttempts: ctx.maxAttempts,
		prompt: currentPrompt,
		signal: ctx.options.signal,
		worktreePath,
	});
	state.routedModel = runResult.routedModel ?? state.routedModel;

	if (ctx.options.signal?.aborted) {
		return false;
	}

	ctx.options.onProgress?.(
		"validating",
		`Validating attempt ${state.attempts}/${ctx.maxAttempts}...`,
	);
	const validation = await ctx.validator(worktreePath);

	if (validation.success) {
		return true;
	}

	const checkOutputs = validation.checks
		.map((c) => c.output)
		.filter(Boolean)
		.join("\n");
	state.lastValidationOutput =
		validation.aggregatedError || checkOutputs || "Validation checks failed";

	return false;
}

async function runSelfHealingLoop(
	ctx: WorkflowContext,
	state: WorkflowState,
	worktreePath: string,
	initialPrompt: string,
): Promise<boolean> {
	let currentPrompt = initialPrompt;

	while (state.attempts < ctx.maxAttempts) {
		if (ctx.options.signal?.aborted) {
			return false;
		}

		const passed = await executeAttemptIteration(
			ctx,
			state,
			worktreePath,
			currentPrompt,
		);
		if (passed) {
			return true;
		}

		if (state.attempts < ctx.maxAttempts) {
			currentPrompt = buildSelfHealingPrompt({
				attempt: state.attempts,
				failureOutput: state.lastValidationOutput,
				maxAttempts: ctx.maxAttempts,
				originalPrompt: initialPrompt,
			});
		}
	}

	return false;
}

async function deliverSuccessResult(
	ctx: WorkflowContext,
	state: WorkflowState,
	worktreePath: string,
	issue: CandidateIssue,
): Promise<ExecutionResult> {
	if (ctx.options.localOnly || ctx.options.pr === false) {
		ctx.options.onProgress?.(
			"delivering",
			"Skipping pull request delivery (local-only / no-pr mode)...",
		);
		return {
			attempts: state.attempts,
			branch: state.branch,
			durationMs: Date.now() - ctx.startTime,
			issueNumber: ctx.options.issueNumber,
			...(state.routedModel ? { routedModel: state.routedModel } : {}),
			success: true,
		};
	}

	ctx.options.onProgress?.("delivering", "Delivering pull request...");
	const prResult = await deliverPullRequest({
		attempts: state.attempts,
		branch: state.branch,
		cwd: worktreePath,
		githubClient: ctx.githubClient,
		gitRunner: ctx.gitRunner,
		issue,
	});

	return {
		attempts: state.attempts,
		branch: state.branch,
		durationMs: Date.now() - ctx.startTime,
		issueNumber: ctx.options.issueNumber,
		prUrl: prResult.url,
		...(state.routedModel ? { routedModel: state.routedModel } : {}),
		success: true,
	};
}

async function deliverFailureResult(
	ctx: WorkflowContext,
	state: WorkflowState,
	issueTitle: string,
): Promise<ExecutionResult> {
	const failureReason = `Validation checks failed after ${state.attempts} attempt(s)`;
	ctx.options.onProgress?.("failing", failureReason);
	await handleExecutionFailure({
		attempts: state.attempts,
		branch: state.branch,
		cwd: ctx.options.cwd,
		durationMs: Date.now() - ctx.startTime,
		githubClient: ctx.githubClient,
		gitRunner: ctx.gitRunner,
		issueNumber: ctx.options.issueNumber,
		issueTitle,
		maxAttempts: ctx.maxAttempts,
		reason: failureReason,
		validationOutput: state.lastValidationOutput,
		worktreePath: state.worktreeInfo?.path,
	});

	return {
		attempts: state.attempts,
		branch: state.branch,
		durationMs: Date.now() - ctx.startTime,
		error: failureReason,
		issueNumber: ctx.options.issueNumber,
		success: false,
	};
}

async function handleWorkflowError(
	ctx: WorkflowContext,
	state: WorkflowState,
	error: unknown,
): Promise<ExecutionResult> {
	const err = error instanceof Error ? error : new Error(String(error));

	if (ctx.options.signal?.aborted) {
		return handleWorkflowCancellation(
			ctx,
			state,
			"Workflow cancelled by AbortSignal",
		);
	}

	if (state.issueClaimed && state.issue) {
		try {
			await handleExecutionFailure({
				attempts: state.attempts || 1,
				branch: state.branch,
				cwd: ctx.options.cwd,
				durationMs: Date.now() - ctx.startTime,
				githubClient: ctx.githubClient,
				gitRunner: ctx.gitRunner,
				issueNumber: ctx.options.issueNumber,
				issueTitle: state.issue.title,
				maxAttempts: ctx.maxAttempts,
				reason: err.message,
				validationOutput:
					state.lastValidationOutput || err.stack || err.message,
				worktreePath: state.worktreeInfo?.path,
			});
		} catch {
			// Best-effort failure recovery
		}
	}

	return {
		attempts: state.attempts,
		branch: state.branch,
		durationMs: Date.now() - ctx.startTime,
		error: err.message,
		issueNumber: ctx.options.issueNumber,
		success: false,
	};
}

async function cleanupWorkflowResources(
	ctx: WorkflowContext,
	state: WorkflowState,
): Promise<void> {
	ctx.options.onProgress?.("cleanup", "Cleaning up resources...");
	if (state.worktreeInfo) {
		try {
			await ctx.worktreeManager.removeWorktree(state.worktreeInfo.path);
		} catch {
			// Ignore cleanup failure
		}
	}
	if (state.lockAcquired) {
		try {
			await ctx.lockManager.releaseLock();
		} catch {
			// Ignore release failure
		}
	}
}

async function runProvisionedWorkflow(
	ctx: WorkflowContext,
	state: WorkflowState,
	provisioned: ProvisionedWorkflow,
): Promise<ExecutionResult> {
	const prompt = `Task from GitHub Issue #${provisioned.issue.number}: ${provisioned.issue.title}\n\n${provisioned.issue.body}`;
	const passed = await runSelfHealingLoop(
		ctx,
		state,
		provisioned.worktreeInfo.path,
		prompt,
	);

	if (ctx.options.signal?.aborted) {
		return await handleWorkflowCancellation(
			ctx,
			state,
			"Workflow cancelled by AbortSignal",
		);
	}

	if (passed) {
		return await deliverSuccessResult(
			ctx,
			state,
			provisioned.worktreeInfo.path,
			provisioned.issue,
		);
	}

	return await deliverFailureResult(ctx, state, provisioned.issue.title);
}

export async function executeTicketWorkflow(
	options: WorkflowOptions,
): Promise<ExecutionResult> {
	const startTime = Date.now();
	if (options.signal?.aborted) {
		return {
			aborted: true,
			attempts: 0,
			branch: options.branch ?? "",
			durationMs: 0,
			error: "Workflow aborted before execution",
			issueNumber: options.issueNumber,
			success: false,
		};
	}

	const gitRunner = options.gitRunner ?? defaultBunSpawnRunner;
	const ctx = buildInitialContext(options, startTime, gitRunner);
	const state: WorkflowState = {
		attempts: 0,
		branch: options.branch ?? "",
		issue: null,
		issueClaimed: false,
		lastValidationOutput: "",
		lockAcquired: false,
		worktreeInfo: null,
	};

	try {
		const result = await provisionWorkflow(ctx, state);
		if (!result.success) {
			return result.abortResult;
		}

		return await runProvisionedWorkflow(ctx, state, result.provisioned);
	} catch (error: unknown) {
		return await handleWorkflowError(ctx, state, error);
	} finally {
		await cleanupWorkflowResources(ctx, state);
	}
}
