import { describe, expect, it, vi } from "vitest";
import {
	createGithubPr,
	execCommand,
	fetchGithubIssue,
	runSandcastleAgent,
} from "../exec-helpers";

describe("exec-helpers", () => {
	describe("execCommand", () => {
		it("returns successful command execution output with stdout and stderr", async () => {
			// Arrange
			const executor = vi.fn().mockResolvedValue({
				stderr: "some stderr warning",
				stdout: "hello world",
			});

			// Act
			const result = await execCommand("echo hello", undefined, executor);

			// Assert
			expect(result.exitCode).toBe(0);
			expect(result.stdout).toBe("hello world");
			expect(result.stderr).toBe("some stderr warning");
		});

		it("handles undefined stdout and stderr gracefully", async () => {
			// Arrange
			const executor = vi.fn().mockResolvedValue({
				stderr: undefined,
				stdout: undefined,
			});

			// Act
			const result = await execCommand("echo empty", undefined, executor);

			// Assert
			expect(result.exitCode).toBe(0);
			expect(result.stdout).toBe("");
			expect(result.stderr).toBe("");
		});

		it("handles buffer outputs and non-zero exit code error", async () => {
			// Arrange
			const executor = vi.fn().mockRejectedValue({
				code: 127,
				stderr: Buffer.from("err"),
				stdout: Buffer.from("out"),
			});

			// Act
			const result = await execCommand("failing-cmd", undefined, executor);

			// Assert
			expect(result.exitCode).toBe(127);
			expect(result.stdout).toBe("out");
			expect(result.stderr).toBe("err");
		});

		it("handles error with stderr only and error without code/buffers", async () => {
			// Arrange
			const executor1 = vi.fn().mockRejectedValue(new Error("Spawn error"));
			const executor2 = vi.fn().mockRejectedValue({
				code: 2,
				stderr: undefined,
				stdout: "out text",
			});
			const executor3 = vi.fn().mockRejectedValue("raw string failure");
			const executor4 = vi.fn().mockRejectedValue({
				code: 3,
				stderr: "stderr only failure",
				stdout: undefined,
			});

			// Act
			const result1 = await execCommand("failing-cmd-1", undefined, executor1);
			const result2 = await execCommand("failing-cmd-2", undefined, executor2);
			const result3 = await execCommand("failing-cmd-3", undefined, executor3);
			const result4 = await execCommand("failing-cmd-4", undefined, executor4);

			// Assert
			expect(result1.exitCode).toBe(1);
			expect(result1.stderr).toContain("Spawn error");
			expect(result2.exitCode).toBe(2);
			expect(result2.stdout).toBe("out text");
			expect(result2.stderr).toContain("[object Object]");
			expect(result3.exitCode).toBe(1);
			expect(result3.stdout).toBe("");
			expect(result3.stderr).toBe("raw string failure");
			expect(result4.exitCode).toBe(3);
			expect(result4.stdout).toBe("");
			expect(result4.stderr).toBe("stderr only failure");
		});
	});

	describe("fetchGithubIssue", () => {
		it("parses and returns issue details when gh CLI succeeds", async () => {
			// Arrange
			const runner = vi.fn().mockResolvedValue({
				exitCode: 0,
				stderr: "",
				stdout: JSON.stringify({
					body: "Issue body",
					number: 152,
					title: "Issue title",
				}),
			});

			// Act
			const result = await fetchGithubIssue(152, runner);

			// Assert
			expect(result).toEqual({
				body: "Issue body",
				number: 152,
				title: "Issue title",
			});
		});

		it("handles empty issue body", async () => {
			// Arrange
			const runner = vi.fn().mockResolvedValue({
				exitCode: 0,
				stderr: "",
				stdout: JSON.stringify({
					body: null,
					number: 152,
					title: "Issue title",
				}),
			});

			// Act
			const result = await fetchGithubIssue(152, runner);

			// Assert
			expect(result.body).toBe("");
		});

		it("throws error when gh command fails", async () => {
			// Arrange
			const runner = vi.fn().mockResolvedValue({
				exitCode: 1,
				stderr: "Issue not found",
				stdout: "",
			});

			// Act
			const action = fetchGithubIssue(999, runner);

			// Assert
			await expect(action).rejects.toThrow(
				"Failed to fetch issue #999: Issue not found",
			);
		});
	});

	describe("createGithubPr", () => {
		it("pushes branch and creates draft PR", async () => {
			// Arrange
			const runner = vi
				.fn()
				.mockResolvedValueOnce({
					exitCode: 0,
					stderr: "",
					stdout: "Pushed",
				})
				.mockResolvedValueOnce({
					exitCode: 0,
					stderr: "",
					stdout: "https://github.com/jackmaders/watchpoint/pull/1\n",
				});

			// Act
			const result = await createGithubPr(
				{
					body: "PR body",
					branch: "feat/my-branch",
					title: 'feat: "hello" $world',
				},
				runner,
			);

			// Assert
			expect(result.prUrl).toBe(
				"https://github.com/jackmaders/watchpoint/pull/1",
			);
		});

		it("throws error when git push fails", async () => {
			// Arrange
			const runner = vi.fn().mockResolvedValueOnce({
				exitCode: 1,
				stderr: "Permission denied",
				stdout: "",
			});

			// Act
			const action = createGithubPr(
				{
					body: "body",
					branch: "feat/branch",
					title: "feat: test",
				},
				runner,
			);

			// Assert
			await expect(action).rejects.toThrow(
				"Failed to push branch feat/branch: Permission denied",
			);
		});

		it("throws error when gh pr create fails", async () => {
			// Arrange
			const runner = vi
				.fn()
				.mockResolvedValueOnce({
					exitCode: 0,
					stderr: "",
					stdout: "Pushed",
				})
				.mockResolvedValueOnce({
					exitCode: 1,
					stderr: "GraphQL error",
					stdout: "",
				});

			// Act
			const action = createGithubPr(
				{
					body: "body",
					branch: "feat/branch",
					title: "feat: test",
				},
				runner,
			);

			// Assert
			await expect(action).rejects.toThrow(
				"Failed to create PR: GraphQL error",
			);
		});
	});

	describe("runSandcastleAgent", () => {
		it("calls sandcastle run and extracts commit shas", async () => {
			// Arrange
			const runner = vi.fn().mockResolvedValue({
				commits: [{ sha: "111aaa" }, { sha: "222bbb" }],
				stdout: "Agent log output",
			});
			const agent = { name: "test-agent" } as unknown as Parameters<
				typeof runSandcastleAgent
			>[0]["agent"];
			const sandbox = { name: "test-sandbox" } as unknown as Parameters<
				typeof runSandcastleAgent
			>[0]["sandbox"];

			// Act
			const result = await runSandcastleAgent(
				{
					agent,
					branch: "feat/work",
					prompt: "Do work",
					sandbox,
				},
				runner,
			);

			// Assert
			expect(result.commits).toEqual([{ sha: "111aaa" }, { sha: "222bbb" }]);
			expect(result.stdout).toBe("Agent log output");
		});
	});
});
