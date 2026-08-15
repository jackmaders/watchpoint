import { describe, expect, it } from "vitest";
import { createMockIssueDAG, resolveFrontier } from "../frontier";
import type { CandidateIssue } from "../types";

describe("Frontier Dependency Resolver", () => {
	describe("createMockIssueDAG", () => {
		it("creates a linear dependency graph", () => {
			// Arrange
			const specs = [
				{ number: 1, title: "Step 1" },
				{ blockedBy: [1], number: 2, title: "Step 2" },
				{ blockedBy: [2], number: 3, title: "Step 3" },
			];

			// Act
			const issues = createMockIssueDAG(specs);

			// Assert
			expect(issues).toHaveLength(3);
			expect(issues[0].number).toBe(1);
			expect(issues[0].issueDependenciesSummary.blockedBy).toBe(0);
			expect(issues[1].number).toBe(2);
			expect(issues[1].issueDependenciesSummary.blockedBy).toBe(1);
			expect(issues[2].number).toBe(3);
			expect(issues[2].issueDependenciesSummary.blockedBy).toBe(1);
		});

		it("creates a diamond dependency graph with numeric blockedBy counts and defaults", () => {
			// Arrange
			const specs = [
				{ number: 10, title: "Root task" },
				{ blockedBy: [10], number: 20, title: "Branch A" },
				{ blockedBy: [10], number: 30, title: "Branch B" },
				{ blockedBy: [20, 30], number: 40, title: "Join task" },
				{ blockedBy: undefined, number: 50 },
			];

			// Act
			const issues = createMockIssueDAG(specs);

			// Assert
			expect(issues).toHaveLength(5);
			expect(issues[0].issueDependenciesSummary.blockedBy).toBe(0);
			expect(issues[1].issueDependenciesSummary.blockedBy).toBe(1);
			expect(issues[2].issueDependenciesSummary.blockedBy).toBe(1);
			expect(issues[3].issueDependenciesSummary.blockedBy).toBe(2);
			expect(issues[4].issueDependenciesSummary.blockedBy).toBe(0);
			expect(issues[4].title).toBe("Issue #50");
			expect(issues[0].labels).toEqual(["ready-for-agent"]);
			expect(issues[0].assignees).toEqual([]);
			expect(issues[0].body).toBe("");
		});

		it("supports custom assignees, labels, and createdAt in mock issues", () => {
			// Arrange
			const specs = [
				{
					assignees: ["octocat"],
					blockedBy: 3,
					body: "Detailed description",
					createdAt: "2026-08-01T10:00:00Z",
					labels: ["ready-for-agent", "enhancement"],
					number: 100,
					title: "Custom issue",
					url: "https://github.com/org/repo/issues/100",
				},
			];

			// Act
			const issues = createMockIssueDAG(specs);

			// Assert
			expect(issues[0]).toEqual({
				assignees: ["octocat"],
				body: "Detailed description",
				createdAt: "2026-08-01T10:00:00Z",
				issueDependenciesSummary: { blockedBy: 3 },
				labels: ["ready-for-agent", "enhancement"],
				number: 100,
				title: "Custom issue",
				url: "https://github.com/org/repo/issues/100",
			});
		});
	});

	describe("resolveFrontier", () => {
		it("returns unblocked and unclaimed issues in FIFO order by createdAt", () => {
			// Arrange
			const issues: CandidateIssue[] = [
				{
					assignees: [],
					body: "",
					createdAt: "2026-08-02T12:00:00Z",
					issueDependenciesSummary: { blockedBy: 0 },
					labels: ["ready-for-agent"],
					number: 2,
					title: "Second task",
				},
				{
					assignees: [],
					body: "",
					createdAt: "2026-08-01T12:00:00Z",
					issueDependenciesSummary: { blockedBy: 0 },
					labels: ["ready-for-agent"],
					number: 1,
					title: "First task",
				},
				{
					assignees: [],
					body: "",
					createdAt: "2026-08-03T12:00:00Z",
					issueDependenciesSummary: { blockedBy: 0 },
					labels: ["ready-for-agent"],
					number: 3,
					title: "Third task",
				},
			];

			// Act
			const frontier = resolveFrontier(issues);

			// Assert
			expect(frontier.map((i) => i.number)).toEqual([1, 2, 3]);
		});

		it("sorts by issue number ascending when createdAt is missing or identical", () => {
			// Arrange
			const issues: CandidateIssue[] = [
				{
					assignees: [],
					body: "",
					createdAt: "2026-08-01T12:00:00Z",
					issueDependenciesSummary: { blockedBy: 0 },
					labels: ["ready-for-agent"],
					number: 50,
					title: "Issue 50",
				},
				{
					assignees: [],
					body: "",
					createdAt: "2026-08-01T12:00:00Z",
					issueDependenciesSummary: { blockedBy: 0 },
					labels: ["ready-for-agent"],
					number: 20,
					title: "Issue 20",
				},
				{
					assignees: [],
					body: "",
					issueDependenciesSummary: { blockedBy: 0 },
					labels: ["ready-for-agent"],
					number: 30,
					title: "Issue 30",
				},
				{
					assignees: [],
					body: "",
					issueDependenciesSummary: { blockedBy: 0 },
					labels: ["ready-for-agent"],
					number: 10,
					title: "Issue 10",
				},
			];

			// Act
			const frontier = resolveFrontier(issues);

			// Assert
			expect(frontier.map((i) => i.number)).toEqual([20, 50, 10, 30]);
		});

		it("places items without createdAt after items with createdAt", () => {
			// Arrange
			const issues: CandidateIssue[] = [
				{
					assignees: [],
					body: "",
					issueDependenciesSummary: { blockedBy: 0 },
					labels: ["ready-for-agent"],
					number: 1,
					title: "No timestamp",
				},
				{
					assignees: [],
					body: "",
					createdAt: "2026-08-01T00:00:00Z",
					issueDependenciesSummary: { blockedBy: 0 },
					labels: ["ready-for-agent"],
					number: 2,
					title: "Has timestamp",
				},
			];

			// Act
			const frontier = resolveFrontier(issues);

			// Assert
			expect(frontier.map((i) => i.number)).toEqual([2, 1]);
		});

		it("filters out issues that have assignees", () => {
			// Arrange
			const issues = createMockIssueDAG([
				{ assignees: ["worker-1"], number: 1, title: "Claimed task" },
				{ assignees: [], number: 2, title: "Unclaimed task" },
			]);

			// Act
			const frontier = resolveFrontier(issues);

			// Assert
			expect(frontier).toHaveLength(1);
			expect(frontier[0].number).toBe(2);
		});

		it("filters out issues that are blocked by prerequisites", () => {
			// Arrange
			const issues = createMockIssueDAG([
				{ number: 1, title: "Root task" },
				{ blockedBy: [1], number: 2, title: "Blocked by 1" },
				{ blockedBy: [1, 2], number: 3, title: "Blocked by 1 and 2" },
			]);

			// Act
			const frontier = resolveFrontier(issues);

			// Assert
			expect(frontier).toHaveLength(1);
			expect(frontier[0].number).toBe(1);
		});

		it("returns empty frontier when all issues are blocked or claimed", () => {
			// Arrange
			const issues = createMockIssueDAG([
				{ assignees: ["agent-1"], number: 1, title: "Claimed root" },
				{ blockedBy: [1], number: 2, title: "Blocked child" },
			]);

			// Act
			const frontier = resolveFrontier(issues);

			// Assert
			expect(frontier).toEqual([]);
		});

		it("handles empty issues list gracefully", () => {
			// Arrange
			const issues: CandidateIssue[] = [];

			// Act
			const frontier = resolveFrontier(issues);

			// Assert
			expect(frontier).toEqual([]);
		});
	});
});
