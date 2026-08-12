import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as github from "@actions/github";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	decideFrontier,
	type FrontierChildIssue,
	parseParentIssueNumber,
	run,
	runFrontier,
} from "../frontier";
import type { IssueContext } from "../github";
import { LABELS } from "../github";

vi.mock("@actions/github");
vi.mock("../logger");

const WORKFLOW_FILE = join(
	import.meta.dirname,
	"..",
	"..",
	"..",
	".github",
	"workflows",
	"agent-frontier.yml",
);

function child(
	overrides: Partial<FrontierChildIssue> = {},
): FrontierChildIssue {
	return {
		assignees: [],
		issue_dependencies_summary: { blocked_by: 0 },
		number: 101,
		state: "open",
		...overrides,
	};
}

function buildContext(): IssueContext {
	return {
		issueNumber: 77,
		octokit: github.getOctokit("fake-token"),
		owner: "jackmaders",
		repo: "watchpoint",
	};
}

function configureMergedPullRequest(ctx: IssueContext): void {
	vi.mocked(ctx.octokit.rest.pulls.get).mockResolvedValue({
		data: {
			body: "Closes #101",
			head: { ref: "agent/issue-101-frontier" },
		},
	} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.pulls.get>>);
	vi.mocked(ctx.octokit.rest.issues.get).mockResolvedValue({
		data: { body: "## Parent\n\nPart of #42.\n" },
	} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.get>>);
}

afterEach(() => {
	Reflect.deleteProperty(process.env, "AGENT_PAT");
	Reflect.deleteProperty(process.env, "GITHUB_TOKEN");
	Reflect.deleteProperty(process.env, "ISSUE_NUMBER");
	vi.clearAllMocks();
});

describe("decideFrontier", () => {
	it("keeps a blocked child out of the frontier", () => {
		// Arrange
		const children = [child({ issue_dependencies_summary: { blocked_by: 1 } })];

		// Act
		const decision = decideFrontier(children, new Set([101]));

		// Assert
		expect(decision.frontier).toEqual([]);
		expect(decision.parentComplete).toBe(false);
	});

	it("selects an open, unassigned child with no open blockers", () => {
		// Arrange
		const children = [child({ number: 102 })];

		// Act
		const decision = decideFrontier(children, new Set([102]));

		// Assert
		expect(decision.frontier).toEqual(children);
		expect(decision.parentComplete).toBe(false);
	});

	it("keeps an unblocked child with an assignee out of the frontier", () => {
		// Arrange
		const children = [child({ assignees: [{ login: "maintainer" }] })];

		// Act
		const decision = decideFrontier(children, new Set([101]));

		// Assert
		expect(decision.frontier).toEqual([]);
		expect(decision.parentComplete).toBe(false);
	});

	it("treats incomplete child metadata conservatively", () => {
		// Arrange
		const children = [
			child({ issue_dependencies_summary: null }),
			child({ assignees: null, number: 103 }),
		];

		// Act
		const decision = decideFrontier(children, new Set([103]));

		// Assert
		expect(decision.frontier).toEqual([children[1]]);
	});

	it("keeps an unrelated unblocked child out of the frontier", () => {
		// Arrange
		const children = [child({ number: 102 })];

		// Act
		const decision = decideFrontier(children, new Set([103]));

		// Assert
		expect(decision.frontier).toEqual([]);
		expect(decision.parentComplete).toBe(false);
	});

	it("marks the parent complete when it has no open children", () => {
		// Arrange
		const children = [child({ state: "closed" })];

		// Act
		const decision = decideFrontier(children, new Set());

		// Assert
		expect(decision.frontier).toEqual([]);
		expect(decision.parentComplete).toBe(true);
	});
});

describe("parseParentIssueNumber", () => {
	it("reads the parent reference written by ticket wiring", () => {
		// Arrange
		const body = "## Parent\n\nPart of #42.\n";

		// Act
		const parentNumber = parseParentIssueNumber(body);

		// Assert
		expect(parentNumber).toBe(42);
	});

	it("returns null when a ticket has no parent reference", () => {
		// Arrange
		const body = "A standalone ticket.";

		// Act
		const parentNumber = parseParentIssueNumber(body);

		// Assert
		expect(parentNumber).toBeNull();
	});

	it("returns null when the ticket body is missing", () => {
		// Arrange
		const body = null;

		// Act
		const parentNumber = parseParentIssueNumber(body);

		// Assert
		expect(parentNumber).toBeNull();
	});
});

