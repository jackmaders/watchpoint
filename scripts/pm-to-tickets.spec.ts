import * as github from "@actions/github";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockGenerateContent } from "../__mocks__/@google/genai";
import {
	closeParentIssueIfSafe,
	createChildIssues,
	formatChildIssueBody,
	getOrCreateMilestone,
	parseTicketsFromAI,
	reviewAndUpdateChildIssues,
	run,
	TicketBreakdownSchema,
	topologicalSortTickets,
} from "./pm-to-tickets";

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
			expect(sorted.map((t) => t.id)).toEqual([
				"TICKET-1",
				"TICKET-2",
				"TICKET-3",
			]);
		});

		it("handles cycle gracefully without infinite loop", () => {
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
		it("formats issue body with parent reference, acceptance criteria, and blockers", () => {
			const body = formatChildIssueBody({
				acceptanceCriteria: ["Criteria 1", "Criteria 2"],
				blockers: ["#101"],
				parentNumber: 42,
				whatToBuild: "Build the auth form UI component",
			});

			expect(body).toContain("Parent: #42");
			expect(body).toContain("## What to build");
			expect(body).toContain("Build the auth form UI component");
			expect(body).toContain("- [ ] Criteria 1");
			expect(body).toContain("- [ ] Criteria 2");
			expect(body).toContain("## Blocked by");
			expect(body).toContain("- [ ] #101");
		});

		it("formats issue body with None when blockers array is empty", () => {
			const body = formatChildIssueBody({
				acceptanceCriteria: ["Criteria 1"],
				blockers: [],
				parentNumber: 42,
				whatToBuild: "Build the auth form UI component",
			});

			expect(body).toContain("None — can start immediately");
		});
	});

	describe("getOrCreateMilestone helper", () => {
		it("returns existing milestone if present", async () => {
			const octokit = github.getOctokit("token");
			vi.mocked(octokit.rest.issues.listMilestones).mockResolvedValue({
				data: [{ number: 5, state: "open", title: "[Spec] Feature X" }],
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
				"[Spec] Feature X",
			);

			expect(milestoneNumber).toBe(5);
			expect(octokit.rest.issues.createMilestone).not.toHaveBeenCalled();
		});

		it("creates new milestone if not existing", async () => {
			const octokit = github.getOctokit("token");
			vi.mocked(octokit.rest.issues.listMilestones).mockResolvedValue({
				data: [],
			} as unknown as Awaited<
				ReturnType<typeof octokit.rest.issues.listMilestones>
			>);
			vi.mocked(octokit.rest.issues.createMilestone).mockResolvedValue({
				data: { number: 10, title: "[Spec] New Feature" },
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
				"[Spec] New Feature",
			);

			expect(milestoneNumber).toBe(10);
			expect(octokit.rest.issues.createMilestone).toHaveBeenCalledWith({
				owner: "jackmaders",
				repo: "watchpoint",
				title: "[Spec] New Feature",
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

	describe("createChildIssues helper", () => {
		it("creates issues topologically in 1-pass and sets sub-issue links", async () => {
			const octokit = github.getOctokit("token");
			let callCount = 100;
			vi.mocked(octokit.rest.issues.create).mockImplementation(
				async (params) => {
					callCount++;
					return {
						data: {
							body: params?.body ?? "",
							id: callCount,
							labels: params?.labels ?? [],
							milestone: params?.milestone
								? { number: params.milestone }
								: null,
							node_id: `I_kw_child_${callCount}`,
							number: callCount,
							state: "open",
							title: params?.title ?? "",
						},
					} as unknown as Awaited<
						ReturnType<typeof octokit.rest.issues.create>
					>;
				},
			);

			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			const created = await createChildIssues({
				ctx,
				milestoneNumber: 1,
				parentNodeId: "I_kw_parent42",
				tickets: [
					{
						acceptanceCriteria: ["AC2"],
						blockers: ["TICKET-1"],
						id: "TICKET-2",
						title: "Ticket 2",
						whatToBuild: "Build 2",
					},
					{
						acceptanceCriteria: ["AC1"],
						blockers: [],
						id: "TICKET-1",
						title: "Ticket 1",
						whatToBuild: "Build 1",
					},
				],
			});

			expect(created).toHaveLength(2);
			expect(octokit.rest.issues.create).toHaveBeenCalledTimes(2);
			// Verify TICKET-2 was created with resolved #101 reference directly on creation
			expect(octokit.rest.issues.create).toHaveBeenLastCalledWith(
				expect.objectContaining({
					body: expect.stringContaining("#101"),
					title: "Ticket 2",
				}),
			);
			expect(octokit.graphql).toHaveBeenCalledTimes(2);
			// Verify octokit.rest.issues.update was NOT called (1-pass creation!)
			expect(octokit.rest.issues.update).not.toHaveBeenCalled();
		});
	});

	describe("reviewAndUpdateChildIssues helper", () => {
		it("updates existing matching child issues, creates new ones, and closes obsolete ones", async () => {
			const octokit = github.getOctokit("token");
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			const existingChildIssues = [
				{
					body: "Parent: #42\nOld body content",
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

			// Should update ticket 101
			expect(octokit.rest.issues.update).toHaveBeenCalledWith(
				expect.objectContaining({
					issue_number: 101,
					title: "Updated Ticket 1",
				}),
			);

			// Should close obsolete ticket 102
			expect(octokit.rest.issues.update).toHaveBeenCalledWith(
				expect.objectContaining({
					issue_number: 102,
					state: "closed",
					state_reason: "not_planned",
				}),
			);

			// Should post comment on ticket 102
			expect(octokit.rest.issues.createComment).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.stringContaining("obsolete"),
					issue_number: 102,
				}),
			);

			// Should create new ticket for TICKET-3
			expect(octokit.rest.issues.create).toHaveBeenCalledWith(
				expect.objectContaining({
					title: "Brand New Ticket 3",
				}),
			);
		});
	});

	describe("closeParentIssueIfSafe helper", () => {
		it("posts summary comment on parent issue without closing it", async () => {
			const octokit = github.getOctokit("token");
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			await closeParentIssueIfSafe({
				childIssues: [
					{ number: 101, title: "Ticket 1" },
					{ number: 102, title: "Ticket 2" },
				],
				ctx,
				milestoneTitle: "[Spec] Feature X",
				parentIssueNumber: 42,
			});

			expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
				body: expect.stringContaining("All 2 child issues created"),
				issue_number: 42,
				owner: "jackmaders",
				repo: "watchpoint",
			});

			expect(octokit.rest.issues.update).not.toHaveBeenCalled();
		});
	});

	describe("run integration workflow execution", () => {
		it("executes pm-to-tickets workflow end-to-end for new spec", async () => {
			const octokit = github.getOctokit("token");
			vi.mocked(octokit.rest.issues.get).mockResolvedValue({
				data: {
					body: "# [EPIC] Feature Spec\nSpec details...",
					labels: [{ name: "spec-ready" }],
					node_id: "I_kw_parent42",
					number: 42,
					title: "Feature Spec",
				},
			} as unknown as Awaited<ReturnType<typeof octokit.rest.issues.get>>);

			vi.mocked(octokit.paginate).mockResolvedValue([
				{ body: "User comment context", user: { type: "User" } },
			]);

			vi.mocked(octokit.rest.issues.listMilestones).mockResolvedValue({
				data: [],
			} as unknown as Awaited<
				ReturnType<typeof octokit.rest.issues.listMilestones>
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

			expect(octokit.rest.issues.get).toHaveBeenCalledWith({
				issue_number: 42,
				owner: "jackmaders",
				repo: "watchpoint",
			});
			expect(octokit.rest.issues.createMilestone).toHaveBeenCalled();
			expect(octokit.rest.issues.create).toHaveBeenCalled();
			expect(octokit.rest.issues.update).not.toHaveBeenCalledWith(
				expect.objectContaining({
					issue_number: 42,
					state: "closed",
				}),
			);
		});

		it("strips spec-ready label and exits without auto-close on issue reopened event", async () => {
			(github.context as { payload: unknown }).payload = {
				action: "reopened",
			};

			const octokit = github.getOctokit("token");
			vi.mocked(octokit.rest.issues.get).mockResolvedValue({
				data: {
					body: "Spec body",
					labels: [{ name: "spec-ready" }],
					node_id: "I_kw_parent42",
					number: 42,
					title: "Feature Spec",
				},
			} as unknown as Awaited<ReturnType<typeof octokit.rest.issues.get>>);

			await run();

			expect(octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
				issue_number: 42,
				name: "spec-ready",
				owner: "jackmaders",
				repo: "watchpoint",
			});

			expect(octokit.rest.issues.createComment).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.stringContaining("Removed `spec-ready` label"),
					issue_number: 42,
				}),
			);

			expect(octokit.rest.issues.createMilestone).not.toHaveBeenCalled();
			expect(octokit.rest.issues.create).not.toHaveBeenCalled();
		});

		it("skips execution if spec-ready label is missing", async () => {
			const octokit = github.getOctokit("token");
			vi.mocked(octokit.rest.issues.get).mockResolvedValue({
				data: {
					body: "Draft spec",
					labels: [{ name: "idea" }],
					node_id: "I_kw_parent42",
					number: 42,
					title: "Feature Spec",
				},
			} as unknown as Awaited<ReturnType<typeof octokit.rest.issues.get>>);

			await run();

			expect(octokit.rest.issues.createMilestone).not.toHaveBeenCalled();
			expect(octokit.rest.issues.create).not.toHaveBeenCalled();
		});

		it("posts formatted error comment on execution failure", async () => {
			const octokit = github.getOctokit("token");
			vi.mocked(octokit.rest.issues.get).mockRejectedValueOnce(
				new Error("GitHub API rate limit exceeded"),
			);

			await expect(run()).rejects.toThrow();

			expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
				body: expect.stringContaining("⚠️ **Spec-to-Tickets Agent Error:**"),
				issue_number: 42,
				owner: "jackmaders",
				repo: "watchpoint",
			});
			expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
				body: expect.stringContaining("GitHub API rate limit exceeded"),
				issue_number: 42,
				owner: "jackmaders",
				repo: "watchpoint",
			});
		});
	});
});
