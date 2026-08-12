import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as github from "@actions/github";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExecFn } from "../exec";
import type { IssueContext } from "../github";
import { LABELS } from "../github";
import { run as implementPrRun, runImplementPr } from "../implement-pr";
import {
	type ObjectRunOptions,
	type RunAgentResult,
	runAgent,
} from "../run-agent";
import { type ImplementPr, OUTPUTS } from "../schemas";

vi.mock("@actions/github");
vi.mock("../exec");
vi.mock("../logger");
vi.mock("../run-agent");

const WORKFLOW_FILE = join(
	import.meta.dirname,
	"..",
	"..",
	"..",
	".github",
	"workflows",
	"agent-implement-pr.yml",
);
const REVIEW_WORKFLOW_FILE = join(
	import.meta.dirname,
	"..",
	"..",
	"..",
	".github",
	"workflows",
	"agent-review.yml",
);
const PROMPT_FILE = join(
	import.meta.dirname,
	"..",
	"prompts",
	"implement-pr.md",
);

function buildContext(): IssueContext {
	return {
		issueNumber: 42,
		octokit: github.getOctokit("fake-token"),
		owner: "jackmaders",
		repo: "watchpoint",
	};
}

function fakeResult(output: ImplementPr): RunAgentResult<ImplementPr> {
	return {
		output,
		raw: "",
		sessionId: "session-1",
		usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
	};
}

describe("implement-pr workflow contract", () => {
	it("runs on PR dev:needed labels and shares the review concurrency group", () => {
		// Arrange
		const workflow = readFileSync(WORKFLOW_FILE, "utf-8");

		// Act
		const trigger = workflow.includes(
			"github.event.label.name == 'dev:needed'",
		);

		// Assert
		expect(workflow).toContain("pull_request_target:");
		expect(trigger).toBe(true);
		expect(workflow).toContain(
			`group: agent-mutate-pr-\${{ github.event.pull_request.number }}`,
		);
		expect(workflow).not.toContain("gh pr merge");
	});

	it("gates both mutating PR workflows and hands untrusted authors to a human", () => {
		// Arrange
		const implementWorkflow = readFileSync(WORKFLOW_FILE, "utf-8");
		const reviewWorkflow = readFileSync(REVIEW_WORKFLOW_FILE, "utf-8");
		const workflows = `${implementWorkflow}\n${reviewWorkflow}`;

		// Act
		const allowedAssociations = ["OWNER", "MEMBER", "COLLABORATOR"];

		// Assert
		for (const association of allowedAssociations) {
			expect(workflows).toContain(
				`github.event.pull_request.author_association == '${association}'`,
			);
		}
		expect(workflows).toContain("review:escalated");
		expect(workflows).toContain("dev:needed");
		expect(workflows).toContain("review:needed");
		expect(workflows).toContain("untrusted author");
	});

	it("gives the fix agent the four standing GitHub prohibitions", () => {
		// Arrange
		const prompt = readFileSync(PROMPT_FILE, "utf-8");

		// Act
		const prohibitions = [
			"Do not close the issue.",
			"Do not edit labels.",
			"Do not create PRs.",
			"Do not edit PRs.",
		];

		// Assert
		for (const prohibition of prohibitions) {
			expect(prompt).toContain(prohibition);
		}
	});
});