describe("runFrontier", () => {
	it("ignores a merged pull request without an originating ticket", async () => {
		// Arrange
		const ctx = buildContext();
		vi.mocked(ctx.octokit.rest.pulls.get).mockResolvedValue({
			data: { body: "A manually created pull request.", head: { ref: "main" } },
		} as never);

		// Act
		const decision = await runFrontier(ctx, 77);

		// Assert
		expect(decision).toEqual({ frontier: [], parentComplete: false });
	});

	it("ignores a merged ticket that has no parent reference", async () => {
		// Arrange
		const ctx = buildContext();
		vi.mocked(ctx.octokit.rest.pulls.get).mockResolvedValue({
			data: {
				body: "Closes #101",
				head: { ref: "agent/issue-101-frontier" },
			},
		} as never);
		vi.mocked(ctx.octokit.rest.issues.get).mockResolvedValue({
			data: { body: "A standalone ticket." },
		} as never);

		// Act
		const decision = await runFrontier(ctx, 77);

		// Assert
		expect(decision).toEqual({ frontier: [], parentComplete: false });
	});

	it("labels newly unblocked children through the PAT client", async () => {
		// Arrange
		process.env.AGENT_PAT = "pat-token";
		const ctx = buildContext();
		configureMergedPullRequest(ctx);
		vi.mocked(ctx.octokit.rest.issues.listSubIssues).mockResolvedValue([
			child({ number: 102 }),
		] as never);
		vi.mocked(
			ctx.octokit.rest.issues.listDependenciesBlocking,
		).mockResolvedValue([{ number: 102 }] as never);

		// Act
		await runFrontier(ctx, 77);

		// Assert
		expect(
			ctx.octokit.rest.issues.listDependenciesBlocking,
		).toHaveBeenCalledWith({
			issue_number: 101,
			owner: "jackmaders",
			repo: "watchpoint",
		});
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
			issue_number: 102,
			labels: [LABELS.devNeeded],
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});

	it("leaves the frontier waiting when open children remain blocked", async () => {
		// Arrange
		const ctx = buildContext();
		configureMergedPullRequest(ctx);
		vi.mocked(ctx.octokit.rest.issues.listSubIssues).mockResolvedValue([
			child({ issue_dependencies_summary: { blocked_by: 1 } }),
		] as never);

		// Act
		const decision = await runFrontier(ctx, 77);

		// Assert
		expect(decision).toEqual({ frontier: [], parentComplete: false });
	});

	it("comments on and closes the parent when no open children remain", async () => {
		// Arrange
		const ctx = buildContext();
		configureMergedPullRequest(ctx);
		vi.mocked(ctx.octokit.rest.issues.listSubIssues).mockResolvedValue(
			[] as never,
		);

		// Act
		await runFrontier(ctx, 77);

		// Assert
		expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.stringContaining("Frontier complete"),
				issue_number: 42,
			}),
		);
		expect(ctx.octokit.rest.issues.update).toHaveBeenCalledWith({
			issue_number: 42,
			owner: "jackmaders",
			repo: "watchpoint",
			state: "closed",
			state_reason: "completed",
		});
	});

	it("comments with a manual fallback when the PAT is missing", async () => {
		// Arrange
		const ctx = buildContext();
		configureMergedPullRequest(ctx);
		vi.mocked(ctx.octokit.rest.issues.listSubIssues).mockResolvedValue([
			child({ number: 102 }),
		] as never);
		vi.mocked(
			ctx.octokit.rest.issues.listDependenciesBlocking,
		).mockResolvedValue([{ number: 102 }] as never);

		// Act
		await runFrontier(ctx, 77);

		// Assert
		expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.stringContaining("dev:needed"),
				issue_number: 101,
			}),
		);
	});

	it("builds its context from the workflow environment", async () => {
		// Arrange
		process.env.GITHUB_TOKEN = "fake-token";
		process.env.ISSUE_NUMBER = "77";
		const ctx = buildContext();
		configureMergedPullRequest(ctx);
		vi.mocked(ctx.octokit.rest.issues.listSubIssues).mockResolvedValue(
			[] as never,
		);

		// Act
		await run();

		// Assert
		expect(ctx.octokit.rest.issues.update).toHaveBeenCalledWith(
			expect.objectContaining({ issue_number: 42, state: "closed" }),
		);
	});
});

describe("agent-frontier workflow", () => {
	it("runs only after a merged pull request and passes AGENT_PAT", () => {
		// Arrange
		const workflow = readFileSync(WORKFLOW_FILE, "utf8");

		// Act
		const workflowContract = workflow;

		// Assert
		expect(workflowContract).toContain("pull_request:");
		expect(workflowContract).toContain("types: [closed]");
		expect(workflowContract).toContain(
			"github.event.pull_request.merged == true",
		);
		expect(workflowContract).toContain(
			"AGENT_PAT: $" + "{{ secrets.AGENT_PAT }}",
		);
		expect(workflowContract).toContain("bun scripts/agents/frontier.ts");
		expect(workflowContract).not.toContain("gh pr merge");
	});
});
