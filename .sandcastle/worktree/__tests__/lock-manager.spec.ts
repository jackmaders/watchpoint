import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RunnerAlreadyLockedError, RunnerLockError } from "../errors";
import {
	DefaultRunnerLockManager,
	defaultIsProcessAlive,
	defaultLogger,
	MockRunnerLockManager,
} from "../lock-manager";
import type { Logger, RunnerLockData } from "../types";

describe("RunnerLockManager", () => {
	describe("defaultLogger", () => {
		it("logs messages to console info and warn", () => {
			// Arrange
			const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			// Act
			defaultLogger.info?.("test info message");
			defaultLogger.warn("test warn message");

			// Assert
			expect(infoSpy).toHaveBeenCalledWith("test info message");
			expect(warnSpy).toHaveBeenCalledWith("test warn message");
			infoSpy.mockRestore();
			warnSpy.mockRestore();
		});
	});

	describe("defaultIsProcessAlive", () => {
		it("returns true for the current process", () => {
			// Arrange
			const pid = process.pid;

			// Act
			const isAlive = defaultIsProcessAlive(pid);

			// Assert
			expect(isAlive).toBe(true);
		});

		it("returns false for non-positive or NaN PIDs", () => {
			// Arrange
			const invalidPids = [-1, 0, Number.NaN, undefined as unknown as number];

			// Act
			const results = invalidPids.map((pid) => defaultIsProcessAlive(pid));

			// Assert
			expect(results).toEqual([false, false, false, false]);
		});

		it("returns false when ESRCH is thrown", () => {
			// Arrange
			const spy = vi.spyOn(process, "kill").mockImplementation(() => {
				const err = new Error("kill ESRCH") as NodeJS.ErrnoException;
				err.code = "ESRCH";
				throw err;
			});

			// Act
			const isAlive = defaultIsProcessAlive(999999);
			spy.mockRestore();

			// Assert
			expect(isAlive).toBe(false);
		});

		it("returns true when EPERM is thrown", () => {
			// Arrange
			const spy = vi.spyOn(process, "kill").mockImplementation(() => {
				const err = new Error("kill EPERM") as NodeJS.ErrnoException;
				err.code = "EPERM";
				throw err;
			});

			// Act
			const isAlive = defaultIsProcessAlive(1);
			spy.mockRestore();

			// Assert
			expect(isAlive).toBe(true);
		});

		it("returns false for other unexpected errors", () => {
			// Arrange
			const spy = vi.spyOn(process, "kill").mockImplementation(() => {
				throw new Error("unexpected error");
			});

			// Act
			const isAlive = defaultIsProcessAlive(12345);
			spy.mockRestore();

			// Assert
			expect(isAlive).toBe(false);
		});
	});

	describe("DefaultRunnerLockManager", () => {
		let tempDir: string;
		let lockFilePath: string;
		let mockLogger: Logger;
		let warnings: string[];

		beforeEach(async () => {
			tempDir = await fs.promises.mkdtemp(
				path.join(os.tmpdir(), "sandcastle-lock-test-"),
			);
			lockFilePath = path.join(tempDir, "runner.lock");
			warnings = [];
			mockLogger = {
				info: vi.fn(),
				warn: (msg: string) => {
					warnings.push(msg);
				},
			};
		});

		afterEach(async () => {
			try {
				await fs.promises.rm(tempDir, { force: true, recursive: true });
			} catch {
				// Ignore cleanup error
			}
		});

		it("initializes with default options without error", () => {
			// Arrange
			const options = {};

			// Act
			const manager = new DefaultRunnerLockManager(options);

			// Assert
			expect(manager).toBeDefined();
		});

		it("acquires lock successfully when free", async () => {
			// Arrange
			const manager = new DefaultRunnerLockManager({
				lockFilePath,
				logger: mockLogger,
			});

			// Act
			const lock = await manager.acquireLock({
				branch: "feat/task-1",
				issueNumber: 123,
			});

			// Assert
			expect(lock.branch).toBe("feat/task-1");
			expect(lock.issueNumber).toBe(123);
			expect(lock.pid).toBe(process.pid);
			expect(typeof lock.startedAt).toBe("string");
		});

		it("throws RunnerAlreadyLockedError when active process holds the lock", async () => {
			// Arrange
			const activeLockData: RunnerLockData = {
				branch: "feat/active",
				issueNumber: 42,
				pid: 9999,
				startedAt: new Date().toISOString(),
			};
			await fs.promises.writeFile(
				lockFilePath,
				JSON.stringify(activeLockData, null, 2),
			);
			const manager = new DefaultRunnerLockManager({
				isProcessAlive: () => true,
				lockFilePath,
				logger: mockLogger,
			});

			// Act
			const acquirePromise = manager.acquireLock();

			// Assert
			await expect(acquirePromise).rejects.toThrow(RunnerAlreadyLockedError);
		});

		it("reclaims stale lock file and logs warning when process is dead", async () => {
			// Arrange
			const staleLockData: RunnerLockData = {
				branch: "fix/stale",
				issueNumber: 99,
				pid: 8888,
				startedAt: "2026-08-01T00:00:00.000Z",
			};
			await fs.promises.writeFile(
				lockFilePath,
				JSON.stringify(staleLockData, null, 2),
			);
			const manager = new DefaultRunnerLockManager({
				isProcessAlive: (pid) => pid !== 8888,
				lockFilePath,
				logger: mockLogger,
			});

			// Act
			const acquired = await manager.acquireLock({
				branch: "feat/new",
				issueNumber: 100,
			});

			// Assert
			expect(acquired.branch).toBe("feat/new");
			expect(acquired.issueNumber).toBe(100);
			expect(warnings.length).toBe(1);
			expect(warnings[0]).toContain(
				"Reclaiming stale runner lock held by dead PID 8888",
			);
		});

		it("throws RunnerLockError when removing stale lock fails with non-ENOENT", async () => {
			// Arrange
			const staleLockData: RunnerLockData = {
				branch: "fix/stale",
				pid: 8888,
				startedAt: "2026-08-01T00:00:00.000Z",
			};
			await fs.promises.writeFile(
				lockFilePath,
				JSON.stringify(staleLockData, null, 2),
			);
			const manager = new DefaultRunnerLockManager({
				isProcessAlive: () => false,
				lockFilePath,
				logger: mockLogger,
			});
			const spy = vi.spyOn(fs.promises, "unlink").mockRejectedValueOnce(
				Object.assign(new Error("EACCES: permission denied"), {
					code: "EACCES",
				}),
			);

			// Act
			const acquirePromise = manager.acquireLock();

			// Assert
			await expect(acquirePromise).rejects.toThrow(RunnerLockError);
			spy.mockRestore();
		});

		it("reclaims corrupted lock file and logs warning", async () => {
			// Arrange
			await fs.promises.writeFile(lockFilePath, "NOT_JSON{{{");
			const manager = new DefaultRunnerLockManager({
				lockFilePath,
				logger: mockLogger,
			});

			// Act
			const acquired = await manager.acquireLock({
				branch: "feat/corrupted-recovery",
			});

			// Assert
			expect(acquired.branch).toBe("feat/corrupted-recovery");
			expect(warnings.length).toBe(1);
			expect(warnings[0]).toContain("Reclaiming corrupted runner lockfile");
		});

		it("reclaims malformed lock file missing required fields", async () => {
			// Arrange
			await fs.promises.writeFile(
				lockFilePath,
				JSON.stringify({ someField: "value" }),
			);
			const manager = new DefaultRunnerLockManager({
				lockFilePath,
				logger: mockLogger,
			});

			// Act
			const acquired = await manager.acquireLock({
				branch: "feat/malformed-recovery",
			});

			// Assert
			expect(acquired.branch).toBe("feat/malformed-recovery");
			expect(warnings.length).toBe(1);
			expect(warnings[0]).toContain("Reclaiming malformed runner lockfile");
		});

		it("releases lock cleanly when file exists", async () => {
			// Arrange
			const manager = new DefaultRunnerLockManager({
				lockFilePath,
				logger: mockLogger,
			});
			await manager.acquireLock({ branch: "feat/to-release" });

			// Act
			await manager.releaseLock();
			const status = await manager.getLockStatus();

			// Assert
			expect(status.isLocked).toBe(false);
		});

		it("releaseLock succeeds silently when no lock file exists", async () => {
			// Arrange
			const manager = new DefaultRunnerLockManager({
				lockFilePath,
				logger: mockLogger,
			});

			// Act
			await manager.releaseLock();
			const status = await manager.getLockStatus();

			// Assert
			expect(status.isLocked).toBe(false);
		});

		it("throws RunnerLockError when releaseLock fails with non-ENOENT", async () => {
			// Arrange
			const manager = new DefaultRunnerLockManager({
				lockFilePath,
				logger: mockLogger,
			});
			const spy = vi.spyOn(fs.promises, "unlink").mockRejectedValueOnce(
				Object.assign(new Error("EPERM: operation not permitted"), {
					code: "EPERM",
				}),
			);

			// Act
			const releasePromise = manager.releaseLock();

			// Assert
			await expect(releasePromise).rejects.toThrow(RunnerLockError);
			spy.mockRestore();
		});

		it("returns isLocked false when free", async () => {
			// Arrange
			const manager = new DefaultRunnerLockManager({
				lockFilePath,
				logger: mockLogger,
			});

			// Act
			const status = await manager.getLockStatus();

			// Assert
			expect(status).toEqual({ isLocked: false });
		});

		it("returns isLocked true and lock metadata when held by active process", async () => {
			// Arrange
			const manager = new DefaultRunnerLockManager({
				isProcessAlive: (pid) => pid === 1000,
				lockFilePath,
				logger: mockLogger,
			});
			await fs.promises.writeFile(
				lockFilePath,
				JSON.stringify({
					branch: "feat/active",
					pid: 1000,
					startedAt: "2026-08-15T00:00:00Z",
				}),
			);

			// Act
			const status = await manager.getLockStatus();

			// Assert
			expect(status.isLocked).toBe(true);
			expect(status.isStale).toBe(false);
			expect(status.lock?.pid).toBe(1000);
		});

		it("returns isLocked false and isStale true when held by dead process", async () => {
			// Arrange
			const manager = new DefaultRunnerLockManager({
				isProcessAlive: () => false,
				lockFilePath,
				logger: mockLogger,
			});
			await fs.promises.writeFile(
				lockFilePath,
				JSON.stringify({
					branch: "feat/stale",
					pid: 2000,
					startedAt: "2026-08-15T00:00:00Z",
				}),
			);

			// Act
			const status = await manager.getLockStatus();

			// Assert
			expect(status.isLocked).toBe(false);
			expect(status.isStale).toBe(true);
		});

		it("returns isLocked false and isStale true when lockfile contains invalid json", async () => {
			// Arrange
			const manager = new DefaultRunnerLockManager({
				lockFilePath,
				logger: mockLogger,
			});
			await fs.promises.writeFile(lockFilePath, "{ invalid json");

			// Act
			const status = await manager.getLockStatus();

			// Assert
			expect(status).toEqual({ isLocked: false, isStale: true });
		});

		it("returns isLocked false and isStale true when lockfile is missing required fields", async () => {
			// Arrange
			const manager = new DefaultRunnerLockManager({
				lockFilePath,
				logger: mockLogger,
			});
			await fs.promises.writeFile(
				lockFilePath,
				JSON.stringify({ invalid: true }),
			);

			// Act
			const status = await manager.getLockStatus();

			// Assert
			expect(status).toEqual({ isLocked: false, isStale: true });
		});

		it("throws RunnerLockError when getLockStatus encounters non-ENOENT read error", async () => {
			// Arrange
			const manager = new DefaultRunnerLockManager({
				lockFilePath,
				logger: mockLogger,
			});
			const spy = vi.spyOn(fs.promises, "readFile").mockRejectedValueOnce(
				Object.assign(new Error("EACCES: permission denied"), {
					code: "EACCES",
				}),
			);

			// Act
			const statusPromise = manager.getLockStatus();

			// Assert
			await expect(statusPromise).rejects.toThrow(RunnerLockError);
			spy.mockRestore();
		});

		it("throws RunnerLockError when file operations encounter unexpected errors", async () => {
			// Arrange
			const invalidPath = "/invalid\0dir/runner.lock";
			const manager = new DefaultRunnerLockManager({
				lockFilePath: invalidPath,
				logger: mockLogger,
			});

			// Act
			const acquirePromise = manager.acquireLock();

			// Assert
			await expect(acquirePromise).rejects.toThrow(RunnerLockError);
		});

		it("throws RunnerLockError when writeFile fails with non-EEXIST error", async () => {
			// Arrange
			const manager = new DefaultRunnerLockManager({
				lockFilePath,
				logger: mockLogger,
			});
			const spy = vi.spyOn(fs.promises, "writeFile").mockRejectedValueOnce(
				Object.assign(new Error("EACCES: permission denied"), {
					code: "EACCES",
				}),
			);

			// Act
			const acquirePromise = manager.acquireLock();

			// Assert
			await expect(acquirePromise).rejects.toThrow(RunnerLockError);
			spy.mockRestore();
		});

		it("registers and cleans up signal handlers", () => {
			// Arrange
			const manager = new DefaultRunnerLockManager({
				lockFilePath,
				logger: mockLogger,
			});
			const onCleanup = vi.fn();

			// Act
			const unregister = manager.registerSignalHandlers(onCleanup);
			unregister();

			// Assert
			expect(onCleanup).not.toHaveBeenCalled();
		});

		it("executes cleanup and releases lock when signal handler is triggered", async () => {
			// Arrange
			const manager = new DefaultRunnerLockManager({
				lockFilePath,
				logger: mockLogger,
			});
			await manager.acquireLock({ branch: "feat/signal" });
			let cleanupCalls = 0;
			const onCleanup = async () => {
				cleanupCalls += 1;
			};
			const killSpy = vi.spyOn(process, "kill").mockImplementation(() => true);

			// Act
			const unregister = manager.registerSignalHandlers(onCleanup);
			process.emit("SIGINT");
			process.emit("SIGTERM"); // Hits isCleaningUp guard
			await new Promise((resolve) => setTimeout(resolve, 20));
			unregister();
			killSpy.mockRestore();

			// Assert
			expect(cleanupCalls).toBe(1);
		});

		it("executes signal handler without onCleanup callback cleanly", async () => {
			// Arrange
			const manager = new DefaultRunnerLockManager({
				lockFilePath,
				logger: mockLogger,
			});
			await manager.acquireLock({ branch: "feat/no-callback" });
			const killSpy = vi.spyOn(process, "kill").mockImplementation(() => true);

			// Act
			const unregister = manager.registerSignalHandlers();
			process.emit("SIGHUP");
			await new Promise((resolve) => setTimeout(resolve, 20));
			unregister();
			killSpy.mockRestore();
			const status = await manager.getLockStatus();

			// Assert
			expect(status.isLocked).toBe(false);
		});

		it("ignores ENOENT error when unlinking stale lock", async () => {
			// Arrange
			const staleLockData: RunnerLockData = {
				branch: "fix/stale",
				pid: 8888,
				startedAt: "2026-08-01T00:00:00.000Z",
			};
			await fs.promises.writeFile(
				lockFilePath,
				JSON.stringify(staleLockData, null, 2),
			);
			const manager = new DefaultRunnerLockManager({
				isProcessAlive: () => false,
				lockFilePath,
				logger: mockLogger,
			});
			const spy = vi.spyOn(fs.promises, "unlink").mockRejectedValueOnce(
				Object.assign(new Error("ENOENT: no such file or directory"), {
					code: "ENOENT",
				}),
			);

			// Act
			const acquired = await manager.acquireLock({ branch: "feat/acquired" });
			spy.mockRestore();

			// Assert
			expect(acquired.branch).toBe("feat/acquired");
		});
	});

	describe("MockRunnerLockManager", () => {
		it("acquires, releases, and inspects lock in-memory", async () => {
			// Arrange
			const manager = new MockRunnerLockManager();

			// Act
			const statusBefore = await manager.getLockStatus();
			const lock = await manager.acquireLock({
				branch: "feat/mock",
				issueNumber: 50,
			});
			const statusAfter = await manager.getLockStatus();
			await manager.releaseLock();
			const statusReleased = await manager.getLockStatus();

			// Assert
			expect(statusBefore.isLocked).toBe(false);
			expect(lock.branch).toBe("feat/mock");
			expect(lock.issueNumber).toBe(50);
			expect(statusAfter.isLocked).toBe(true);
			expect(statusAfter.lock?.branch).toBe("feat/mock");
			expect(statusReleased.isLocked).toBe(false);
		});

		it("throws RunnerAlreadyLockedError when active lock exists in mock", async () => {
			// Arrange
			const manager = new MockRunnerLockManager({
				initialLock: {
					branch: "feat/existing",
					pid: 1234,
					startedAt: "2026-08-01T00:00:00Z",
				},
				isProcessAlive: () => true,
			});

			// Act
			const acquirePromise = manager.acquireLock({ branch: "feat/conflict" });

			// Assert
			await expect(acquirePromise).rejects.toThrow(RunnerAlreadyLockedError);
		});

		it("reclaims stale lock in mock when process is dead", async () => {
			// Arrange
			const warnings: string[] = [];
			const manager = new MockRunnerLockManager({
				initialLock: {
					branch: "feat/dead",
					pid: 9999,
					startedAt: "2026-08-01T00:00:00Z",
				},
				isProcessAlive: () => false,
				logger: {
					warn: (msg) => {
						warnings.push(msg);
					},
				},
			});

			// Act
			const lock = await manager.acquireLock({ branch: "feat/revived" });

			// Assert
			expect(lock.branch).toBe("feat/revived");
			expect(warnings.length).toBe(1);
			expect(warnings[0]).toContain(
				"Reclaiming stale runner lock held by dead PID 9999",
			);
		});

		it("reclaims stale lock in mock without logger", async () => {
			// Arrange
			const manager = new MockRunnerLockManager({
				initialLock: {
					branch: "feat/dead",
					pid: 9999,
					startedAt: "2026-08-01T00:00:00Z",
				},
				isProcessAlive: () => false,
			});

			// Act
			const lock = await manager.acquireLock({ branch: "feat/no-log" });

			// Assert
			expect(lock.branch).toBe("feat/no-log");
		});

		it("sets and gets current lock via setCurrentLock", async () => {
			// Arrange
			const manager = new MockRunnerLockManager();
			manager.setCurrentLock({
				branch: "feat/custom",
				pid: 5555,
				startedAt: "2026-08-01T00:00:00Z",
			});
			manager.setIsProcessAlive((pid) => pid === 5555);

			// Act
			const statusAlive = await manager.getLockStatus();
			manager.setCurrentLock(null);
			const statusNull = await manager.getLockStatus();

			// Assert
			expect(statusAlive.isLocked).toBe(true);
			expect(statusNull.isLocked).toBe(false);
		});

		it("registers and unregisters signal handlers in mock", () => {
			// Arrange
			const manager = new MockRunnerLockManager();

			// Act
			const unregister = manager.registerSignalHandlers();
			const isRegistered = manager.isSignalHandlerRegistered();
			unregister();
			const isUnregistered = manager.isSignalHandlerRegistered();

			// Assert
			expect(isRegistered).toBe(true);
			expect(isUnregistered).toBe(false);
		});
	});
});
