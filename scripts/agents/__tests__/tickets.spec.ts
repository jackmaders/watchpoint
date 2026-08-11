import * as github from "@actions/github";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IssueContext } from "../github";
import type { RunAgentResult } from "../run-agent";
import type { Ticket, TicketBreakdown } from "../schemas";
import {
	buildProposalComment,
	buildWiredComment,
	extractTicketsPayload,
	findLatestTicketsPayload,
	matchesApproveCommand,
	runTicketsProposal,
	runTicketsWiring,
	run as ticketsRun,
} from "../tickets";
import type { WiredTicket } from "../wiring";

vi.mock("@actions/github");
vi.mock("../logger");
vi.mock("../run-agent");

function fakeTicket(overrides: Partial<Ticket> = {}): Ticket {
	return {
		acceptanceCriteria: ["It works."],
		blockers: [],
		id: "T1",
		implementationSteps: ["Do the thing."],
		title: "Do the thing",
		whatToBuild: "The thing.",
		...overrides,
	};
}

function fakeBreakdown(tickets: Ticket[] = [fakeTicket()]): TicketBreakdown {
	return { tickets };
}

function fakeResult(output: TicketBreakdown): RunAgentResult<TicketBreakdown> {
	return {
		output,
		raw: "",
		sessionId: "sess_1",
		usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
	};
}

function buildCtx(): IssueContext {
	return {
		issueNumber: 56,
		octokit: github.getOctokit("fake-token"),
		owner: "jackmaders",
		repo: "watchpoint",
	};
}

function mockIssue(
	ctx: IssueContext,
	{
		body = "The spec.",
		labelNames = [],
		title = "Ticket breakdown",
	}: { body?: string; labelNames?: string[]; title?: string },
): void {
	vi.mocked(ctx.octokit.rest.issues.get).mockResolvedValue({
		data: {
			body,
			labels: labelNames.map((name) => ({ name })),
			number: 56,
			title,
		},
	} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.get>>);
}

function mockComments(ctx: IssueContext, bodies: string[]): void {
	vi.mocked(ctx.octokit.paginate).mockImplementation((async (
		method: unknown,
	) => {
		if (method === ctx.octokit.rest.issues.listComments) {
			return bodies.map((body) => ({ body }));
		}
		return [];
	}) as unknown as typeof ctx.octokit.paginate);
}

function mockWiringPrerequisites(ctx: IssueContext): void {
	vi.mocked(ctx.octokit.rest.issues.listMilestones).mockResolvedValue({
		data: [],
	} as unknown as Awaited<
		ReturnType<typeof ctx.octokit.rest.issues.listMilestones>
	>);
	vi.mocked(ctx.octokit.rest.issues.createMilestone).mockResolvedValue({
		data: { number: 5 },
	} as unknown as Awaited<
		ReturnType<typeof ctx.octokit.rest.issues.createMilestone>
	>);
	vi.mocked(ctx.octokit.rest.issues.create).mockResolvedValue({
		data: { id: 301, number: 201 },
	} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.create>>);
}

describe("matchesApproveCommand", () => {
	it("matches /approve at the start of a line", () => {
		// Arrange
		// Act
		// Assert
		expect(matchesApproveCommand("/approve")).toBe(true);
		expect(matchesApproveCommand("Looks good.\n/approve")).toBe(true);
	});

	it("does not match /approve mentioned mid-sentence", () => {
		// Arrange
		// Act
		// Assert
		expect(matchesApproveCommand("I won't /approve this yet")).toBe(false);
	});

	it("does not match unrelated feedback", () => {
		// Arrange
		// Act
		// Assert
		expect(matchesApproveCommand("Please merge tickets 2 and 3.")).toBe(false);
	});
});

describe("buildProposalComment", () => {
	it("numbers each ticket with its title, blockers, and acceptance-criteria count", () => {
		// Arrange
		const breakdown = fakeBreakdown([
			fakeTicket({ acceptanceCriteria: ["A", "B"], id: "T1", title: "First" }),
			fakeTicket({ blockers: ["T1"], id: "T2", title: "Second" }),
		]);

		// Act
		const comment = buildProposalComment(breakdown);

		// Assert
		expect(comment).toContain("1. **First**");
		expect(comment).toContain("Blocked by: None — can start immediately");
		expect(comment).toContain("Acceptance criteria: 2");
		expect(comment).toContain("2. **Second**");
		expect(comment).toContain("Blocked by: T1");
	});

	it("embeds the full breakdown as a hidden, machine-readable payload", () => {
		// Arrange
		const breakdown = fakeBreakdown();

		// Act
		const comment = buildProposalComment(breakdown);

		// Assert
		expect(extractTicketsPayload(comment)).toEqual(breakdown);
	});
});

