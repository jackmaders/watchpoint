import fs from "node:fs";
import path from "node:path";
import { RunnerAlreadyLockedError, RunnerLockError } from "./errors";
import type {
	Logger,
	RunnerLockAcquireOptions,
	RunnerLockData,
	RunnerLockManager,
	RunnerLockManagerOptions,
	RunnerLockStatus,
} from "./types";

export function defaultIsProcessAlive(pid: number): boolean {
	if (typeof pid !== "number" || Number.isNaN(pid) || pid <= 0) {
		return false;
	}
	try {
		process.kill(pid, 0);
		return true;
	} catch (err: unknown) {
		const code = (err as NodeJS.ErrnoException).code;
		if (code === "ESRCH") {
			return false;
		}
		if (code === "EPERM") {
			return true;
		}
		return false;
	}
}

export const defaultLogger: Logger = {
	info: (message: string) => {
		console.info(message);
	},
	warn: (message: string) => {
		console.warn(message);
	},
};

export class DefaultRunnerLockManager implements RunnerLockManager {
	private readonly lockFilePath: string;
	private readonly isProcessAlive: (pid: number) => boolean;
	private readonly logger: Logger;

	constructor(options: RunnerLockManagerOptions = {}) {
		this.lockFilePath =
			options.lockFilePath ??
			path.resolve(process.cwd(), ".sandcastle", "runner.lock");
		this.isProcessAlive = options.isProcessAlive ?? defaultIsProcessAlive;
		this.logger = options.logger ?? defaultLogger;
	}

	private async ensureLockDir(): Promise<void> {
		const lockDir = path.dirname(this.lockFilePath);
		try {
			await fs.promises.mkdir(lockDir, { recursive: true });
		} catch (err: unknown) {
			throw new RunnerLockError(
				`Failed to create lock directory at '${lockDir}': ${(err as Error).message}`,
				err,
			);
		}
	}

	private async tryWriteLockFile(lockData: RunnerLockData): Promise<boolean> {
		const content = JSON.stringify(lockData, null, 2);
		try {
			await fs.promises.writeFile(this.lockFilePath, content, { flag: "wx" });
			return true;
		} catch (err: unknown) {
			const code = (err as NodeJS.ErrnoException).code;
			if (code !== "EEXIST") {
				throw new RunnerLockError(
					`Failed to create lockfile at '${this.lockFilePath}': ${(err as Error).message}`,
					err,
				);
			}
			return false;
		}
	}

	private async readExistingLock(): Promise<RunnerLockData | null> {
		try {
			const content = await fs.promises.readFile(this.lockFilePath, "utf8");
			const parsed = JSON.parse(content) as RunnerLockData;
			if (parsed && typeof parsed.pid === "number" && parsed.startedAt) {
				return parsed;
			}
			this.logger.warn(
				`Reclaiming malformed runner lockfile at '${this.lockFilePath}'`,
			);
		} catch {
			this.logger.warn(
				`Reclaiming corrupted runner lockfile at '${this.lockFilePath}'`,
			);
		}
		return null;
	}

	private async unlinkLockFile(isStale: boolean): Promise<void> {
		try {
			await fs.promises.unlink(this.lockFilePath);
		} catch (err: unknown) {
			const code = (err as NodeJS.ErrnoException).code;
			if (code !== "ENOENT") {
				const action = isStale ? "remove stale" : "release";
				throw new RunnerLockError(
					`Failed to ${action} lockfile at '${this.lockFilePath}': ${(err as Error).message}`,
					err,
				);
			}
		}
	}

	private async reclaimStaleLock(
		existingLock: RunnerLockData | null,
	): Promise<void> {
		if (existingLock) {
			const isAlive = this.isProcessAlive(existingLock.pid);
			if (isAlive) {
				throw new RunnerAlreadyLockedError(existingLock);
			}
			this.logger.warn(
				`Reclaiming stale runner lock held by dead PID ${existingLock.pid} (started at ${existingLock.startedAt})`,
			);
		}
		await this.unlinkLockFile(true);
	}

	async acquireLock(
		options?: RunnerLockAcquireOptions,
	): Promise<RunnerLockData> {
		const lockData: RunnerLockData = {
			branch: options?.branch,
			issueNumber: options?.issueNumber,
			pid: options?.pid ?? process.pid,
			startedAt: options?.startedAt ?? new Date().toISOString(),
		};

		await this.ensureLockDir();

		const written = await this.tryWriteLockFile(lockData);
		if (written) {
			return lockData;
		}

		const existing = await this.readExistingLock();
		await this.reclaimStaleLock(existing);
		return this.acquireLock(options);
	}

