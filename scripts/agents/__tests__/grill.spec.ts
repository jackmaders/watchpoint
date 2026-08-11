import * as github from "@actions/github";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IssueContext } from "../github";
import { run as grillRun, runGrillRound } from "../grill";
import type { RunAgentResult } from "../run-agent";
import type { GrillRound } from "../schemas";

vi.mock("@actions/github");
vi.mock("../logger");
vi.mock("../run-agent");

function fakeResult(output: GrillRound): RunAgentResult<GrillRound> {
	return {
		output,
		raw: "",
		sessionId: "sess_1",
		usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
	};
}

function buildCtx(): IssueContext {
	return {
		issueNumber: 42,
		octokit: github.getOctokit("fake-token"),
		owner: "jackmaders",
		repo: "watchpoint",
	};
}

/**
 * `transitionState` skips removing a label that isn't already present, so
 * every test that expects a removal must first tell the shared octokit mock
 * what labels the issue currently carries.
 */
function mockIssueLabels(ctx: IssueContext, labelNames: string[]): void {
	vi.mocked(ctx.octokit.rest.issues.get).mockResolvedValue({
		data: {
			body: "The idea.",
			labels: labelNames.map((name) => ({ name })),
			number: 42,
			title: "An idea",
		},
	} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.get>>);
}

