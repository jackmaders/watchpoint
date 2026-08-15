import type { RunnerLockData } from "./types";

export class RunnerAlreadyLockedError extends Error {
	readonly lockData: RunnerLockData;

	constructor(lockData: RunnerLockData) {
		const branchInfo = lockData.branch ? `, branch: ${lockData.branch}` : "";
		const issueInfo = lockData.issueNumber
			? `, issue: #${lockData.issueNumber}`
			: "";
		super(
			`Runner lock is already held by PID ${lockData.pid} (started at ${lockData.startedAt}${branchInfo}${issueInfo})`,
		);
		this.name = "RunnerAlreadyLockedError";
		this.lockData = lockData;
	}
}

export class WorktreeCreationError extends Error {
	readonly branch: string;
	readonly worktreePath: string;
	readonly causeError?: unknown;

	constructor(
		branch: string,
		worktreePath: string,
		message: string,
		causeError?: unknown,
	) {
		super(
			`Failed to create worktree for branch '${branch}' at '${worktreePath}': ${message}`,
		);
		this.name = "WorktreeCreationError";
		this.branch = branch;
		this.worktreePath = worktreePath;
		this.causeError = causeError;
	}
}

export class WorktreeCleanupError extends Error {
	readonly worktreePath: string;
	readonly causeError?: unknown;

	constructor(worktreePath: string, message: string, causeError?: unknown) {
		super(`Failed to clean up worktree at '${worktreePath}': ${message}`);
		this.name = "WorktreeCleanupError";
		this.worktreePath = worktreePath;
		this.causeError = causeError;
	}
}

export class RunnerLockError extends Error {
	readonly causeError?: unknown;

	constructor(message: string, causeError?: unknown) {
		super(message);
		this.name = "RunnerLockError";
		this.causeError = causeError;
	}
}