	async releaseLock(): Promise<void> {
		await this.unlinkLockFile(false);
	}

	async getLockStatus(): Promise<RunnerLockStatus> {
		let content: string;
		try {
			content = await fs.promises.readFile(this.lockFilePath, "utf8");
		} catch (err: unknown) {
			const code = (err as NodeJS.ErrnoException).code;
			if (code === "ENOENT") {
				return { isLocked: false };
			}
			throw new RunnerLockError(
				`Failed to read lock status from '${this.lockFilePath}': ${(err as Error).message}`,
				err,
			);
		}

		try {
			const lockData = JSON.parse(content) as RunnerLockData;
			if (
				!lockData ||
				typeof lockData.pid !== "number" ||
				!lockData.startedAt
			) {
				return {
					isLocked: false,
					isStale: true,
				};
			}
			const isAlive = this.isProcessAlive(lockData.pid);
			return {
				isLocked: isAlive,
				isStale: !isAlive,
				lock: lockData,
			};
		} catch {
			return {
				isLocked: false,
				isStale: true,
			};
		}
	}

	registerSignalHandlers(onCleanup?: () => Promise<void> | void): () => void {
		const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGHUP"];
		let isCleaningUp = false;

		const handler = async (signal: NodeJS.Signals) => {
			if (isCleaningUp) {
				return;
			}
			isCleaningUp = true;
			try {
				if (onCleanup) {
					await onCleanup();
				}
				await this.releaseLock();
			} catch {
				// Best-effort cleanup on termination signal
			} finally {
				cleanupListeners();
				process.kill(process.pid, signal);
			}
		};

		const listeners = new Map<NodeJS.Signals, () => void>();
		for (const sig of signals) {
			const listener = () => {
				handler(sig);
			};
			listeners.set(sig, listener);
			process.once(sig, listener);
		}

		const cleanupListeners = () => {
			for (const [sig, listener] of listeners.entries()) {
				process.removeListener(sig, listener);
			}
			listeners.clear();
		};

		return cleanupListeners;
	}
}

export class MockRunnerLockManager implements RunnerLockManager {
	private currentLock: RunnerLockData | null = null;
	private isProcessAlive: (pid: number) => boolean;
	private logger?: Logger;
	private signalCleanupRegistered = false;

	constructor(
		options: {
			initialLock?: RunnerLockData | null;
			isProcessAlive?: (pid: number) => boolean;
			logger?: Logger;
		} = {},
	) {
		this.currentLock = options.initialLock ? { ...options.initialLock } : null;
		this.isProcessAlive = options.isProcessAlive ?? (() => true);
		this.logger = options.logger;
	}

	setCurrentLock(lock: RunnerLockData | null): void {
		this.currentLock = lock ? { ...lock } : null;
	}

	setIsProcessAlive(fn: (pid: number) => boolean): void {
		this.isProcessAlive = fn;
	}

	async acquireLock(
		options?: RunnerLockAcquireOptions,
	): Promise<RunnerLockData> {
		const newLock: RunnerLockData = {
			branch: options?.branch,
			issueNumber: options?.issueNumber,
			pid: options?.pid ?? 12345,
			startedAt: options?.startedAt ?? new Date().toISOString(),
		};

		if (this.currentLock) {
			const isAlive = this.isProcessAlive(this.currentLock.pid);
			if (isAlive) {
				throw new RunnerAlreadyLockedError(this.currentLock);
			}

			if (this.logger) {
				this.logger.warn(
					`Reclaiming stale runner lock held by dead PID ${this.currentLock.pid} (started at ${this.currentLock.startedAt})`,
				);
			}
		}

		this.currentLock = newLock;
		return newLock;
	}

	async releaseLock(): Promise<void> {
		this.currentLock = null;
	}

	async getLockStatus(): Promise<RunnerLockStatus> {
		if (!this.currentLock) {
			return { isLocked: false };
		}
		const isAlive = this.isProcessAlive(this.currentLock.pid);
		return {
			isLocked: isAlive,
			isStale: !isAlive,
			lock: { ...this.currentLock },
		};
	}

	registerSignalHandlers(_onCleanup?: () => Promise<void> | void): () => void {
		this.signalCleanupRegistered = true;
		return () => {
			this.signalCleanupRegistered = false;
		};
	}

	isSignalHandlerRegistered(): boolean {
		return this.signalCleanupRegistered;
	}
}
