import type { ProcessRunner } from "../github/types";

export interface RunnerLockData {
	readonly pid: number;
	readonly startedAt: string;
	readonly issueNumber?: number;
	readonly branch?: string;
}

export interface RunnerLockStatus {
	readonly isLocked: boolean;
	readonly lock?: RunnerLockData;
	readonly isStale?: boolean;
}

export interface RunnerLockAcquireOptions {
	readonly issueNumber?: number;
	readonly branch?: string;
	readonly pid?: number;
	readonly startedAt?: string;
}

export interface Logger {
	warn(message: string): void;
	info?(message: string): void;
}

export interface RunnerLockManagerOptions {
	readonly lockFilePath?: string;
	readonly isProcessAlive?: (pid: number) => boolean;
	readonly logger?: Logger;
}

export interface RunnerLockManager {
	acquireLock(options?: RunnerLockAcquireOptions): Promise<RunnerLockData>;
	releaseLock(): Promise<void>;
	getLockStatus(): Promise<RunnerLockStatus>;
	registerSignalHandlers(onCleanup?: () => Promise<void> | void): () => void;
}

export interface WorktreeInfo {
	readonly path: string;
	readonly branch: string;
	readonly baseBranch: string;
	readonly createdAt: string;
}

export interface CreateWorktreeOptions {
	readonly branch: string;
	readonly baseBranch?: string;
	readonly runInstall?: boolean;
}

export interface WorktreeManagerOptions {
	readonly baseDir?: string;
	readonly runner?: ProcessRunner;
	readonly cwd?: string;
}

export interface WorktreeManager {
	createWorktree(options: CreateWorktreeOptions): Promise<WorktreeInfo>;
	removeWorktree(branchOrPath: string): Promise<void>;
	pruneWorktrees(): Promise<void>;
	listWorktrees(): Promise<WorktreeInfo[]>;
	cleanup(): Promise<void>;
}
