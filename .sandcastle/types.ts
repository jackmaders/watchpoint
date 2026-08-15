import type { MountConfig } from "@ai-hero/sandcastle";

export type AgentType = "agy" | "gemini" | "codex" | "claude";

export interface SandcastleCliArgs {
	readonly issue?: number;
	readonly prompt?: string;
	readonly agent: AgentType;
	readonly model?: string;
	readonly maxRetries: number;
	readonly pr: boolean;
	readonly localOnly: boolean;
	readonly dryRun: boolean;
	readonly branch?: string;
}

export interface AuthMountsConfig {
	readonly mounts: MountConfig[];
	readonly env: Record<string, string>;
}

export interface VerificationCheckResult {
	readonly name: string;
	readonly success: boolean;
	readonly output: string;
}

export interface VerificationResult {
	readonly success: boolean;
	readonly checks: VerificationCheckResult[];
	readonly aggregatedError?: string;
}

export interface IssueDetails {
	readonly number: number;
	readonly title: string;
	readonly body: string;
}

export interface OrchestratorOptions {
	readonly args: SandcastleCliArgs;
	readonly cwd?: string;
	readonly homeDir?: string;
}

export interface OrchestratorResult {
	readonly success: boolean;
	readonly branch: string;
	readonly commits: { sha: string }[];
	readonly prUrl?: string;
	readonly error?: string;
	readonly attempts: number;
}