describe("runGrillRound", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("transitions to in-progress before running the model", async () => {
		// Arrange
		const ctx = buildCtx();
		mockIssueLabels(ctx, ["grill:needed", "agent:blocked"]);
		const runner = vi
			.fn()
			.mockResolvedValue(
				fakeResult({ frontierEmpty: false, roundMarkdown: "1. Q?" }),
			);

		// Act
		await runGrillRound(ctx, runner);

		// Assert
		expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
			issue_number: 42,
			name: "grill:needed",
			owner: "jackmaders",
			repo: "watchpoint",
		});
		expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
			issue_number: 42,
			name: "agent:blocked",
			owner: "jackmaders",
			repo: "watchpoint",
		});
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
			issue_number: 42,
			labels: ["agent:in-progress"],
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});

	it("calls the runner with the grill model, output spec, prompt, conversation, and expected skill", async () => {
		// Arrange
		const ctx = buildCtx();
		mockIssueLabels(ctx, []);
		const runner = vi
			.fn()
			.mockResolvedValue(
				fakeResult({ frontierEmpty: false, roundMarkdown: "1. Q?" }),
			);

		// Act
		await runGrillRound(ctx, runner);

		// Assert
		expect(runner).toHaveBeenCalledWith(
			expect.objectContaining({
				expectSkill: "grilling",
				promptArgs: expect.objectContaining({
					CONVERSATION: expect.stringContaining("User Context (Issue Body):"),
				}),
			}),
		);
	});

	it("posts the round markdown as a bot comment", async () => {
		// Arrange
		const ctx = buildCtx();
		mockIssueLabels(ctx, []);
		const runner = vi.fn().mockResolvedValue(
			fakeResult({
				frontierEmpty: false,
				roundMarkdown: "❓ **Q1** - **Title**: body\n\n➡️ recommended",
			}),
		);

		// Act
		await runGrillRound(ctx, runner);

		// Assert
		expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith({
			body: "<!-- bot-comment -->\n❓ **Q1** - **Title**: body\n\n➡️ recommended",
			issue_number: 42,
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});

	it("applies needs-info when the frontier is not empty", async () => {
		// Arrange
		const ctx = buildCtx();
		mockIssueLabels(ctx, []);
		const runner = vi
			.fn()
			.mockResolvedValue(
				fakeResult({ frontierEmpty: false, roundMarkdown: "1. Q?" }),
			);

		// Act
		await runGrillRound(ctx, runner);

		// Assert
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
			issue_number: 42,
			labels: ["needs-info"],
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});

	it("removes agent:in-progress once the happy path completes", async () => {
		// Arrange
		const ctx = buildCtx();
		mockIssueLabels(ctx, ["agent:in-progress"]);
		const runner = vi
			.fn()
			.mockResolvedValue(
				fakeResult({ frontierEmpty: false, roundMarkdown: "1. Q?" }),
			);

		// Act
		await runGrillRound(ctx, runner);

		// Assert
		expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
			issue_number: 42,
			name: "agent:in-progress",
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});

	it("removes agent:in-progress even though the issue never carried it before this run added it", async () => {
		// Arrange
		// The realistic starting state: agent:in-progress isn't on the issue
		// yet — this run's own first transition is what adds it. A `finally`
		// that re-diffed against this pre-fetch snapshot instead of the
		// updated one would never see it as present, and would silently skip
		// removing it.
		const ctx = buildCtx();
		mockIssueLabels(ctx, ["grill:needed"]);
		const runner = vi
			.fn()
			.mockResolvedValue(
				fakeResult({ frontierEmpty: false, roundMarkdown: "1. Q?" }),
			);

		// Act
		await runGrillRound(ctx, runner);

		// Assert
		expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
			issue_number: 42,
			name: "agent:in-progress",
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});

	describe("when the frontier is empty", () => {
		const originalEnv = { ...process.env };

		afterEach(() => {
			process.env = { ...originalEnv };
		});

		it("chains to spec:needed with an AGENT_PAT-authenticated client when the PAT is set", async () => {
			// Arrange
			process.env.AGENT_PAT = "pat-token";
			const ctx = buildCtx();
			mockIssueLabels(ctx, ["needs-info"]);
			const runner = vi
				.fn()
				.mockResolvedValue(
					fakeResult({ frontierEmpty: true, roundMarkdown: "Nothing left." }),
				);

			// Act
			await runGrillRound(ctx, runner);

			// Assert
			expect(github.getOctokit).toHaveBeenCalledWith("pat-token");
			expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
				issue_number: 42,
				name: "needs-info",
				owner: "jackmaders",
				repo: "watchpoint",
			});
			expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
				issue_number: 42,
				labels: ["spec:needed"],
				owner: "jackmaders",
				repo: "watchpoint",
			});
		});

		it("falls back to a comment asking the maintainer to relabel manually when the PAT is absent", async () => {
			// Arrange
			Reflect.deleteProperty(process.env, "AGENT_PAT");
			const ctx = buildCtx();
			mockIssueLabels(ctx, ["needs-info"]);
			const runner = vi
				.fn()
				.mockResolvedValue(
					fakeResult({ frontierEmpty: true, roundMarkdown: "Nothing left." }),
				);

			// Act
			await runGrillRound(ctx, runner);

			// Assert
			expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith({
				body: expect.stringContaining("spec:needed"),
				issue_number: 42,
				owner: "jackmaders",
				repo: "watchpoint",
			});
			expect(ctx.octokit.rest.issues.addLabels).not.toHaveBeenCalledWith(
				expect.objectContaining({ labels: ["spec:needed"] }),
			);
		});
	});

	describe("when the runner fails", () => {
		it("applies agent:blocked, posts an error comment, removes agent:in-progress, and rethrows", async () => {
			// Arrange
			const ctx = buildCtx();
			mockIssueLabels(ctx, ["agent:in-progress"]);
			const runner = vi.fn().mockRejectedValue(new Error("quota exceeded"));

			// Act
			const act = runGrillRound(ctx, runner);

			// Assert
			await expect(act).rejects.toThrow("quota exceeded");
			expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
				issue_number: 42,
				labels: ["agent:blocked"],
				owner: "jackmaders",
				repo: "watchpoint",
			});
			expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith({
				body: expect.stringContaining("⚠️ **Grill Error:**"),
				issue_number: 42,
				owner: "jackmaders",
				repo: "watchpoint",
			});
			expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
				issue_number: 42,
				name: "agent:in-progress",
				owner: "jackmaders",
				repo: "watchpoint",
			});
		});
	});
});

describe("run", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	it("wires an IssueContext from the workflow's env vars and runs a grill round", async () => {
		// Arrange
		process.env.GITHUB_TOKEN = "fake-token";
		process.env.ISSUE_NUMBER = "42";
		const { runAgent } = await import("../run-agent");
		vi.mocked(runAgent).mockResolvedValue(
			fakeResult({ frontierEmpty: false, roundMarkdown: "1. Q?" }),
		);

		// Act
		await grillRun();

		// Assert
		expect(github.getOctokit).toHaveBeenCalledWith("fake-token");
	});

	it("defaults the issue number to 0 rather than throwing when ISSUE_NUMBER is unset", async () => {
		// Arrange
		process.env.GITHUB_TOKEN = "fake-token";
		Reflect.deleteProperty(process.env, "ISSUE_NUMBER");
		const { runAgent } = await import("../run-agent");
		vi.mocked(runAgent).mockResolvedValue(
			fakeResult({ frontierEmpty: false, roundMarkdown: "1. Q?" }),
		);

		// Act
		const act = grillRun();

		// Assert
		await expect(act).resolves.not.toThrow();
		expect(github.getOctokit).toHaveBeenCalledWith("fake-token");
	});
});