describe("extractTicketsPayload", () => {
	it("round-trips a valid embedded payload", () => {
		// Arrange
		const breakdown = fakeBreakdown();
		const comment = `Some text.\n\n<!-- tickets-payload: ${JSON.stringify(breakdown)} -->`;

		// Act
		const result = extractTicketsPayload(comment);

		// Assert
		expect(result).toEqual(breakdown);
	});

	it("returns null when no payload marker is present", () => {
		// Arrange
		// Act
		const result = extractTicketsPayload("Just a comment.");

		// Assert
		expect(result).toBeNull();
	});

	it("returns null when the embedded payload is malformed JSON", () => {
		// Arrange
		const comment = "<!-- tickets-payload: {not json -->";

		// Act
		const result = extractTicketsPayload(comment);

		// Assert
		expect(result).toBeNull();
	});

	it("returns null when the embedded payload fails schema validation", () => {
		// Arrange
		const comment = `<!-- tickets-payload: ${JSON.stringify({ tickets: [] })} -->`;

		// Act
		const result = extractTicketsPayload(comment);

		// Assert
		expect(result).toBeNull();
	});
});

describe("findLatestTicketsPayload", () => {
	it("finds the payload in the latest matching bot comment", () => {
		// Arrange
		const older = fakeBreakdown([fakeTicket({ title: "Old" })]);
		const newer = fakeBreakdown([fakeTicket({ title: "New" })]);
		const comments = [
			{
				body: `<!-- bot-comment -->\n<!-- tickets-payload: ${JSON.stringify(older)} -->`,
			},
			{ body: "A human reply in between." },
			{
				body: `<!-- bot-comment -->\n<!-- tickets-payload: ${JSON.stringify(newer)} -->`,
			},
		];

		// Act
		const result = findLatestTicketsPayload(comments);

		// Assert
		expect(result).toEqual(newer);
	});

	it("ignores a payload-shaped marker in a comment that isn't bot-authored", () => {
		// Arrange
		const breakdown = fakeBreakdown();
		const comments = [
			{
				body: `A human pasting <!-- tickets-payload: ${JSON.stringify(breakdown)} -->`,
			},
		];

		// Act
		const result = findLatestTicketsPayload(comments);

		// Assert
		expect(result).toBeNull();
	});

	it("returns null when no comment carries a valid payload", () => {
		// Arrange
		const comments = [{ body: "<!-- bot-comment -->\nJust a note." }];

		// Act
		const result = findLatestTicketsPayload(comments);

		// Assert
		expect(result).toBeNull();
	});

	it("treats a bodyless comment as empty rather than throwing", () => {
		// Arrange
		const comments = [{ body: null }];

		// Act
		const result = findLatestTicketsPayload(comments);

		// Assert
		expect(result).toBeNull();
	});
});

describe("buildWiredComment", () => {
	it("lists every wired ticket with its resolved issue number", () => {
		// Arrange
		const wired: WiredTicket[] = [
			{
				isFrontier: true,
				isNew: true,
				number: 201,
				ticketId: "T1",
				title: "First",
			},
			{
				isFrontier: false,
				isNew: false,
				number: 202,
				ticketId: "T2",
				title: "Second",
			},
		];

		// Act
		const comment = buildWiredComment(wired);

		// Assert
		expect(comment).toContain("#201 — First");
		expect(comment).toContain("#202 — Second (updated)");
	});
});

