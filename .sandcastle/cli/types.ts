import type { CodexProvider } from "../codex-config";
import type { GithubClient, ProcessRunner } from "../github/types";
import type { AgentType, SandboxType, VerificationResult } from "../types";
import type {
	AgentRunner,
	ExecutionResult,
	WorkflowOptions,
} from "../workflow/types";
import type { RunnerLockManager, WorktreeManager } from "../worktree/types";

export interface StreamKey {
	readonly name?: string;
	readonly ctrl?: boolean;
	readonly sequence?: string;
}

export interface PickerStreamInput {
	readonly isTTY?: boolean;
	setRawMode?(mode: boolean): void;
	on(event: string, listener: (...args: unknown[]) => void): this;
	removeListener(event: string, listener: (...args: unknown[]) => void): this;
}

export interface PickerStreamOutput {
	write(chunk: string): boolean | undefined;
}

export interface PickerOptions {
	readonly input?: PickerStreamInput;
	readonly output?: PickerStreamOutput;
	readonly now?: () => number;
}

export interface PickCliArgs {
	readonly agent?: AgentType;
	readonly model?: string;
	readonly codexProvider?: CodexProvider;
	readonly maxAttempts?: number;
	readonly dryRun?: boolean;
	readonly pr?: boolean;
	readonly localOnly?: boolean;
	readonly branch?: string;
	readonly help?: boolean;
	readonly sandbox?: SandboxType;
	readonly imageName?: string;
	readonly dangerouslySkipPermissions?: boolean;
}

export interface PickCommandOptions {
	readonly args?: PickCliArgs;
	readonly githubClient?: GithubClient;
	readonly agentRunner?: AgentRunner;
	readonly worktreeManager?: WorktreeManager;
	readonly lockManager?: RunnerLockManager;
	readonly gitRunner?: ProcessRunner;
	readonly validator?: (worktreePath: string) => Promise<VerificationResult>;
	readonly executeWorkflow?: (
		options: WorkflowOptions,
	) => Promise<ExecutionResult>;
	readonly cwd?: string;
	readonly input?: PickerStreamInput;
	readonly output?: PickerStreamOutput;
	readonly logger?: (msg: string) => void;
	readonly signal?: AbortSignal;
}
