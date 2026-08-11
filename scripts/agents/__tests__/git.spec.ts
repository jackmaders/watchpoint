import { describe, expect, it, vi } from "vitest";
import type { ExecFn } from "../exec";
import {
	buildBranchName,
	countCommits,
	createBranchFromMain,
	pushBranch,
} from "../git";

function fakeExec(
	implementation: (
		command: string,
		args: string[],
	) => { exitCode: number; stdout?: string; stderr?: string },
): ExecFn {
	return vi.fn(async (command, args) => {
		const result = implementation(command, args);
		return {
			exitCode: result.exitCode,
			stderr: result.stderr ?? "",
			stdout: result.stdout ?? "",
		};
	});
}

describe("buildBranchName", () => {
	it("slugifies the title into a lowercase, hyphenated branch name", () => {
		// Arrange
		// Act
		const name = buildBranchName(57, "09 — Implementation agent");

		// Assert
		expect(name).toBe("agent/issue-57-09-implementation-agent");
	});

	it("strips leading and trailing punctuation from the slug", () => {
		// Arrange
		// Act
		const name = buildBranchName(12, "!!! Fix the bug !!!");

		// Assert
		expect(name).toBe("agent/issue-12-fix-the-bug");
	});

	it("bounds the slug length so a very long title can't produce an unusable ref", () => {
		// Arrange
		const title = "a".repeat(200);

		// Act
		const name = buildBranchName(1, title);

		// Assert
		expect(name.length).toBeLessThan(70);
	});

	it("falls back to a fixed slug when the title has no sluggable characters", () => {
		// Arrange
		// Act
		const name = buildBranchName(3, "!!!");

		// Assert
		expect(name).toBe("agent/issue-3-ticket");
	});
});

describe("createBranchFromMain", () => {
	it("fetches origin/main, switches to a new branch off it, and returns HEAD's sha", async () => {
		// Arrange
		const exec = fakeExec((_command, args) => {
			if (args.join(" ") === "rev-parse HEAD") {
				return { exitCode: 0, stdout: "abc123\n" };
			}
			return { exitCode: 0 };
		});

		// Act
		const sha = await createBranchFromMain(exec, "agent/issue-57-x");

		// Assert
		expect(exec).toHaveBeenCalledWith("git", ["fetch", "origin", "main"]);
		expect(exec).toHaveBeenCalledWith("git", [
			"switch",
			"-c",
			"agent/issue-57-x",
			"origin/main",
		]);
		expect(sha).toBe("abc123");
	});

	it("throws with the command and stderr when fetching origin/main fails", async () => {
		// Arrange
		const exec = fakeExec(() => ({
			exitCode: 1,
			stderr: "fatal: unable to access origin",
		}));

		// Act
		const act = createBranchFromMain(exec, "agent/issue-57-x");

		// Assert
		await expect(act).rejects.toThrow(/unable to access origin/);
	});

	it("throws when creating the branch fails, without swallowing the git error", async () => {
		// Arrange
		const exec = fakeExec((_command, args) => {
			if (args[0] === "switch") {
				return {
					exitCode: 128,
					stderr: "fatal: a branch named X already exists",
				};
			}
			return { exitCode: 0 };
		});

		// Act
		const act = createBranchFromMain(exec, "agent/issue-57-x");

		// Assert
		await expect(act).rejects.toThrow(/already exists/);
	});

	it("falls back to stdout in the thrown message when a failing command wrote nothing to stderr", async () => {
		// Arrange
		const exec = fakeExec((_command, args) => {
			if (args[0] === "switch") {
				return { exitCode: 128, stdout: "usage: git switch ..." };
			}
			return { exitCode: 0 };
		});

		// Act
		const act = createBranchFromMain(exec, "agent/issue-57-x");

		// Assert
		await expect(act).rejects.toThrow(/usage: git switch/);
	});
});

describe("countCommits", () => {
	it("parses the commit count between the starting sha and HEAD", async () => {
		// Arrange
		const exec = fakeExec(() => ({ exitCode: 0, stdout: "3\n" }));

		// Act
		const count = await countCommits(exec, "abc123");

		// Assert
		expect(exec).toHaveBeenCalledWith("git", [
			"rev-list",
			"--count",
			"abc123..HEAD",
		]);
		expect(count).toBe(3);
	});

	it("returns 0 when no commits were made", async () => {
		// Arrange
		const exec = fakeExec(() => ({ exitCode: 0, stdout: "0\n" }));

		// Act
		const count = await countCommits(exec, "abc123");

		// Assert
		expect(count).toBe(0);
	});

	it("throws when git rev-list itself fails", async () => {
		// Arrange
		const exec = fakeExec(() => ({
			exitCode: 128,
			stderr: "fatal: bad revision",
		}));

		// Act
		const act = countCommits(exec, "abc123");

		// Assert
		await expect(act).rejects.toThrow(/bad revision/);
	});
});

describe("pushBranch", () => {
	it("pushes with force-with-lease pinned to the branch's starting sha", async () => {
		// Arrange
		const exec = fakeExec(() => ({ exitCode: 0 }));

		// Act
		await pushBranch(exec, "agent/issue-57-x", "abc123");

		// Assert
		expect(exec).toHaveBeenCalledWith("git", [
			"push",
			"--force-with-lease=refs/heads/agent/issue-57-x:abc123",
			"origin",
			"agent/issue-57-x",
		]);
	});

	it("raises a specific, actionable error when the race-detection pattern matches stderr", async () => {
		// Arrange
		const exec = fakeExec(() => ({
			exitCode: 1,
			stderr: "! [rejected] agent/issue-57-x -> agent/issue-57-x (stale info)",
		}));

		// Act
		const act = pushBranch(exec, "agent/issue-57-x", "abc123");

		// Assert
		await expect(act).rejects.toThrow(/advanced during the run/);
	});

	it("raises the raw git error for a push failure that isn't a race", async () => {
		// Arrange
		const exec = fakeExec(() => ({
			exitCode: 1,
			stderr: "fatal: unable to access origin",
		}));

		// Act
		const act = pushBranch(exec, "agent/issue-57-x", "abc123");

		// Assert
		await expect(act).rejects.toThrow(/unable to access origin/);
		await expect(act).rejects.not.toThrow(/advanced during the run/);
	});

	it("falls back to stdout in the thrown message when a non-race push failure wrote nothing to stderr", async () => {
		// Arrange
		const exec = fakeExec(() => ({
			exitCode: 1,
			stdout: "remote: permission denied",
		}));

		// Act
		const act = pushBranch(exec, "agent/issue-57-x", "abc123");

		// Assert
		await expect(act).rejects.toThrow(/permission denied/);
	});
});