describe("runTicketsProposal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("transitions to in-progress, removing the trigger label, before running the model", async () => {
		// Arrange
		const ctx = buildCtx();
		mockIssue(ctx, { labelNames: ["tickets:needed", "agent:blocked"] });
		const runner = vi.fn().mockResolvedValue(fakeResult(fakeBreakdown()));

		// Act
		await runTicketsProposal(ctx, runner);

		// Assert
		expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
			issue_number: 56,
			name: "tickets:needed",
			owner: "jackmaders",
			repo: "watchpoint",
		});
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
			issue_number: 56,
			labels: ["agent:in-progress"],
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});

	it("calls the runner with the tickets model, output schema, and expected skill", async () => {
		// Arrange
		const ctx = buildCtx();
		mockIssue(ctx, {});
		const runner = vi.fn().mockResolvedValue(fakeResult(fakeBreakdown()));

		// Act
		await runTicketsProposal(ctx, runner);

		// Assert
		expect(runner).toHaveBeenCalledWith(
			expect.objectContaining({
				skills: ["to-tickets"],
			}),
		);
	});

	it("posts the numbered proposal and applies tickets:proposed, without creating any issue", async () => {
		// Arrange
		const ctx = buildCtx();
		mockIssue(ctx, {});
		const runner = vi.fn().mockResolvedValue(fakeResult(fakeBreakdown()));

		// Act
		await runTicketsProposal(ctx, runner);

		// Assert
		expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.stringContaining("Proposed Ticket Breakdown"),
			}),
		);
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
			issue_number: 56,
			labels: ["tickets:proposed"],
			owner: "jackmaders",
			repo: "watchpoint",
		});
		expect(ctx.octokit.rest.issues.create).not.toHaveBeenCalled();
	});

	it("removes agent:in-progress once the happy path completes", async () => {
		// Arrange
		const ctx = buildCtx();
		mockIssue(ctx, { labelNames: ["agent:in-progress"] });
		const runner = vi.fn().mockResolvedValue(fakeResult(fakeBreakdown()));

		// Act
		await runTicketsProposal(ctx, runner);

		// Assert
		expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
			issue_number: 56,
			name: "agent:in-progress",
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});

	describe("when the runner fails", () => {
		it("applies agent:blocked, posts an error comment, removes agent:in-progress, and rethrows", async () => {
			// Arrange
			const ctx = buildCtx();
			mockIssue(ctx, { labelNames: ["agent:in-progress"] });
			const runner = vi.fn().mockRejectedValue(new Error("quota exceeded"));

			// Act
			const act = runTicketsProposal(ctx, runner);

			// Assert
			await expect(act).rejects.toThrow("quota exceeded");
			expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
				issue_number: 56,
				labels: ["agent:blocked"],
				owner: "jackmaders",
				repo: "watchpoint",
			});
			expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.stringContaining("⚠️ **Tickets Error:**"),
				}),
			);
		});
	});
});

