import * as github from "@actions/github";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IssueContext } from "../github";
import type { RunAgentResult } from "../run-agent";
import type { Spec } from "../schemas";
import {
	buildSeamsComment,
	buildSpecBody,
	extractOriginalProposal,
	runSpecPublication,
	run as specRun,
} from "../spec";

vi.mock("@actions/github");
vi.mock("../logger");
vi.mock("../run-agent");

function fakeResult(output: Spec): RunAgentResult<Spec> {
	return {
		output,
		raw: "",
		sessionId: "sess_1",
		usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
	};
}

function fakeSpec(overrides: Partial<Spec> = {}): Spec {
	return {
		outOfScope: [],
		seams: [],
		specMarkdown: "## Problem Statement\n\nThe thing.",
		...overrides,
	};
}

function buildCtx(): IssueContext {
	return {
		issueNumber: 55,
		octokit: github.getOctokit("fake-token"),
		owner: "jackmaders",
		repo: "watchpoint",
	};
}

/**
 * `transitionState` skips removing a label that isn't already present, so
 * every test that expects a removal must first tell the shared octokit mock
 * what labels — and body — the issue currently carries.
 */
function mockIssue(
	ctx: IssueContext,
	{ body, labelNames }: { body: string; labelNames: string[] },
): void {
	vi.mocked(ctx.octokit.rest.issues.get).mockResolvedValue({
		data: {
			body,
			labels: labelNames.map((name) => ({ name })),
			number: 55,
			title: "An idea",
		},
	} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.get>>);
}

describe("extractOriginalProposal", () => {
	it("returns the body unchanged when it carries no details wrapper", () => {
		// Arrange
		const body = "The original loose idea.";

		// Act
		const result = extractOriginalProposal(body);

		// Assert
		expect(result).toBe("The original loose idea.");
	});

	it("unwraps a body that has already been published once, so a retry can't nest wrappers", () => {
		// Arrange
		const body =
			"## Spec\n\nSynthesised text.\n\n<details>\n<summary>📜 Original Issue Proposal</summary>\n\nThe original loose idea.\n</details>";

		// Act
		const result = extractOriginalProposal(body);

		// Assert
		expect(result).toBe("The original loose idea.");
	});
});

describe("buildSpecBody", () => {
	it("publishes the spec markdown with the original proposal preserved beneath it", () => {
		// Arrange
		const spec = fakeSpec({
			specMarkdown: "## Problem Statement\n\nThe thing.",
		});

		// Act
		const body = buildSpecBody(spec, "The original loose idea.");

		// Assert
		expect(body).toBe(
			"## Problem Statement\n\nThe thing.\n\n<details>\n<summary>📜 Original Issue Proposal</summary>\n\nThe original loose idea.\n</details>",
		);
	});

	it("renders a deterministic Out of Scope section from the structured field", () => {
		// Arrange
		const spec = fakeSpec({ outOfScope: ["Mobile app", "Bulk import"] });

		// Act
		const body = buildSpecBody(spec, "Original.");

		// Assert
		expect(body).toContain(
			"## Out of Scope\n\n- Mobile app\n- Bulk import\n\n<details>",
		);
	});

	it("omits the Out of Scope section entirely when nothing was excluded", () => {
		// Arrange
		const spec = fakeSpec({ outOfScope: [] });

		// Act
		const body = buildSpecBody(spec, "Original.");

		// Assert
		expect(body).not.toContain("## Out of Scope");
	});

	it("omits the details wrapper entirely rather than growing one around nothing, matching executeSpecPublishing", () => {
		// Arrange
		const spec = fakeSpec({ specMarkdown: "## Problem Statement\n\nX." });

		// Act
		const body = buildSpecBody(spec, "");

		// Assert
		expect(body).toBe("## Problem Statement\n\nX.");
	});
});

describe("buildSeamsComment", () => {
	it("lists each seam with its rationale", () => {
		// Arrange
		const seams = [
			{ name: "runAgent({ spawn })", rationale: "Every model invocation." },
		];

		// Act
		const comment = buildSeamsComment(seams);

		// Assert
		expect(comment).toContain(
			"- **runAgent({ spawn })**: Every model invocation.",
		);
	});

	it("says plainly that no seams were named when the array is empty", () => {
		// Arrange
		// Act
		const comment = buildSeamsComment([]);

		// Assert
		expect(comment).toBe(
			"🪡 **Test Seams**\n\nNo seams were named for this spec.",
		);
	});
});

