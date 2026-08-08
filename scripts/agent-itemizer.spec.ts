import * as github from "@actions/github";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockGenerateContent } from "../__mocks__/@google/genai";
import {
	findMatchingChildIssue,
	formatChildIssueBody,
	getOrCreateMilestone,
	linkSingleBlocker,
	linkSubIssue,
	parseTicketsFromAI,
	postBreakdownSummaryComment,
	reviewAndUpdateChildIssues,
	run,
	TicketBreakdownSchema,
	topologicalSortTickets,
	zodToGeminiSchema,
} from "./agent-itemizer";

vi.mock("@actions/github");
vi.mock("@google/genai");

describe("pm-to-tickets unit tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.GITHUB_TOKEN = "fake-token";
		process.env.GEMINI_API_KEY = "fake-api-key";
		process.env.ISSUE_NUMBER = "42";
		delete (github.context as { payload?: unknown }).payload;
	});

	describe("zodToGeminiSchema helper", () => {
		it("converts TicketBreakdownSchema to Gemini JSON schema tree", () => {
			const schemaTree = zodToGeminiSchema(TicketBreakdownSchema) as {
				type: string;
				properties: { tickets: { type: string } };
			};
			expect(schemaTree.type).toBe("object");
			expect(schemaTree.properties.tickets.type).toBe("array");
		});
	});

	describe("Zod TicketBreakdownSchema validation", () => {
		it("validates valid ticket breakdown data", () => {
			const validData = {
				tickets: [
					{
						acceptanceCriteria: ["Criteria 1", "Criteria 2"],
						blockers: [],
						existingNumber: 101,
						id: "TICKET-1",
						title: "Setup Schema",
						whatToBuild: "Build Drizzle schema for user table",
					},
					{
						acceptanceCriteria: ["Criteria 3"],
						blockers: ["TICKET-1"],
						id: "TICKET-2",
						title: "Create User API",
						whatToBuild: "Build server action for creating users",
					},
				],
			};

			const parsed = TicketBreakdownSchema.parse(validData);
			expect(parsed.tickets).toHaveLength(2);
			expect(parsed.tickets[0].id).toBe("TICKET-1");
			expect(parsed.tickets[0].existingNumber).toBe(101);
		});

		it("throws validation error for invalid ticket data", () => {
			const invalidData = {
				tickets: [
					{
						id: "TICKET-1",
						title: "Missing fields",
					},
				],
			};

			expect(() => TicketBreakdownSchema.parse(invalidData)).toThrow();
		});
	});

	describe("topologicalSortTickets helper", () => {
		it("sorts tickets in dependency order", () => {
			const tickets = [
				{
					acceptanceCriteria: ["AC3"],
					blockers: ["TICKET-2"],
					id: "TICKET-3",
					title: "Ticket 3",
					whatToBuild: "Build 3",
				},
				{
					acceptanceCriteria: ["AC1"],
					blockers: [],
					id: "TICKET-1",
					title: "Ticket 1",
					whatToBuild: "Build 1",
				},
				{
					acceptanceCriteria: ["AC2"],
					blockers: ["TICKET-1"],
					id: "TICKET-2",
					title: "Ticket 2",
					whatToBuild: "Build 2",
				},
			];

			const sorted = topologicalSortTickets(tickets);
			expect(sorted).toHaveLength(3);
			expect(sorted.map((t) => t.id)).toEqual([
				"TICKET-1",
				"TICKET-2",
				"TICKET-3",
			]);
		});

		it("handles circular dependencies without crashing", () => {
			const tickets = [
				{
					acceptanceCriteria: ["AC1"],
					blockers: ["TICKET-2"],
					id: "TICKET-1",
					title: "Ticket 1",
					whatToBuild: "Build 1",
				},
				{
					acceptanceCriteria: ["AC2"],
					blockers: ["TICKET-1"],
					id: "TICKET-2",
					title: "Ticket 2",
					whatToBuild: "Build 2",
				},
			];

			const sorted = topologicalSortTickets(tickets);
			expect(sorted).toHaveLength(2);
		});
	});

	describe("formatChildIssueBody helper", () => {
		it("formats issue body with parent reference, metadata key, and acceptance criteria", () => {
			const body = formatChildIssueBody({
				acceptanceCriteria: ["Criteria 1", "Criteria 2"],
				parentNumber: 42,
				ticketId: "TICKET-1",
				whatToBuild: "Build the auth form UI component",
			});

			expect(body).toContain("Parent: #42");
			expect(body).toContain("<!-- spec-ticket-key: TICKET-1 -->");
			expect(body).toContain('## 1. Goal & Context ("What to Build")');
			expect(body).toContain("Build the auth form UI component");
			expect(body).toContain("- [ ] Criteria 1");
			expect(body).toContain("- [ ] Criteria 2");
			expect(body).toContain("## 6. Verification Commands");
			expect(body).not.toContain("Blocked By");
		});
	});

	describe("findMatchingChildIssue helper", () => {
		it("matches existing child issue by spec-ticket-key comment in body even if title changed", () => {
			const existingChildIssues = [
				{
					body: "Parent: #42\n<!-- spec-ticket-key: TICKET-1 -->\nSome old content",
					number: 101,
					title: "Old Database Title",
				},
			];

			const match = findMatchingChildIssue(existingChildIssues, new Set(), {
				acceptanceCriteria: [],
				blockers: [],
				id: "TICKET-1",
				title: "Completely New Database Title",
				whatToBuild: "Build DB",
			});

			expect(match).toBeDefined();
			expect(match?.number).toBe(101);
		});

		it("matches by existingNumber integer first if provided", () => {
			const existingChildIssues = [
				{
					body: "Parent: #42\n<!-- spec-ticket-key: TICKET-2 -->",
					number: 105,
					title: "Other Title",
				},
			];

			const match = findMatchingChildIssue(existingChildIssues, new Set(), {
				acceptanceCriteria: [],
				blockers: [],
				existingNumber: 105,
				id: "TICKET-1",
				title: "Title",
				whatToBuild: "Build",
			});

			expect(match).toBeDefined();
			expect(match?.number).toBe(105);
		});
	});

	describe("getOrCreateMilestone helper", () => {
		it("returns existing milestone if exact title matches", async () => {
			const octokit = github.getOctokit("token");
			vi.mocked(octokit.rest.issues.listMilestones).mockResolvedValue({
				data: [{ number: 5, state: "open", title: "[Spec #42] Feature X" }],
			} as unknown as Awaited<
				ReturnType<typeof octokit.rest.issues.listMilestones>
			>);

			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};
			const milestoneNumber = await getOrCreateMilestone(ctx, 42, "Feature X");

			expect(milestoneNumber).toBe(5);
			expect(octokit.rest.issues.createMilestone).not.toHaveBeenCalled();
			expect(octokit.rest.issues.updateMilestone).not.toHaveBeenCalled();
		});

		it("updates existing milestone title if issue title was edited", async () => {
			const octokit = github.getOctokit("token");
			vi.mocked(octokit.rest.issues.listMilestones).mockResolvedValue({
				data: [
					{ number: 5, state: "open", title: "[Spec #42] Old Feature Name" },
				],
			} as unknown as Awaited<
				ReturnType<typeof octokit.rest.issues.listMilestones>
			>);

			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};
			const milestoneNumber = await getOrCreateMilestone(
				ctx,
				42,
				"New Feature Name",
			);

			expect(milestoneNumber).toBe(5);
			expect(octokit.rest.issues.updateMilestone).toHaveBeenCalledWith({
				milestone_number: 5,
				owner: "jackmaders",
				repo: "watchpoint",
				title: "[Spec #42] New Feature Name",
			});
		});

		it("creates new milestone if none matches prefix", async () => {
			const octokit = github.getOctokit("token");
			vi.mocked(octokit.rest.issues.listMilestones).mockResolvedValue({
				data: [],
			} as unknown as Awaited<
				ReturnType<typeof octokit.rest.issues.listMilestones>
			>);
			vi.mocked(octokit.rest.issues.createMilestone).mockResolvedValue({
				data: { number: 10, title: "[Spec #42] New Feature" },
			} as unknown as Awaited<
				ReturnType<typeof octokit.rest.issues.createMilestone>
			>);

			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};
			const milestoneNumber = await getOrCreateMilestone(
				ctx,
				42,
				"New Feature",
			);

			expect(milestoneNumber).toBe(10);
			expect(octokit.rest.issues.createMilestone).toHaveBeenCalledWith({
				owner: "jackmaders",
				repo: "watchpoint",
				title: "[Spec #42] New Feature",
			});
		});
	});

	describe("parseTicketsFromAI helper", () => {
		it("calls Gemini with structured schema config and parses JSON response", async () => {
			const rawJson = JSON.stringify({
				tickets: [
					{
						acceptanceCriteria: ["AC 1"],
						blockers: [],
						id: "TICKET-1",
						title: "Ticket 1 Title",
						whatToBuild: "Build feature 1",
					},
				],
			});
			mockGenerateContent.mockResolvedValueOnce({ text: rawJson });

			const mockAi = new (await import("@google/genai")).GoogleGenAI({
				apiKey: "key",
			});
			const result = await parseTicketsFromAI(
				mockAi,
				"System Instruction",
				"Spec Content",
			);

			expect(result.tickets).toHaveLength(1);
			expect(result.tickets[0].title).toBe("Ticket 1 Title");
		});

		it("throws error if Gemini returns empty text", async () => {
			mockGenerateContent.mockResolvedValueOnce({ text: "" });
			const mockAi = new (await import("@google/genai")).GoogleGenAI({
				apiKey: "key",
			});

			await expect(
				parseTicketsFromAI(mockAi, "System Instruction", "Spec Content"),
			).rejects.toThrow("Gemini returned an empty or invalid response.");
		});
	});

	describe("linkSubIssue & linkSingleBlocker helpers", () => {
		it("calls GraphQL addSubIssue and handles errors gracefully", async () => {
			const octokit = github.getOctokit("token");
			vi.mocked(octokit.graphql).mockRejectedValueOnce(
				new Error("GraphQL Error"),
			);

			await expect(
				linkSubIssue(octokit, "I_kw_parent", "I_kw_child"),
			).resolves.not.toThrow();
			expect(octokit.graphql).toHaveBeenCalledWith(
				expect.stringContaining("addSubIssue"),
				expect.objectContaining({
					issueId: "I_kw_parent",
					subIssueId: "I_kw_child",
				}),
			);
		});

		it("calls GraphQL addBlockedBy and handles errors gracefully", async () => {
			const octokit = github.getOctokit("token");
			vi.mocked(octokit.graphql).mockRejectedValueOnce(
				new Error("GraphQL Error"),
			);

			await expect(
				linkSingleBlocker(octokit, "I_kw_target", "I_kw_blocker"),
			).resolves.not.toThrow();
			expect(octokit.graphql).toHaveBeenCalledWith(
				expect.stringContaining("addBlockedBy"),
				expect.objectContaining({
					blockedByIssueId: "I_kw_blocker",
					issueId: "I_kw_target",
				}),
			);
		});
	});

	describe("reviewAndUpdateChildIssues helper", () => {
		it("updates existing matching child issues, creates new ones, and links native blockers", async () => {
			const octokit = github.getOctokit("token");
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			const existingChildIssues = [
				{
					body: "Parent: #42\n<!-- spec-ticket-key: TICKET-1 -->\nOld body content",
					node_id: "I_kw_child101",
					number: 101,
					state: "open",
					title: "Old Ticket 1",
				},
				{
					body: "Parent: #42\nObsolete ticket content",
					node_id: "I_kw_child102",
					number: 102,
					state: "open",
					title: "Obsolete Ticket",
				},
			];

			const newTickets = [
				{
					acceptanceCriteria: ["Updated AC"],
					blockers: [],
					existingNumber: 101,
					id: "TICKET-1",
					title: "Updated Ticket 1",
					whatToBuild: "Updated build 1",
				},
				{
					acceptanceCriteria: ["New AC"],
					blockers: ["TICKET-1"],
					id: "TICKET-3",
					title: "Brand New Ticket 3",
					whatToBuild: "New build 3",
				},
			];

			await reviewAndUpdateChildIssues({
				ctx,
				existingChildIssues,
				milestoneNumber: 1,
				newTickets,
				parentNodeId: "I_kw_parent42",
			});

			expect(octokit.rest.issues.update).toHaveBeenCalledWith(
				expect.objectContaining({
					issue_number: 101,
					title: "Updated Ticket 1",
				}),
			);

			expect(octokit.rest.issues.update).toHaveBeenCalledWith(
				expect.objectContaining({
					issue_number: 102,
					state: "closed",
					state_reason: "not_planned",
				}),
			);

			expect(octokit.rest.issues.createComment).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.stringContaining("obsolete"),
					issue_number: 102,
				}),
			);

			expect(octokit.rest.issues.create).toHaveBeenCalledWith(
				expect.objectContaining({
					title: "Brand New Ticket 3",
				}),
			);

			expect(octokit.graphql).toHaveBeenCalledWith(
				expect.stringContaining("addBlockedBy"),
				expect.objectContaining({
					blockedByIssueId: "I_kw_child101",
				}),
			);
		});
	});

	describe("postBreakdownSummaryComment helper", () => {
		it("posts summary comment on parent issue without closing it", async () => {
			const octokit = github.getOctokit("token");
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			await postBreakdownSummaryComment({
				childIssues: [
					{ number: 101, title: "Ticket 1" },
					{ number: 102, title: "Ticket 2" },
				],
				ctx,
				milestoneTitle: "[Spec #42] Feature X",
				parentIssueNumber: 42,
			});

			expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
				body: expect.stringContaining("Specification Breakdown Complete!"),
				issue_number: 42,
				owner: "jackmaders",
				repo: "watchpoint",
			});
		});
	});

	describe("run integration workflow execution", () => {
		it("skips execution smoothly when issue does not have spec-ready label", async () => {
			const octokit = github.getOctokit("token");
			vi.mocked(octokit.rest.issues.get).mockResolvedValue({
				data: {
					body: "Issue Body",
					labels: [{ name: "idea" }],
					number: 42,
					title: "Feature Title",
				},
			} as unknown as Awaited<ReturnType<typeof octokit.rest.issues.get>>);
			vi.mocked(octokit.paginate).mockResolvedValue([]);

			await run();

			expect(octokit.rest.issues.addLabels).not.toHaveBeenCalled();
		});

		it("executes spec breakdown workflow when spec-ready label is present", async () => {
			const octokit = github.getOctokit("token");
			vi.mocked(octokit.rest.issues.get).mockResolvedValue({
				data: {
					body: "Specification text",
					labels: [{ name: "spec-ready" }],
					node_id: "I_kw_spec42",
					number: 42,
					title: "Spec Title",
				},
			} as unknown as Awaited<ReturnType<typeof octokit.rest.issues.get>>);
			vi.mocked(octokit.paginate).mockResolvedValue([]);
			vi.mocked(octokit.rest.issues.listMilestones).mockResolvedValue({
				data: [],
			} as unknown as Awaited<
				ReturnType<typeof octokit.rest.issues.listMilestones>
			>);
			vi.mocked(octokit.rest.issues.createMilestone).mockResolvedValue({
				data: { number: 1, title: "[Spec #42] Spec Title" },
			} as unknown as Awaited<
				ReturnType<typeof octokit.rest.issues.createMilestone>
			>);
			vi.mocked(octokit.rest.issues.listForRepo).mockResolvedValue({
				data: [],
			} as unknown as Awaited<
				ReturnType<typeof octokit.rest.issues.listForRepo>
			>);

			const rawJson = JSON.stringify({
				tickets: [
					{
						acceptanceCriteria: ["AC 1"],
						blockers: [],
						id: "TICKET-1",
						title: "Ticket 1 Title",
						whatToBuild: "Build feature 1",
					},
				],
			});
			mockGenerateContent.mockResolvedValueOnce({ text: rawJson });

			await run();

			expect(octokit.rest.issues.create).toHaveBeenCalledWith(
				expect.objectContaining({
					labels: ["dev-needed"],
					title: "Ticket 1 Title",
				}),
			);
		});

		it("handles issue reopening by removing spec-ready label", async () => {
			const octokit = github.getOctokit("token");
			(github.context as { payload?: { action?: string } }).payload = {
				action: "reopened",
			};

			vi.mocked(octokit.rest.issues.get).mockResolvedValue({
				data: {
					body: "Specification text",
					labels: [{ name: "spec-ready" }],
					number: 42,
					title: "Spec Title",
				},
			} as unknown as Awaited<ReturnType<typeof octokit.rest.issues.get>>);
			vi.mocked(octokit.paginate).mockResolvedValue([]);

			await run();

			expect(octokit.rest.issues.removeLabel).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "spec-ready",
				}),
			);
			expect(octokit.rest.issues.createComment).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.stringContaining("Issue Reopened"),
				}),
			);
		});

		it("posts formatted error comment on execution failure", async () => {
			const octokit = github.getOctokit("token");
			vi.mocked(octokit.rest.issues.get).mockRejectedValue(
				new Error("GitHub API rate limit exceeded"),
			);
			const exitSpy = vi
				.spyOn(process, "exit")
				.mockImplementation((() => {}) as never);

			await run();

			expect(octokit.rest.issues.createComment).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.stringContaining("GitHub API rate limit exceeded"),
				}),
			);
			expect(exitSpy).toHaveBeenCalledWith(1);
			exitSpy.mockRestore();
		});
	});
});
