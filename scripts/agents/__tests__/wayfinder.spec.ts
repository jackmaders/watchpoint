import * as github from "@actions/github";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IssueContext } from "../github";
import type { RunAgentResult } from "../run-agent";
import type { WayfinderOutput } from "../schemas";
import {
	buildWayfinderCompletionComment,
	buildWayfinderMapBody,
	buildWayfinderMapTitle,
	runWayfinderRound,
	run as wayfinderRun,
} from "../wayfinder";
import type { WayfinderMapRef, WiredWayfinderTicket } from "../wiring";

vi.mock("@actions/github");
vi.mock("../logger");
vi.mock("../run-agent");

function buildCtx(): IssueContext {
	return {
		issueNumber: 62,
		octokit: github.getOctokit("fake-token"),
		owner: "jackmaders",
		repo: "watchpoint",
	};
}

function plan(
	overrides: Partial<Extract<WayfinderOutput, { frontierEmpty: true }>> = {},
): Extract<WayfinderOutput, { frontierEmpty: true }> {
	return {
		destination: "A settled destination",
		frontierEmpty: true,
		notes: "Standing notes.",
		notYetSpecified: ["The final rollout shape."],
		outOfScope: ["Unrelated polish."],
		roundMarkdown: "The frontier is empty.",
		tickets: [
			{
				blockers: [],
				id: "research-api",
				question: "Which API is authoritative?",
				title: "Establish the authoritative API",
				type: "research",
			},
		],
		...overrides,
	};
}

function round(): Extract<WayfinderOutput, { frontierEmpty: false }> {
	return {
		frontierEmpty: false,
		roundMarkdown: "❓ **Q1** - **Destination**: What does done look like?",
	};
}

function result(output: WayfinderOutput): RunAgentResult<WayfinderOutput> {
	return {
		output,
		raw: "",
		sessionId: "session-1",
		usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
	};
}

function mockConversation(
	ctx: IssueContext,
	labels: string[] = ["wayfinder:needed"],
): void {
	vi.mocked(ctx.octokit.rest.issues.get).mockResolvedValue({
		data: {
			body: "The loose idea.",
			html_url: "https://github.com/jackmaders/watchpoint/issues/62",
			labels: labels.map((name) => ({ name })),
			number: 62,
			title: "A large effort",
		},
	} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.get>>);
	vi.mocked(ctx.octokit.paginate).mockResolvedValue([]);
}

function fakeWired(
	type: "research" | "task" = "research",
	isFrontier = true,
): WiredWayfinderTicket[] {
	return [
		{
			isFrontier,
			isNew: true,
			number: 63,
			ticketId: "research-api",
			title: "Establish the authoritative API",
			type,
		},
	];
}

