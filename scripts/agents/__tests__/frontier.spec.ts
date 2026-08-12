import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as github from "@actions/github";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	decideFrontier,
	type FrontierChildIssue,
	parseParentIssueNumber,
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
	vi.clearAllMocks();
});

describe("decideFrontier", () => {
	it("keeps a blocked child out of the frontier", () => {
		// Arrange
		const children = [child({ issue_dependencies_summary: { blocked_by: 1 } })];

		// Act
		const decision = decideFrontier(children);

		// Assert
		expect(decision.frontier).toEqual([]);
		expect(decision.parentComplete).toBe(false);
	});

	it("selects an open, unassigned child with no open blockers", () => {
		// Arrange
		const children = [child({ number: 102 })];

		// Act
		const decision = decideFrontier(children);

		// Assert
		expect(decision.frontier).toEqual(children);
		expect(decision.parentComplete).toBe(false);
	});

	it("keeps an unblocked child with an assignee out of the frontier", () => {
		// Arrange
		const children = [child({ assignees: [{ login: "maintainer" }] })];

		// Act
		const decision = decideFrontier(children);

		// Assert
		expect(decision.frontier).toEqual([]);
		expect(decision.parentComplete).toBe(false);
	});

	it("marks the parent complete when it has no open children", () => {
		// Arrange
		const children = [child({ state: "closed" })];

		// Act
		const decision = decideFrontier(children);

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
});

describe("runFrontier", () => {
	it("labels newly unblocked children through the PAT client", async () => {
		// Arrange
		process.env.AGENT_PAT = "pat-token";
		const ctx = buildContext();
		configureMergedPullRequest(ctx);
		vi.mocked(ctx.octokit.rest.issues.listSubIssues).mockResolvedValue([
			child({ number: 102 }),
		] as never);

		// Act
		await runFrontier(ctx, 77);

		// Assert
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
			issue_number: 102,
			labels: [LABELS.devNeeded],
			owner: "jackmaders",
			repo: "watchpoint",
		});
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
		expect(workflowContract).toContain("AGENT_PAT: ${{ secrets.AGENT_PAT }}");
		expect(workflowContract).toContain("bun scripts/agents/frontier.ts");
		expect(workflowContract).not.toContain("gh pr merge");
	});
});