describe("runImplementPr", () => {
	afterEach(() => {
		Reflect.deleteProperty(process.env, "AGENT_PAT");
		vi.clearAllMocks();
	});

	it("fixes the checked-out PR, replies to resolved threads, and chains review", async () => {
		// Arrange
		process.env.AGENT_PAT = "pat-token";
		const ctx = buildContext();
		vi.mocked(ctx.octokit.rest.pulls.get).mockResolvedValue({
			data: {
				body: "Closes #17",
				head: { ref: "agent/issue-17-fix-review" },
				labels: [{ name: LABELS.devNeeded }],
			},
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.pulls.get>>);
		vi.mocked(ctx.octokit.rest.pulls.listReviewComments).mockResolvedValue({
			data: [
				{
					body: "Please validate this input.",
					id: 9001,
					line: 12,
					path: "scripts/agents/input.ts",
					user: { login: "reviewer" },
				},
			],
		} as unknown as Awaited<
			ReturnType<typeof ctx.octokit.rest.pulls.listReviewComments>
		>);
		vi.mocked(ctx.octokit.rest.issues.get).mockResolvedValue({
			data: { body: "The originating ticket." },
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.get>>);
		vi.mocked(ctx.octokit.paginate).mockResolvedValue([]);

		const runnerCalls: ObjectRunOptions<ImplementPr>[] = [];
		const runner = async (
			options: ObjectRunOptions<ImplementPr>,
		): Promise<RunAgentResult<ImplementPr>> => {
			runnerCalls.push(options);
			return fakeResult({
				replies: [{ body: "Fixed and covered.", commentId: "9001" }],
				summary: "Fixed the review finding.",
			});
		};
		const execCalls: Array<{ command: string; args: string[] }> = [];
		const responses: Record<
			string,
			{ exitCode: number; stderr: string; stdout: string }
		> = {
			"git:diff": {
				exitCode: 0,
				stderr: "",
				stdout: "+export const fixed = true;",
			},
			"git:merge-base": { exitCode: 0, stderr: "", stdout: "abc123\n" },
			"git:status": { exitCode: 0, stderr: "", stdout: " M src/fix.ts\n" },
		};
		const exec: ExecFn = async (command, args) => {
			execCalls.push({ args, command });
			return (
				responses[`${command}:${args[0] as string}`] ?? {
					exitCode: 0,
					stderr: "",
					stdout: "",
				}
			);
		};

		// Act
		await runImplementPr(ctx, runner, exec);

		// Assert
		expect(runnerCalls).toHaveLength(1);
		expect(runnerCalls[0]?.output).toBe(OUTPUTS["implement-pr"]);
		expect(runnerCalls[0]?.skills).toEqual(["implement"]);
		expect(runnerCalls[0]?.promptArgs).toEqual(
			expect.objectContaining({
				BRANCH_NAME: "agent/issue-17-fix-review",
				DIFF: "+export const fixed = true;",
				ISSUE_NUMBER: "17",
				REVIEW_THREADS: expect.stringContaining("9001"),
				TICKET: expect.stringContaining("The originating ticket."),
			}),
		);
		expect(execCalls).toContainEqual({
			args: ["push", "origin", "HEAD:agent/issue-17-fix-review"],
			command: "git",
		});
		expect(execCalls).toContainEqual({
			args: [
				"api",
				"--method",
				"POST",
				"repos/{owner}/{repo}/pulls/comments/9001/replies",
				"--field",
				"body=Fixed and covered.",
			],
			command: "gh",
		});
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith(
			expect.objectContaining({
				issue_number: 42,
				labels: [LABELS.reviewNeeded],
			}),
		);
	});

	it("handles a PR without a ticket when no changes or PAT are available", async () => {
		// Arrange
		const ctx = buildContext();
		vi.mocked(ctx.octokit.rest.pulls.get).mockResolvedValue({
			data: {
				body: null,
				head: { ref: "feature/no-ticket" },
				labels: [{ name: LABELS.devNeeded }],
			},
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.pulls.get>>);
		vi.mocked(ctx.octokit.rest.pulls.listReviewComments).mockResolvedValue({
			data: [],
		} as unknown as Awaited<
			ReturnType<typeof ctx.octokit.rest.pulls.listReviewComments>
		>);

		const runnerCalls: ObjectRunOptions<ImplementPr>[] = [];
		const runner = async (
			options: ObjectRunOptions<ImplementPr>,
		): Promise<RunAgentResult<ImplementPr>> => {
			runnerCalls.push(options);
			return fakeResult({ replies: [], summary: "No changes needed." });
		};
		const execCalls: Array<{ command: string; args: string[] }> = [];
		const exec: ExecFn = async (command, args) => {
			execCalls.push({ args, command });
			if (command === "git" && args[0] === "merge-base") {
				return { exitCode: 0, stderr: "", stdout: "abc123\n" };
			}
			return { exitCode: 0, stderr: "", stdout: "" };
		};

		// Act
		await runImplementPr(ctx, runner, exec);

		// Assert
		expect(runnerCalls[0]?.promptArgs).toEqual(
			expect.objectContaining({
				ISSUE_NUMBER: "42",
				REVIEW_THREADS: "No existing review threads.",
				TICKET: "No originating issue was found.",
			}),
		);
		expect(execCalls).not.toContainEqual({
			args: ["add", "-A"],
			command: "git",
		});
		expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.stringContaining("AGENT_PAT"),
			}),
		);
	});

	it("formats sparse review comments before sending them to the agent", async () => {
		// Arrange
		process.env.AGENT_PAT = "pat-token";
		const ctx = buildContext();
		vi.mocked(ctx.octokit.rest.pulls.get).mockResolvedValue({
			data: {
				body: "No ticket link.",
				head: { ref: "feature/sparse-comment" },
				labels: [],
			},
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.pulls.get>>);
		vi.mocked(ctx.octokit.rest.pulls.listReviewComments).mockResolvedValue({
			data: [
				{
					body: null,
					id: 9002,
					line: null,
					path: "README.md",
					user: null,
				},
			],
		} as unknown as Awaited<
			ReturnType<typeof ctx.octokit.rest.pulls.listReviewComments>
		>);
		const runnerCalls: ObjectRunOptions<ImplementPr>[] = [];
		const runner = async (
			options: ObjectRunOptions<ImplementPr>,
		): Promise<RunAgentResult<ImplementPr>> => {
			runnerCalls.push(options);
			return fakeResult({ replies: [], summary: "Reviewed." });
		};
		const exec: ExecFn = async (_command, args) =>
			args[0] === "merge-base"
				? { exitCode: 0, stderr: "", stdout: "abc123\n" }
				: { exitCode: 0, stderr: "", stdout: "" };

		// Act
		await runImplementPr(ctx, runner, exec);

		// Assert
		expect(runnerCalls[0]?.promptArgs.REVIEW_THREADS).toContain(
			"Comment 9002 at **README.md:?** (unknown):",
		);
	});

	it.each([
		["stderr", "permission denied", "permission denied"],
		["stdout", "", "remote rejected"],
		["fallback", "", ""],
	])(
		"reports a %s command failure and blocks the stage",
		async (_label, stderr, stdout) => {
			// Arrange
			process.env.AGENT_PAT = "pat-token";
			const ctx = buildContext();
			vi.mocked(ctx.octokit.rest.pulls.get).mockResolvedValue({
				data: {
					body: "Closes #17",
					head: { ref: "agent/issue-17-fix-review" },
					labels: [],
				},
			} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.pulls.get>>);
			vi.mocked(ctx.octokit.rest.pulls.listReviewComments).mockResolvedValue({
				data: [],
			} as unknown as Awaited<
				ReturnType<typeof ctx.octokit.rest.pulls.listReviewComments>
			>);
			vi.mocked(ctx.octokit.rest.issues.get).mockResolvedValue({
				data: { body: "The originating ticket." },
			} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.get>>);
			const runner = async (): Promise<RunAgentResult<ImplementPr>> =>
				fakeResult({ replies: [], summary: "Fixed." });
			const exec: ExecFn = async (command, args) => {
				if (command === "git" && args[0] === "push") {
					return { exitCode: 1, stderr, stdout };
				}
				if (command === "git" && args[0] === "merge-base") {
					return { exitCode: 0, stderr: "", stdout: "abc123\n" };
				}
				return { exitCode: 0, stderr: "", stdout: "" };
			};

			// Act
			const act = runImplementPr(ctx, runner, exec);

			// Assert
			await expect(act).rejects.toThrow(stdout || stderr || "unknown error");
			expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith(
				expect.objectContaining({ labels: [LABELS.agentInProgress] }),
			);
		},
	);

	it("wires its workflow environment into the default runner", async () => {
		// Arrange
		process.env.GITHUB_TOKEN = "fake-token";
		process.env.ISSUE_NUMBER = "42";
		process.env.AGENT_PAT = "pat-token";
		const ctx = buildContext();
		vi.mocked(ctx.octokit.rest.pulls.get).mockResolvedValue({
			data: {
				body: "Closes #17",
				head: { ref: "agent/issue-17-fix-review" },
				labels: [],
			},
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.pulls.get>>);
		vi.mocked(ctx.octokit.rest.pulls.listReviewComments).mockResolvedValue({
			data: [],
		} as unknown as Awaited<
			ReturnType<typeof ctx.octokit.rest.pulls.listReviewComments>
		>);
		vi.mocked(ctx.octokit.rest.issues.get).mockResolvedValue({
			data: { body: "The originating ticket." },
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.get>>);
		vi.mocked(runAgent).mockResolvedValue(
			fakeResult({ replies: [], summary: "Fixed." }),
		);
		vi.mocked((await import("../exec")).defaultExec).mockImplementation(
			async (_command, args) =>
				args[0] === "merge-base"
					? { exitCode: 0, stderr: "", stdout: "abc123\n" }
					: { exitCode: 0, stderr: "", stdout: "" },
		);

		// Act
		await implementPrRun();

		// Assert
		expect(github.getOctokit).toHaveBeenCalledWith("fake-token");
		expect(runAgent).toHaveBeenCalledWith(
			expect.objectContaining({ skills: ["implement"] }),
		);
	});
});
