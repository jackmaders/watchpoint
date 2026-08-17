import { describe, expect, it } from "vitest";
import type { ProcessRunner } from "../../github/types";
import { WorktreeCleanupError, WorktreeCreationError } from "../errors";
import {
	DefaultWorktreeManager,
	MockWorktreeManager,
	slugifyBranch,
} from "../worktree-manager";

describe("WorktreeManager", () => {
	describe("slugifyBranch", () => {
		it("replaces special characters and slashes with hyphens", () => {
			// Arrange
			const input = "feat/issue-123_new-feature!";

			// Act
			const slug = slugifyBranch(input);

			// Assert
			expect(slug).toBe("feat-issue-123_new-feature");
		});

		it("trims leading and trailing hyphens", () => {
			// Arrange
			const input = "---feat/branch---";

			// Act
			const slug = slugifyBranch(input);

			// Assert
			expect(slug).toBe("feat-branch");
		});
	});

	describe("DefaultWorktreeManager", () => {
		it("instantiates with default options", () => {
			// Arrange
			const options = {};

			// Act
			const manager = new DefaultWorktreeManager(options);

			// Assert
			expect(manager).toBeDefined();
		});

		it("creates worktree successfully with default baseBranch and bun install", async () => {
			// Arrange
			const executedCommands: string[][] = [];
			const mockRunner: ProcessRunner = async (command) => {
				executedCommands.push([...command]);
				return { exitCode: 0, stderr: "", stdout: "" };
			};
			const manager = new DefaultWorktreeManager({
				cwd: "/repo",
				runner: mockRunner,
			});

			// Act
			const result = await manager.createWorktree({
				branch: "feat/my-feature",
			});

			// Assert
			expect(result.branch).toBe("feat/my-feature");
			expect(result.baseBranch).toBe("origin/main");
			expect(result.path).toBe("/repo/.sandcastle/worktrees/feat-my-feature");
			expect(executedCommands).toEqual([
				["git", "worktree", "list", "--porcelain"],
				["git", "fetch", "origin", "main"],
				[
					"git",
					"worktree",
					"add",
					"-B",
					"feat/my-feature",
					"/repo/.sandcastle/worktrees/feat-my-feature",
					"origin/main",
				],
				["bun", "install", "--frozen-lockfile"],
			]);
		});

		it("uses numerical branch and path suffixes when the requested branch is checked out", async () => {
			// Arrange
			const executedCommands: string[][] = [];
			const mockRunner: ProcessRunner = async (command) => {
				executedCommands.push([...command]);
				if (
					command[0] === "git" &&
					command[1] === "worktree" &&
					command[2] === "list"
				) {
					return {
						exitCode: 0,
						stderr: "",
						stdout:
							"worktree /repo\nHEAD abc123\nbranch refs/heads/feat/my-feature\n",
					};
				}
				return { exitCode: 0, stderr: "", stdout: "" };
			};
			const manager = new DefaultWorktreeManager({
				cwd: "/repo",
				runner: mockRunner,
			});

			// Act
			const result = await manager.createWorktree({
				branch: "feat/my-feature",
				runInstall: false,
			});

			// Assert
			expect(result.branch).toBe("feat/my-feature-2");
			expect(result.path).toBe("/repo/.sandcastle/worktrees/feat-my-feature-2");
			expect(executedCommands).toContainEqual([
				"git",
				"worktree",
				"add",
				"-b",
				"feat/my-feature-2",
				"/repo/.sandcastle/worktrees/feat-my-feature-2",
				"origin/main",
			]);
		});

		it("skips bun install when runInstall is false", async () => {
			// Arrange
			const executedCommands: string[][] = [];
			const mockRunner: ProcessRunner = async (command) => {
				executedCommands.push([...command]);
				return { exitCode: 0, stderr: "", stdout: "" };
			};
			const manager = new DefaultWorktreeManager({
				cwd: "/repo",
				runner: mockRunner,
			});

			// Act
			const result = await manager.createWorktree({
				baseBranch: "release/v1.0",
				branch: "feat/no-install",
				runInstall: false,
			});

			// Assert
			expect(result.baseBranch).toBe("release/v1.0");
			expect(
				executedCommands.some(
					(cmd) => cmd[0] === "bun" && cmd[1] === "install",
				),
			).toBe(false);
		});

		it("throws WorktreeCreationError when git fetch fails with stderr or stdout", async () => {
			// Arrange
			const mockRunner: ProcessRunner = async (command) => {
				if (command[0] === "git" && command[1] === "fetch") {
					return { exitCode: 1, stderr: "", stdout: "fetch failed on stdout" };
				}
				return { exitCode: 0, stderr: "", stdout: "" };
			};
			const manager = new DefaultWorktreeManager({
				cwd: "/repo",
				runner: mockRunner,
			});

			// Act
			const createPromise = manager.createWorktree({
				branch: "feat/fetch-fail",
			});

			// Assert
			await expect(createPromise).rejects.toThrow(WorktreeCreationError);
		});

		it("throws WorktreeCreationError when git worktree add fails with stderr or stdout", async () => {
			// Arrange
			const mockRunner: ProcessRunner = async (command) => {
				if (
					command[0] === "git" &&
					command[1] === "worktree" &&
					command[2] === "add"
				) {
					return {
						exitCode: 1,
						stderr: "",
						stdout: "fatal: invalid reference on stdout",
					};
				}
				return { exitCode: 0, stderr: "", stdout: "" };
			};
			const manager = new DefaultWorktreeManager({
				cwd: "/repo",
				runner: mockRunner,
			});

			// Act
			const createPromise = manager.createWorktree({
				branch: "feat/add-fail",
			});

			// Assert
			await expect(createPromise).rejects.toThrow(WorktreeCreationError);
		});

		it("cleans up and throws WorktreeCreationError when bun install fails with stderr or stdout", async () => {
			// Arrange
			const executedCommands: string[][] = [];
			const mockRunner: ProcessRunner = async (command) => {
				executedCommands.push([...command]);
				if (command[0] === "bun" && command[1] === "install") {
					return {
						exitCode: 1,
						stderr: "",
						stdout: "lockfile out of sync on stdout",
					};
				}
				return { exitCode: 0, stderr: "", stdout: "" };
			};
			const manager = new DefaultWorktreeManager({
				cwd: "/repo",
				runner: mockRunner,
			});

			// Act
			const createPromise = manager.createWorktree({
				branch: "feat/install-fail",
			});

			// Assert
			await expect(createPromise).rejects.toThrow(WorktreeCreationError);
			expect(
				executedCommands.some(
					(cmd) =>
						cmd[0] === "git" && cmd[1] === "worktree" && cmd[2] === "remove",
				),
			).toBe(true);
		});

		it("removes worktree by branch or absolute path", async () => {
			// Arrange
			const executedCommands: string[][] = [];
			const mockRunner: ProcessRunner = async (command) => {
				executedCommands.push([...command]);
				return { exitCode: 0, stderr: "", stdout: "" };
			};
			const manager = new DefaultWorktreeManager({
				cwd: "/repo",
				runner: mockRunner,
			});
			await manager.createWorktree({
				branch: "feat/to-remove",
				runInstall: false,
			});

			// Act
			await manager.removeWorktree("feat/to-remove");

			// Assert
			expect(
				executedCommands.some(
					(cmd) =>
						cmd[0] === "git" &&
						cmd[1] === "worktree" &&
						cmd[2] === "remove" &&
						cmd[4] === "/repo/.sandcastle/worktrees/feat-to-remove",
				),
			).toBe(true);
		});

		it("removes worktree directly when absolute path is passed", async () => {
			// Arrange
			const executedCommands: string[][] = [];
			const mockRunner: ProcessRunner = async (command) => {
				executedCommands.push([...command]);
				return { exitCode: 0, stderr: "", stdout: "" };
			};
			const manager = new DefaultWorktreeManager({
				cwd: "/repo",
				runner: mockRunner,
			});

			// Act
			await manager.removeWorktree("/custom/abs/path");

			// Assert
			expect(
				executedCommands.some(
					(cmd) =>
						cmd[0] === "git" &&
						cmd[1] === "worktree" &&
						cmd[2] === "remove" &&
						cmd[4] === "/custom/abs/path",
				),
			).toBe(true);
		});

		it("ignores worktree remove errors when worktree is already missing", async () => {
			// Arrange
			const mockRunner: ProcessRunner = async (command) => {
				if (
					command[0] === "git" &&
					command[1] === "worktree" &&
					command[2] === "remove"
				) {
					return {
						exitCode: 1,
						stderr: "fatal: '/path' is not a working tree",
						stdout: "",
					};
				}
				return { exitCode: 0, stderr: "", stdout: "" };
			};
			const manager = new DefaultWorktreeManager({
				cwd: "/repo",
				runner: mockRunner,
			});

			// Act
			const removePromise = manager.removeWorktree(
				"/repo/.sandcastle/worktrees/missing",
			);

			// Assert - resolves without throwing
			await expect(removePromise).resolves.toBeUndefined();
		});

		it("ignores worktree remove errors when stderr contains No such file or directory", async () => {
			// Arrange
			const mockRunner: ProcessRunner = async (command) => {
				if (
					command[0] === "git" &&
					command[1] === "worktree" &&
					command[2] === "remove"
				) {
					return {
						exitCode: 1,
						stderr: "fatal: No such file or directory",
						stdout: "",
					};
				}
				return { exitCode: 0, stderr: "", stdout: "" };
			};
			const manager = new DefaultWorktreeManager({
				cwd: "/repo",
				runner: mockRunner,
			});

			// Act
			const removePromise = manager.removeWorktree(
				"/repo/.sandcastle/worktrees/no-such-file",
			);

			// Assert - resolves without throwing
			await expect(removePromise).resolves.toBeUndefined();
		});

		it("throws WorktreeCleanupError on unexpected worktree remove failure with stderr or stdout", async () => {
			// Arrange
			const mockRunner: ProcessRunner = async (command) => {
				if (
					command[0] === "git" &&
					command[1] === "worktree" &&
					command[2] === "remove"
				) {
					return { exitCode: 1, stderr: "", stdout: "fatal: output on stdout" };
				}
				return { exitCode: 0, stderr: "", stdout: "" };
			};
			const manager = new DefaultWorktreeManager({
				cwd: "/repo",
				runner: mockRunner,
			});

			// Act
			const removePromise = manager.removeWorktree(
				"/repo/.sandcastle/worktrees/locked",
			);

			// Assert
			await expect(removePromise).rejects.toThrow(WorktreeCleanupError);
		});

		it("finds worktree by branch across multiple active worktrees", async () => {
			// Arrange
			const executedCommands: string[][] = [];
			const mockRunner: ProcessRunner = async (command) => {
				executedCommands.push([...command]);
				return { exitCode: 0, stderr: "", stdout: "" };
			};
			const manager = new DefaultWorktreeManager({
				cwd: "/repo",
				runner: mockRunner,
			});
			await manager.createWorktree({ branch: "feat/first", runInstall: false });
			await manager.createWorktree({
				branch: "feat/second",
				runInstall: false,
			});

			// Act
			await manager.removeWorktree("feat/second");

			// Assert
			expect(
				executedCommands.some(
					(cmd) =>
						cmd[0] === "git" &&
						cmd[1] === "worktree" &&
						cmd[2] === "remove" &&
						cmd[4] === "/repo/.sandcastle/worktrees/feat-second",
				),
			).toBe(true);
		});

		it("throws WorktreeCleanupError on git worktree prune failure with stderr or stdout", async () => {
			// Arrange
			const mockRunner: ProcessRunner = async (command) => {
				if (
					command[0] === "git" &&
					command[1] === "worktree" &&
					command[2] === "prune"
				) {
					return { exitCode: 1, stderr: "", stdout: "prune failed on stdout" };
				}
				return { exitCode: 0, stderr: "", stdout: "" };
			};
			const manager = new DefaultWorktreeManager({
				cwd: "/repo",
				runner: mockRunner,
			});

			// Act
			const prunePromise = manager.pruneWorktrees();

			// Assert
			await expect(prunePromise).rejects.toThrow(WorktreeCleanupError);
		});

		it("lists worktrees by parsing git worktree list porcelain output", async () => {
			// Arrange
			const porcelainOutput = `worktree /repo
HEAD a1b2c3d4e5f6
branch refs/heads/main


worktree /repo/.sandcastle/worktrees/feat-test
HEAD b2c3d4e5f6a1
branch refs/heads/feat/test

worktree /repo/.sandcastle/worktrees/feat-active-headless
HEAD c3d4e5f6a1b2

worktree /repo/bare-detached
HEAD 112233445566
detached

invalid block without worktree path
some data
`;
			const mockRunner: ProcessRunner = async (command) => {
				if (
					command[0] === "git" &&
					command[1] === "worktree" &&
					command[2] === "list"
				) {
					return { exitCode: 0, stderr: "", stdout: porcelainOutput };
				}
				return { exitCode: 0, stderr: "", stdout: "" };
			};
			const manager = new DefaultWorktreeManager({
				cwd: "/repo",
				runner: mockRunner,
			});
			await manager.createWorktree({
				branch: "feat/active-headless",
				runInstall: false,
			});

			// Act
			const list = await manager.listWorktrees();

			// Assert
			expect(list).toHaveLength(4);
			expect(list[0].path).toBe("/repo");
			expect(list[0].branch).toBe("main");
			expect(list[1].path).toBe("/repo/.sandcastle/worktrees/feat-test");
			expect(list[1].branch).toBe("feat/test");
			expect(list[2].path).toBe(
				"/repo/.sandcastle/worktrees/feat-active-headless",
			);
			expect(list[2].branch).toBe("feat-active-headless");
			expect(list[3].path).toBe("/repo/bare-detached");
			expect(list[3].branch).toBe("bare-detached");
		});

		it("returns empty array when porcelain list output is empty", async () => {
			// Arrange
			const mockRunner: ProcessRunner = async (command) => {
				if (
					command[0] === "git" &&
					command[1] === "worktree" &&
					command[2] === "list"
				) {
					return { exitCode: 0, stderr: "", stdout: "   \n\n  " };
				}
				return { exitCode: 0, stderr: "", stdout: "" };
			};
			const manager = new DefaultWorktreeManager({
				cwd: "/repo",
				runner: mockRunner,
			});

			// Act
			const list = await manager.listWorktrees();

			// Assert
			expect(list).toEqual([]);
		});

		it("falls back to active worktrees when porcelain list command fails", async () => {
			// Arrange
			const mockRunner: ProcessRunner = async (command) => {
				if (
					command[0] === "git" &&
					command[1] === "worktree" &&
					command[2] === "list"
				) {
					return { exitCode: 1, stderr: "git error", stdout: "" };
				}
				return { exitCode: 0, stderr: "", stdout: "" };
			};
			const manager = new DefaultWorktreeManager({
				cwd: "/repo",
				runner: mockRunner,
			});
			await manager.createWorktree({
				branch: "feat/active-1",
				runInstall: false,
			});

			// Act
			const list = await manager.listWorktrees();

			// Assert
			expect(list).toHaveLength(1);
			expect(list[0].branch).toBe("feat/active-1");
		});

		it("cleans up all active worktrees and handles individual removal failures gracefully", async () => {
			// Arrange
			const removedPaths: string[] = [];
			const mockRunner: ProcessRunner = async (command) => {
				if (
					command[0] === "git" &&
					command[1] === "worktree" &&
					command[2] === "remove"
				) {
					removedPaths.push(command[4]);
					if (command[4].includes("feat-failing")) {
						return {
							exitCode: 1,
							stderr: "fatal: generic failure",
							stdout: "",
						};
					}
				}
				return { exitCode: 0, stderr: "", stdout: "" };
			};
			const manager = new DefaultWorktreeManager({
				cwd: "/repo",
				runner: mockRunner,
			});
			await manager.createWorktree({
				branch: "feat/failing",
				runInstall: false,
			});
			await manager.createWorktree({
				branch: "feat/clean-2",
				runInstall: false,
			});

			// Act
			await manager.cleanup();

			// Assert
			expect(removedPaths).toContain(
				"/repo/.sandcastle/worktrees/feat-failing",
			);
			expect(removedPaths).toContain(
				"/repo/.sandcastle/worktrees/feat-clean-2",
			);
		});
	});

	describe("MockWorktreeManager", () => {
		it("creates, removes, lists, and cleans up worktrees in-memory", async () => {
			// Arrange
			const manager = new MockWorktreeManager();

			// Act
			const created = await manager.createWorktree({
				branch: "feat/mock-task",
			});
			await manager.createWorktree({
				branch: "feat/mock-task-2",
			});
			const listAfterCreate = await manager.listWorktrees();
			await manager.removeWorktree("feat/mock-task-2");
			await manager.removeWorktree("feat/mock-task");
			const listAfterRemove = await manager.listWorktrees();
			const created3 = await manager.createWorktree({ branch: "feat/mock-3" });
			await manager.removeWorktree(created3.path);
			await manager.removeWorktree("/unmapped/path");
			await manager.createWorktree({ branch: "feat/mock-4" });
			await manager.pruneWorktrees();
			await manager.cleanup();
			const listAfterCleanup = await manager.listWorktrees();

			// Assert
			expect(created.branch).toBe("feat/mock-task");
			expect(listAfterCreate).toHaveLength(2);
			expect(listAfterRemove).toHaveLength(0);
			expect(listAfterCleanup).toHaveLength(0);
		});

		it("throws WorktreeCreationError when simulateFetchFailure is set", async () => {
			// Arrange
			const manager = new MockWorktreeManager();
			manager.simulateFetchFailure("network timeout");

			// Act
			const createPromise = manager.createWorktree({
				branch: "feat/failing",
			});

			// Assert
			await expect(createPromise).rejects.toThrow(WorktreeCreationError);
		});

		it("throws WorktreeCreationError when simulateCreateFailure is set", async () => {
			// Arrange
			const manager = new MockWorktreeManager();
			manager.simulateCreateFailure("worktree add error");

			// Act
			const createPromise = manager.createWorktree({
				branch: "feat/failing",
			});

			// Assert
			await expect(createPromise).rejects.toThrow(WorktreeCreationError);
		});

		it("throws WorktreeCreationError when simulateInstallFailure is set", async () => {
			// Arrange
			const manager = new MockWorktreeManager();
			manager.simulateInstallFailure("install error");

			// Act
			const createPromise = manager.createWorktree({
				branch: "feat/failing",
			});

			// Assert
			await expect(createPromise).rejects.toThrow(WorktreeCreationError);
		});

		it("throws WorktreeCleanupError on removeWorktree when simulateCleanupFailure is set", async () => {
			// Arrange
			const manager = new MockWorktreeManager();
			manager.simulateCleanupFailure("cleanup lock");

			// Act
			const removePromise = manager.removeWorktree("feat/failing");

			// Assert
			await expect(removePromise).rejects.toThrow(WorktreeCleanupError);
		});

		it("throws WorktreeCleanupError on pruneWorktrees when simulateCleanupFailure is set", async () => {
			// Arrange
			const manager = new MockWorktreeManager();
			manager.simulateCleanupFailure("cleanup lock");

			// Act
			const prunePromise = manager.pruneWorktrees();

			// Assert
			await expect(prunePromise).rejects.toThrow(WorktreeCleanupError);
		});

		it("throws WorktreeCleanupError on cleanup when simulateCleanupFailure is set", async () => {
			// Arrange
			const manager = new MockWorktreeManager();
			manager.simulateCleanupFailure("cleanup lock");

			// Act
			const cleanupPromise = manager.cleanup();

			// Assert
			await expect(cleanupPromise).rejects.toThrow(WorktreeCleanupError);
		});
	});
});