describe("runTicketsWiring", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("errors without wiring anything when no valid proposal payload exists", async () => {
		// Arrange
		const ctx = buildCtx();
		mockIssue(ctx, { labelNames: ["tickets:proposed"] });
		mockComments(ctx, ["<!-- bot-comment -->\nNo payload here."]);

		// Act
		const act = runTicketsWiring(ctx);

		// Assert
		await expect(act).rejects.toThrow();
		expect(ctx.octokit.rest.issues.create).not.toHaveBeenCalled();
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith(
			expect.objectContaining({ labels: ["agent:blocked"] }),
		);
	});

	it("wires the proposed breakdown, posts a summary, and swaps tickets:proposed for tickets:wired", async () => {
		// Arrange
		const ctx = buildCtx();
		const breakdown = fakeBreakdown();
		mockIssue(ctx, { labelNames: ["tickets:proposed", "ready-for-agent"] });
		mockComments(ctx, [
			`<!-- bot-comment -->\n<!-- tickets-payload: ${JSON.stringify(breakdown)} -->`,
		]);
		mockWiringPrerequisites(ctx);

		// Act
		await runTicketsWiring(ctx);

		// Assert
		expect(ctx.octokit.rest.issues.create).toHaveBeenCalled();
		expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.stringContaining("Tickets Wired"),
			}),
		);
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith(
			expect.objectContaining({ labels: ["tickets:wired"] }),
		);
	});

	it("removes ready-for-agent from the parent, and nothing else about the parent", async () => {
		// Arrange
		const ctx = buildCtx();
		const breakdown = fakeBreakdown();
		mockIssue(ctx, { labelNames: ["tickets:proposed", "ready-for-agent"] });
		mockComments(ctx, [
			`<!-- bot-comment -->\n<!-- tickets-payload: ${JSON.stringify(breakdown)} -->`,
		]);
		mockWiringPrerequisites(ctx);

		// Act
		await runTicketsWiring(ctx);

		// Assert
		expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith(
			expect.objectContaining({ name: "ready-for-agent" }),
		);
		expect(ctx.octokit.rest.issues.update).not.toHaveBeenCalledWith(
			expect.objectContaining({ issue_number: 56 }),
		);
	});

	it("labels a frontier ticket dev:needed through an AGENT_PAT-authenticated client", async () => {
		// Arrange
		const originalEnv = { ...process.env };
		process.env.AGENT_PAT = "pat-token";
		const ctx = buildCtx();
		const breakdown = fakeBreakdown([fakeTicket({ id: "T1" })]);
		mockIssue(ctx, { labelNames: ["tickets:proposed"] });
		mockComments(ctx, [
			`<!-- bot-comment -->\n<!-- tickets-payload: ${JSON.stringify(breakdown)} -->`,
		]);
		mockWiringPrerequisites(ctx);

		try {
			// Act
			await runTicketsWiring(ctx);

			// Assert
			expect(github.getOctokit).toHaveBeenCalledWith("pat-token");
			expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
				issue_number: 201,
				labels: ["dev:needed"],
				owner: "jackmaders",
				repo: "watchpoint",
			});
		} finally {
			process.env = originalEnv;
		}
	});

	it("falls back to a comment listing the frontier when AGENT_PAT is absent", async () => {
		// Arrange
		const originalEnv = { ...process.env };
		Reflect.deleteProperty(process.env, "AGENT_PAT");
		const ctx = buildCtx();
		const breakdown = fakeBreakdown([fakeTicket({ id: "T1" })]);
		mockIssue(ctx, { labelNames: ["tickets:proposed"] });
		mockComments(ctx, [
			`<!-- bot-comment -->\n<!-- tickets-payload: ${JSON.stringify(breakdown)} -->`,
		]);
		mockWiringPrerequisites(ctx);

		try {
			// Act
			await runTicketsWiring(ctx);

			// Assert
			expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.stringContaining("dev:needed"),
				}),
			);
			expect(ctx.octokit.rest.issues.addLabels).not.toHaveBeenCalledWith(
				expect.objectContaining({ labels: ["dev:needed"] }),
			);
		} finally {
			process.env = originalEnv;
		}
	});

	it("labels only the frontier ticket dev:needed, never one still gated by a blocker", async () => {
		// Arrange
		process.env.AGENT_PAT = "pat-token";
		const ctx = buildCtx();
		const t1 = fakeTicket({ id: "T1", title: "First" });
		const t2 = fakeTicket({ blockers: ["T1"], id: "T2", title: "Second" });
		mockIssue(ctx, { labelNames: ["tickets:proposed"] });
		mockComments(ctx, [
			`<!-- bot-comment -->\n<!-- tickets-payload: ${JSON.stringify(fakeBreakdown([t1, t2]))} -->`,
		]);
		mockWiringPrerequisites(ctx);
		vi.mocked(ctx.octokit.rest.issues.create).mockImplementation((async (
			params: unknown,
		) => {
			const isFirst = (params as { title: string }).title === "First";
			return {
				data: isFirst ? { id: 301, number: 201 } : { id: 302, number: 202 },
			};
		}) as unknown as typeof ctx.octokit.rest.issues.create);

		try {
			// Act
			await runTicketsWiring(ctx);

			// Assert
			expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
				issue_number: 201,
				labels: ["dev:needed"],
				owner: "jackmaders",
				repo: "watchpoint",
			});
			expect(ctx.octokit.rest.issues.addLabels).not.toHaveBeenCalledWith(
				expect.objectContaining({ issue_number: 202, labels: ["dev:needed"] }),
			);
		} finally {
			Reflect.deleteProperty(process.env, "AGENT_PAT");
		}
	});

	it("removes agent:in-progress once the happy path completes", async () => {
		// Arrange
		const ctx = buildCtx();
		const breakdown = fakeBreakdown();
		mockIssue(ctx, { labelNames: ["agent:in-progress", "tickets:proposed"] });
		mockComments(ctx, [
			`<!-- bot-comment -->\n<!-- tickets-payload: ${JSON.stringify(breakdown)} -->`,
		]);
		mockWiringPrerequisites(ctx);

		// Act
		await runTicketsWiring(ctx);

		// Assert
		expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
			issue_number: 56,
			name: "agent:in-progress",
			owner: "jackmaders",
			repo: "watchpoint",
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

	it("runs the proposal phase when triggered by the tickets:needed label (no COMMENT_BODY)", async () => {
		// Arrange
		process.env.GITHUB_TOKEN = "fake-token";
		process.env.ISSUE_NUMBER = "56";
		Reflect.deleteProperty(process.env, "COMMENT_BODY");
		const ctx = buildCtx();
		mockIssue(ctx, {});
		const { runAgent } = await import("../run-agent");
		vi.mocked(runAgent).mockResolvedValue(fakeResult(fakeBreakdown()));

		// Act
		await ticketsRun();

		// Assert
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith(
			expect.objectContaining({ labels: ["tickets:proposed"] }),
		);
	});

	it("also runs the proposal phase for an empty-string COMMENT_BODY — the label-triggered workflow's actual env shape", async () => {
		// Arrange
		// GitHub Actions has no way to omit an env key conditionally within one
		// step's `env:` block, so the real workflow sets COMMENT_BODY to ''
		// (not literally absent) on the label-triggered path.
		process.env.GITHUB_TOKEN = "fake-token";
		process.env.ISSUE_NUMBER = "56";
		process.env.COMMENT_BODY = "";
		const ctx = buildCtx();
		mockIssue(ctx, {});
		const { runAgent } = await import("../run-agent");
		vi.mocked(runAgent).mockResolvedValue(fakeResult(fakeBreakdown()));

		// Act
		await ticketsRun();

		// Assert
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith(
			expect.objectContaining({ labels: ["tickets:proposed"] }),
		);
	});

	it("runs the wiring phase when COMMENT_BODY matches /approve", async () => {
		// Arrange
		process.env.GITHUB_TOKEN = "fake-token";
		process.env.ISSUE_NUMBER = "56";
		process.env.COMMENT_BODY = "/approve";
		const ctx = buildCtx();
		const breakdown = fakeBreakdown();
		mockIssue(ctx, { labelNames: ["tickets:proposed"] });
		mockComments(ctx, [
			`<!-- bot-comment -->\n<!-- tickets-payload: ${JSON.stringify(breakdown)} -->`,
		]);
		mockWiringPrerequisites(ctx);

		// Act
		await ticketsRun();

		// Assert
		expect(ctx.octokit.rest.issues.create).toHaveBeenCalled();
	});

	it("does nothing when COMMENT_BODY doesn't match /approve", async () => {
		// Arrange
		process.env.GITHUB_TOKEN = "fake-token";
		process.env.ISSUE_NUMBER = "56";
		process.env.COMMENT_BODY = "Please merge tickets 2 and 3.";
		const ctx = buildCtx();

		// Act
		await ticketsRun();

		// Assert
		expect(ctx.octokit.rest.issues.get).not.toHaveBeenCalled();
	});

	it("does nothing when COMMENT_BODY is a bot's own comment", async () => {
		// Arrange
		process.env.GITHUB_TOKEN = "fake-token";
		process.env.ISSUE_NUMBER = "56";
		process.env.COMMENT_BODY = "<!-- bot-comment -->\n/approve";
		const ctx = buildCtx();

		// Act
		await ticketsRun();

		// Assert
		expect(ctx.octokit.rest.issues.get).not.toHaveBeenCalled();
	});

	it("defaults the issue number to 0 rather than throwing when ISSUE_NUMBER is unset", async () => {
		// Arrange
		process.env.GITHUB_TOKEN = "fake-token";
		Reflect.deleteProperty(process.env, "ISSUE_NUMBER");
		process.env.COMMENT_BODY = "";
		mockIssue(buildCtx(), {});
		const { runAgent } = await import("../run-agent");
		vi.mocked(runAgent).mockResolvedValue(fakeResult(fakeBreakdown()));

		// Act
		const act = ticketsRun();

		// Assert
		await expect(act).resolves.not.toThrow();
		expect(github.getOctokit).toHaveBeenCalledWith("fake-token");
	});
});