describe("Wayfinder map rendering", () => {
	it("uses a deterministic title and keeps the decisions section empty", () => {
		// Arrange
		const output = plan();

		// Act
		const title = buildWayfinderMapTitle(output.destination);
		const body = buildWayfinderMapBody(output);

		// Assert
		expect(title).toBe("Wayfinder — A settled destination");
		expect(body).toContain("## Destination\n\nA settled destination");
		expect(body).toContain("## Notes\n\nStanding notes.");
		expect(body).toContain(
			"## Decisions so far\n\n<!-- wayfinder-decisions -->",
		);
		expect(body).toContain(
			"## Not yet specified\n\n- The final rollout shape.",
		);
		expect(body).toContain("## Out of scope\n\n- Unrelated polish.");
		expect(body).not.toContain("Establish the authoritative API");
	});

	it("renders title-linked ticket narration without bare issue references", () => {
		// Arrange
		const ctx = buildCtx();
		const map: WayfinderMapRef = {
			number: 100,
			title: "Wayfinder — A settled destination",
			url: "https://github.com/jackmaders/watchpoint/issues/100",
		};

		// Act
		const comment = buildWayfinderCompletionComment(ctx, map, fakeWired());

		// Assert
		expect(comment).toContain(
			"[Wayfinder — A settled destination](https://github.com/jackmaders/watchpoint/issues/100)",
		);
		expect(comment).toContain(
			"[Establish the authoritative API](https://github.com/jackmaders/watchpoint/issues/63)",
		);
		expect(comment).not.toMatch(/#[0-9]+/);
	});
});

describe("runWayfinderRound", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Reflect.deleteProperty(process.env, "AGENT_PAT");
	});

	it("posts a breadth-first round and waits with grill:waiting", async () => {
		// Arrange
		const ctx = buildCtx();
		mockConversation(ctx);
		const runner = vi.fn(async () => result(round()));

		// Act
		await runWayfinderRound(ctx, runner);

		// Assert
		expect(runner).toHaveBeenCalledWith(
			expect.objectContaining({
				output: expect.objectContaining({ tag: "wayfinder" }),
				promptArgs: {
					CONVERSATION: "User Context (Issue Body):\nThe loose idea.\n\n",
				},
				skills: ["wayfinder"],
			}),
		);
		expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith(
			expect.objectContaining({ body: expect.stringContaining("Q1") }),
		);
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith(
			expect.objectContaining({ labels: ["grill:waiting"] }),
		);
		expect(ctx.octokit.rest.issues.create).not.toHaveBeenCalled();
	});

	it("creates the map, wires tickets, and starts AFK research through AGENT_PAT", async () => {
		// Arrange
		process.env.AGENT_PAT = "pat-token";
		const ctx = buildCtx();
		mockConversation(ctx, ["wayfinder:needed", "grill:waiting"]);
		vi.mocked(ctx.octokit.rest.issues.create).mockResolvedValue({
			data: {
				html_url: "https://github.com/jackmaders/watchpoint/issues/100",
				number: 100,
				title: "Wayfinder — A settled destination",
			},
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.create>>);
		const runner = vi.fn(async () => result(plan()));
		const wire = vi.fn(async () => fakeWired());

		// Act
		await runWayfinderRound(ctx, runner, wire);

		// Assert
		expect(ctx.octokit.rest.issues.create).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.stringContaining("<!-- wayfinder-decisions -->"),
				labels: ["wayfinder:map"],
				title: "Wayfinder — A settled destination",
			}),
		);
		expect(wire).toHaveBeenCalledWith(
			ctx,
			{
				number: 100,
				title: "Wayfinder — A settled destination",
				url: "https://github.com/jackmaders/watchpoint/issues/100",
			},
			plan().tickets,
		);
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
			issue_number: 63,
			labels: ["research:needed"],
			owner: "jackmaders",
			repo: "watchpoint",
		});
		expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.stringContaining("Wayfinder map created"),
			}),
		);
		expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith(
			expect.objectContaining({ name: "grill:waiting" }),
		);
	});

	it("does not start research that is blocked by another decision ticket", async () => {
		// Arrange
		process.env.AGENT_PAT = "pat-token";
		const ctx = buildCtx();
		mockConversation(ctx, ["wayfinder:needed", "grill:waiting"]);
		vi.mocked(ctx.octokit.rest.issues.create).mockResolvedValue({
			data: {
				html_url: "https://github.com/jackmaders/watchpoint/issues/100",
				number: 100,
				title: "Wayfinder — A settled destination",
			},
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.create>>);
		const runner = vi.fn(async () => result(plan()));
		const wire = vi.fn(async () => fakeWired("research", false));

		// Act
		await runWayfinderRound(ctx, runner, wire);

		// Assert
		expect(ctx.octokit.rest.issues.addLabels).not.toHaveBeenCalledWith(
			expect.objectContaining({ labels: ["research:needed"] }),
		);
	});

	it("reports that research labels need manual application without AGENT_PAT", async () => {
		// Arrange
		const ctx = buildCtx();
		mockConversation(ctx);
		vi.mocked(ctx.octokit.rest.issues.create).mockResolvedValue({
			data: {
				html_url: "https://github.com/jackmaders/watchpoint/issues/100",
				number: 100,
				title: "Wayfinder — A settled destination",
			},
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.create>>);
		const runner = vi.fn(async () => result(plan()));
		const wire = vi.fn(async () => fakeWired());

		// Act
		await runWayfinderRound(ctx, runner, wire);

		// Assert
		expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.stringContaining("AGENT_PAT"),
			}),
		);
		expect(ctx.octokit.rest.issues.addLabels).not.toHaveBeenCalledWith(
			expect.objectContaining({ labels: ["research:needed"] }),
		);
	});

	it("uses deterministic fallbacks when the map has no title or URL", async () => {
		// Arrange
		const ctx = buildCtx();
		mockConversation(ctx);
		vi.mocked(ctx.octokit.rest.issues.create).mockResolvedValue({
			data: { number: 100 },
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.create>>);
		const runner = vi.fn(async () => result(plan()));
		const wire = vi.fn(async () => fakeWired("task"));

		// Act
		await runWayfinderRound(ctx, runner, wire);

		// Assert
		expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.stringContaining("Wayfinder — A settled destination"),
			}),
		);
		expect(ctx.octokit.rest.issues.addLabels).not.toHaveBeenCalledWith(
			expect.objectContaining({ labels: ["research:needed"] }),
		);
	});
});

describe("run", () => {
	it("builds its context from the workflow environment", async () => {
		// Arrange
		process.env.GITHUB_TOKEN = "fake-token";
		process.env.ISSUE_NUMBER = "62";
		const ctx = github.getOctokit("fake-token");
		vi.mocked(ctx.rest.issues.get).mockResolvedValue({
			data: {
				body: "The loose idea.",
				labels: [{ name: "wayfinder:needed" }],
				number: 62,
				title: "A large effort",
			},
		} as unknown as Awaited<ReturnType<typeof ctx.rest.issues.get>>);
		vi.mocked(ctx.rest.issues.create).mockResolvedValue({
			data: { number: 100, title: "Wayfinder — A settled destination" },
		} as unknown as Awaited<ReturnType<typeof ctx.rest.issues.create>>);
		const mockedRunAgent = vi.mocked((await import("../run-agent")).runAgent);
		mockedRunAgent.mockResolvedValue(result(plan()) as never);

		// Act
		await wayfinderRun();

		// Assert
		expect(mockedRunAgent).toHaveBeenCalled();
	});
});
