import type {
	CandidateIssue,
	GithubClient,
	ProcessRunner,
} from "../github/types";
import type { VerificationResult } from "../types";
import type { RunnerLockManager, WorktreeManager } from "../worktree/types";

export type WorkflowStage =
	| "locking"
	| "claiming"
	| "worktree"
	| "executing"
	| "validating"
	| "delivering"
	| "failing"
	| "cleanup";

export interface AgentRunOptions {
	readonly prompt: string;
	readonly branch: string;
	readonly worktreePath?: string;
	readonly attempt: number;
	readonly maxAttempts: number;
	readonly signal?: AbortSignal;
}

export interface AgentRunResult {
	readonly commits: readonly { readonly sha: string }[];
	readonly stdout?: string;
}

export interface AgentRunner {
	run(options: AgentRunOptions): Promise<AgentRunResult>;
}

export interface DiagnosticDetails {
	readonly issueNumber: number;
	readonly title: string;
	readonly branch: string;
	readonly reason: string;
	readonly attempts: number;
	readonly maxAttempts: number;
	readonly durationMs: number;
	readonly validationOutput?: string;
}

export interface FailureContext {
	readonly issueNumber: number;
	readonly issueTitle: string;
	readonly branch: string;
	readonly reason: string;
	readonly attempts: number;
	readonly maxAttempts: number;
	readonly durationMs: number;
	readonly validationOutput?: string;
	readonly githubClient: GithubClient;
	readonly gitRunner?: ProcessRunner;
	readonly worktreePath?: string;
	readonly cwd?: string;
}

export interface DeliverPullRequestOptions {
	readonly issue:
		| CandidateIssue
		| {
				readonly number: number;
				readonly title: string;
				readonly body?: string;
		  };
	readonly branch: string;
	readonly attempts: number;
	readonly githubClient: GithubClient;
	readonly gitRunner?: ProcessRunner;
	readonly cwd?: string;
	readonly baseBranch?: string;
}

export interface WorkflowOptions {
	readonly issueNumber: number;
	readonly githubClient?: GithubClient;
	readonly worktreeManager?: WorktreeManager;
	readonly lockManager?: RunnerLockManager;
	readonly agentRunner: AgentRunner;
	readonly validator?: (worktreePath: string) => Promise<VerificationResult>;
	readonly gitRunner?: ProcessRunner;
	readonly branch?: string;
	readonly maxAttempts?: number;
	readonly signal?: AbortSignal;
	readonly onProgress?: (stage: WorkflowStage, detail?: string) => void;
	readonly cwd?: string;
	readonly pr?: boolean;
	readonly localOnly?: boolean;
}

export interface ExecutionResult {
	readonly success: boolean;
	readonly issueNumber: number;
	readonly branch: string;
	readonly attempts: number;
	readonly durationMs: number;
	readonly prUrl?: string;
	readonly error?: string;
	readonly aborted?: boolean;
}