describe("runSpecPublication", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("transitions to in-progress before running the model", async () => {
		// Arrange
		const ctx = buildCtx();
		mockIssue(ctx, {
			body: "The idea.",
			labelNames: ["spec:needed", "agent:blocked"],
		});
		const runner = vi.fn().mockResolvedValue(fakeResult(fakeSpec()));

		// Act
		await runSpecPublication(ctx, runner);

		// Assert
		expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
			issue_number: 55,
			name: "spec:needed",
			owner: "jackmaders",
			repo: "watchpoint",
		});
		expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
			issue_number: 55,
			name: "agent:blocked",
			owner: "jackmaders",
			repo: "watchpoint",
		});
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
			issue_number: 55,
			labels: ["agent:in-progress"],
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});

	it("calls the runner with the spec model, output spec, prompt, conversation, and expected skill", async () => {
		// Arrange
		const ctx = buildCtx();
		mockIssue(ctx, { body: "The idea.", labelNames: [] });
		const runner = vi.fn().mockResolvedValue(fakeResult(fakeSpec()));

		// Act
		await runSpecPublication(ctx, runner);

		// Assert
		expect(runner).toHaveBeenCalledWith(
			expect.objectContaining({
				promptArgs: expect.objectContaining({
					CONVERSATION: expect.stringContaining("User Context (Issue Body):"),
				}),
				skills: ["to-spec"],
			}),
		);
	});

	it("updates the issue body with the published spec and the original proposal preserved", async () => {
		// Arrange
		const ctx = buildCtx();
		mockIssue(ctx, { body: "The original idea.", labelNames: [] });
		const runner = vi
			.fn()
			.mockResolvedValue(
				fakeResult(fakeSpec({ specMarkdown: "## Problem Statement\n\nX." })),
			);

		// Act
		await runSpecPublication(ctx, runner);

		// Assert
		expect(ctx.octokit.rest.issues.update).toHaveBeenCalledWith({
			body: "## Problem Statement\n\nX.\n\n<details>\n<summary>📜 Original Issue Proposal</summary>\n\nThe original idea.\n</details>",
			issue_number: 55,
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});

	it("publishes the spec bare, with no dangling wrapper, when the issue has no body to preserve", async () => {
		// Arrange
		const ctx = buildCtx();
		vi.mocked(ctx.octokit.rest.issues.get).mockResolvedValue({
			data: { body: null, labels: [], number: 55, title: "An idea" },
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.get>>);
		const runner = vi
			.fn()
			.mockResolvedValue(
				fakeResult(fakeSpec({ specMarkdown: "## Problem Statement\n\nX." })),
			);

		// Act
		await runSpecPublication(ctx, runner);

		// Assert
		expect(ctx.octokit.rest.issues.update).toHaveBeenCalledWith({
			body: "## Problem Statement\n\nX.",
			issue_number: 55,
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});

	it("posts the seams as their own bot comment, separate from the spec body update", async () => {
		// Arrange
		const ctx = buildCtx();
		mockIssue(ctx, { body: "The idea.", labelNames: [] });
		const runner = vi.fn().mockResolvedValue(
			fakeResult(
				fakeSpec({
					seams: [{ name: "runAgent", rationale: "The one seam." }],
				}),
			),
		);

		// Act
		await runSpecPublication(ctx, runner);

		// Assert
		expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith({
			body: expect.stringContaining("**runAgent**: The one seam."),
			issue_number: 55,
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});

	it("applies spec:ready and ready-for-agent once the spec is published", async () => {
		// Arrange
		const ctx = buildCtx();
		mockIssue(ctx, { body: "The idea.", labelNames: [] });
		const runner = vi.fn().mockResolvedValue(fakeResult(fakeSpec()));

		// Act
		await runSpecPublication(ctx, runner);

		// Assert
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
			issue_number: 55,
			labels: ["spec:ready", "ready-for-agent"],
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});

	it("removes agent:in-progress once the happy path completes", async () => {
		// Arrange
		const ctx = buildCtx();
		mockIssue(ctx, { body: "The idea.", labelNames: ["agent:in-progress"] });
		const runner = vi.fn().mockResolvedValue(fakeResult(fakeSpec()));

		// Act
		await runSpecPublication(ctx, runner);

		// Assert
		expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
			issue_number: 55,
			name: "agent:in-progress",
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});

	describe("chaining to tickets:needed", () => {
		const originalEnv = { ...process.env };

		afterEach(() => {
			process.env = { ...originalEnv };
		});

		it("chains to tickets:needed with an AGENT_PAT-authenticated client when the PAT is set", async () => {
			// Arrange
			process.env.AGENT_PAT = "pat-token";
			const ctx = buildCtx();
			mockIssue(ctx, { body: "The idea.", labelNames: [] });
			const runner = vi.fn().mockResolvedValue(fakeResult(fakeSpec()));

			// Act
			await runSpecPublication(ctx, runner);

			// Assert
			expect(github.getOctokit).toHaveBeenCalledWith("pat-token");
			expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
				issue_number: 55,
				labels: ["tickets:needed"],
				owner: "jackmaders",
				repo: "watchpoint",
			});
		});

		it("falls back to a comment asking the maintainer to relabel manually when the PAT is absent", async () => {
			// Arrange
			Reflect.deleteProperty(process.env, "AGENT_PAT");
			const ctx = buildCtx();
			mockIssue(ctx, { body: "The idea.", labelNames: [] });
			const runner = vi.fn().mockResolvedValue(fakeResult(fakeSpec()));

			// Act
			await runSpecPublication(ctx, runner);

			// Assert
			expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith({
				body: expect.stringContaining("tickets:needed"),
				issue_number: 55,
				owner: "jackmaders",
				repo: "watchpoint",
			});
			expect(ctx.octokit.rest.issues.addLabels).not.toHaveBeenCalledWith(
				expect.objectContaining({ labels: ["tickets:needed"] }),
			);
		});
	});

	describe("when the runner fails", () => {
		it("applies agent:blocked, posts an error comment, removes agent:in-progress, and rethrows", async () => {
			// Arrange
			const ctx = buildCtx();
			mockIssue(ctx, { body: "The idea.", labelNames: ["agent:in-progress"] });
			const runner = vi.fn().mockRejectedValue(new Error("quota exceeded"));

			// Act
			const act = runSpecPublication(ctx, runner);

			// Assert
			await expect(act).rejects.toThrow("quota exceeded");
			expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
				issue_number: 55,
				labels: ["agent:blocked"],
				owner: "jackmaders",
				repo: "watchpoint",
			});
			expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith({
				body: expect.stringContaining("⚠️ **Spec Error:**"),
				issue_number: 55,
				owner: "jackmaders",
				repo: "watchpoint",
			});
			expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
				issue_number: 55,
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

	it("wires an IssueContext from the workflow's env vars and runs the spec publication", async () => {
		// Arrange
		process.env.GITHUB_TOKEN = "fake-token";
		process.env.ISSUE_NUMBER = "55";
		const { runAgent } = await import("../run-agent");
		vi.mocked(runAgent).mockResolvedValue(fakeResult(fakeSpec()));

		// Act
		await specRun();

		// Assert
		expect(github.getOctokit).toHaveBeenCalledWith("fake-token");
	});

	it("defaults the issue number to 0 rather than throwing when ISSUE_NUMBER is unset", async () => {
		// Arrange
		process.env.GITHUB_TOKEN = "fake-token";
		Reflect.deleteProperty(process.env, "ISSUE_NUMBER");
		const { runAgent } = await import("../run-agent");
		vi.mocked(runAgent).mockResolvedValue(fakeResult(fakeSpec()));

		// Act
		const act = specRun();

		// Assert
		await expect(act).resolves.not.toThrow();
		expect(github.getOctokit).toHaveBeenCalledWith("fake-token");
	});
});
