import * as github from "@actions/github";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IssueContext } from "../github";
import type { Ticket, TicketBreakdown } from "../schemas";
import {
	buildChildIssueBody,
	type ExistingChildIssue,
	findMatchingChildIssue,
	getOrCreateMilestone,
	ticketKeyMarker,
	topologicalSortTickets,
	wireTickets,
} from "../wiring";

vi.mock("@actions/github");
vi.mock("../logger");

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

function buildCtx(): IssueContext {
	return {
		issueNumber: 56,
		octokit: github.getOctokit("fake-token"),
		owner: "jackmaders",
		repo: "watchpoint",
	};
}

describe("ticketKeyMarker", () => {
	it("renders the idempotency marker for a ticket id", () => {
		// Arrange
		// Act
		const marker = ticketKeyMarker("T1");

		// Assert
		expect(marker).toBe("<!-- spec-ticket-key: T1 -->");
	});
});

describe("topologicalSortTickets", () => {
	it("orders a linear chain so blockers land before dependents", () => {
		// Arrange
		const t1 = fakeTicket({ id: "T1" });
		const t2 = fakeTicket({ blockers: ["T1"], id: "T2" });
		const t3 = fakeTicket({ blockers: ["T2"], id: "T3" });

		// Act
		const sorted = topologicalSortTickets([t3, t1, t2]);

		// Assert
		expect(sorted.map((t) => t.id)).toEqual(["T1", "T2", "T3"]);
	});

	it("orders a diamond so both branches land before the ticket they converge on", () => {
		// Arrange
		const t1 = fakeTicket({ id: "T1" });
		const t2 = fakeTicket({ blockers: ["T1"], id: "T2" });
		const t3 = fakeTicket({ blockers: ["T1"], id: "T3" });
		const t4 = fakeTicket({ blockers: ["T2", "T3"], id: "T4" });

		// Act
		const sorted = topologicalSortTickets([t4, t3, t2, t1]);
		const index = new Map(sorted.map((t, i) => [t.id, i]));

		// Assert
		expect(index.get("T1")).toBeLessThan(index.get("T2") as number);
		expect(index.get("T2")).toBeLessThan(index.get("T4") as number);
		expect(index.get("T3")).toBeLessThan(index.get("T4") as number);
	});

	it("keeps an unblocked, orphan ticket in the result exactly once", () => {
		// Arrange
		const orphan = fakeTicket({ id: "T9" });

		// Act
		const sorted = topologicalSortTickets([orphan]);

		// Assert
		expect(sorted).toEqual([orphan]);
	});

	it("ignores a blocker id that isn't declared in this same breakdown, rather than throwing", () => {
		// Arrange
		// TicketBreakdownSchema's superRefine already rejects this upstream —
		// this locks in that the sort itself degrades safely too.
		const ticket = fakeTicket({ blockers: ["does-not-exist"], id: "T1" });

		// Act
		const sorted = topologicalSortTickets([ticket]);

		// Assert
		expect(sorted).toEqual([ticket]);
	});
});

describe("findMatchingChildIssue", () => {
	const existing: ExistingChildIssue[] = [
		{
			body: "<!-- spec-ticket-key: T1 -->",
			id: 101,
			number: 201,
			state: "open",
			title: "Old title",
		},
		{
			body: "No marker here.",
			id: 102,
			number: 202,
			state: "open",
			title: "Do The Thing ",
		},
	];

	it("matches on the spec-ticket-key marker before anything else", () => {
		// Arrange
		const ticket = fakeTicket({
			id: "T1",
			title: "A completely different title",
		});

		// Act
		const match = findMatchingChildIssue(existing, new Set(), ticket);

		// Assert
		expect(match?.number).toBe(201);
	});

	it("falls back to a case- and whitespace-insensitive title match", () => {
		// Arrange
		const ticket = fakeTicket({ id: "T2", title: "do the thing" });

		// Act
		const match = findMatchingChildIssue(existing, new Set(), ticket);

		// Assert
		expect(match?.number).toBe(202);
	});

	it("returns undefined when nothing matches, so the caller creates a new issue", () => {
		// Arrange
		const ticket = fakeTicket({
			id: "T3",
			title: "Something never seen before",
		});

		// Act
		const match = findMatchingChildIssue(existing, new Set(), ticket);

		// Assert
		expect(match).toBeUndefined();
	});

	it("skips an existing issue that another ticket in this run already matched", () => {
		// Arrange
		const ticket = fakeTicket({
			id: "T1",
			title: "A completely different title",
		});

		// Act
		const match = findMatchingChildIssue(existing, new Set([201]), ticket);

		// Assert
		expect(match).toBeUndefined();
	});
});

describe("buildChildIssueBody", () => {
	it("renders the parent link, the idempotency marker, and every ticket field", () => {
		// Arrange
		const ticket = fakeTicket({
			acceptanceCriteria: ["Criterion one.", "Criterion two."],
			id: "T1",
			implementationSteps: ["Step one.", "Step two."],
			whatToBuild: "The full thing.",
		});

		// Act
		const body = buildChildIssueBody(56, ticket, []);

		// Assert
		expect(body).toBe(
			`## Parent

Part of #56.

<!-- spec-ticket-key: T1 -->

## What to build

The full thing.

## Implementation steps

1. Step one.
2. Step two.

## Acceptance criteria

- [ ] Criterion one.
- [ ] Criterion two.

## Blocked by

None — can start immediately.`,
		);
	});

	it("lists resolved blocker issue numbers as GitHub references", () => {
		// Arrange
		const ticket = fakeTicket({ blockers: ["T1", "T2"] });

		// Act
		const body = buildChildIssueBody(56, ticket, [201, 202]);

		// Assert
		expect(body).toContain("## Blocked by\n\n- #201\n- #202");
	});
});

describe("getOrCreateMilestone", () => {
	it("creates a new milestone when none matches this spec's prefix", async () => {
		// Arrange
		const ctx = buildCtx();
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

		// Act
		const milestoneNumber = await getOrCreateMilestone(
			ctx,
			56,
			"Ticket breakdown",
		);

		// Assert
		expect(ctx.octokit.rest.issues.createMilestone).toHaveBeenCalledWith({
			owner: "jackmaders",
			repo: "watchpoint",
			title: "[Spec #56] Ticket breakdown",
		});
		expect(milestoneNumber).toBe(5);
	});

	it("reuses an existing milestone matching this spec's prefix rather than creating a duplicate", async () => {
		// Arrange
		const ctx = buildCtx();
		vi.mocked(ctx.octokit.rest.issues.listMilestones).mockResolvedValue({
			data: [{ number: 7, title: "[Spec #56] Ticket breakdown" }],
		} as unknown as Awaited<
			ReturnType<typeof ctx.octokit.rest.issues.listMilestones>
		>);

		// Act
		const milestoneNumber = await getOrCreateMilestone(
			ctx,
			56,
			"Ticket breakdown",
		);

		// Assert
		expect(ctx.octokit.rest.issues.createMilestone).not.toHaveBeenCalled();
		expect(milestoneNumber).toBe(7);
	});

	it("renames a reused milestone whose title has drifted from the parent's current title", async () => {
		// Arrange
		const ctx = buildCtx();
		vi.mocked(ctx.octokit.rest.issues.listMilestones).mockResolvedValue({
			data: [{ number: 7, title: "[Spec #56] Old title" }],
		} as unknown as Awaited<
			ReturnType<typeof ctx.octokit.rest.issues.listMilestones>
		>);

		// Act
		await getOrCreateMilestone(ctx, 56, "New title");

		// Assert
		expect(ctx.octokit.rest.issues.updateMilestone).toHaveBeenCalledWith({
			milestone_number: 7,
			owner: "jackmaders",
			repo: "watchpoint",
			title: "[Spec #56] New title",
		});
	});
});

describe("wireTickets", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	/**
	 * Resets `addSubIssue`/`addBlockedByDependency` back to their default
	 * resolved value too, not just the paginate/milestone calls every test
	 * needs — `clearMocks` (vitest.config.ts) resets call history between
	 * tests but not a previous test's `mockRejectedValue`, and this shared
	 * `__mocks__/@actions/github.ts` object is one instance for the whole
	 * file. Without this, a later test can silently inherit an earlier one's
	 * "already exists" or "500" rejection.
	 */
	function mockNoExistingChildIssues(ctx: IssueContext): void {
		vi.mocked(ctx.octokit.paginate).mockResolvedValue([]);
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
		vi.mocked(ctx.octokit.rest.issues.addSubIssue).mockResolvedValue(
			{} as unknown as Awaited<
				ReturnType<typeof ctx.octokit.rest.issues.addSubIssue>
			>,
		);
		vi.mocked(ctx.octokit.rest.issues.addBlockedByDependency).mockResolvedValue(
			{} as unknown as Awaited<
				ReturnType<typeof ctx.octokit.rest.issues.addBlockedByDependency>
			>,
		);
	}

	function breakdown(tickets: Ticket[]): TicketBreakdown {
		return { tickets };
	}

	it("creates a new sub-issue for every ticket with no existing match", async () => {
		// Arrange
		const ctx = buildCtx();
		mockNoExistingChildIssues(ctx);
		vi.mocked(ctx.octokit.rest.issues.create).mockResolvedValue({
			data: { id: 301, number: 201 },
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.create>>);

		// Act
		await wireTickets(
			ctx,
			{ number: 56, title: "Ticket breakdown" },
			breakdown([fakeTicket()]),
		);

		// Assert
		expect(ctx.octokit.rest.issues.create).toHaveBeenCalledWith(
			expect.objectContaining({
				labels: [],
				milestone: 5,
				owner: "jackmaders",
				repo: "watchpoint",
				title: "Do the thing",
			}),
		);
	});

	it("links every newly created ticket as a native sub-issue of the parent", async () => {
		// Arrange
		const ctx = buildCtx();
		mockNoExistingChildIssues(ctx);
		vi.mocked(ctx.octokit.rest.issues.create).mockResolvedValue({
			data: { id: 301, number: 201 },
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.create>>);

		// Act
		await wireTickets(
			ctx,
			{ number: 56, title: "Ticket breakdown" },
			breakdown([fakeTicket()]),
		);

		// Assert
		expect(ctx.octokit.rest.issues.addSubIssue).toHaveBeenCalledWith({
			issue_number: 56,
			owner: "jackmaders",
			repo: "watchpoint",
			sub_issue_id: 301,
		});
	});

	it("wires a blocked ticket's dependency using the blocker's numeric database id, not its issue number", async () => {
		// Arrange
		const ctx = buildCtx();
		mockNoExistingChildIssues(ctx);
		vi.mocked(ctx.octokit.rest.issues.create).mockImplementation((async (
			params: unknown,
		) => {
			const created =
				(params as { title: string }).title === "First"
					? { id: 301, number: 201 }
					: { id: 302, number: 202 };
			return { data: created };
		}) as unknown as typeof ctx.octokit.rest.issues.create);
		const t1 = fakeTicket({ id: "T1", title: "First" });
		const t2 = fakeTicket({ blockers: ["T1"], id: "T2", title: "Second" });

		// Act
		await wireTickets(
			ctx,
			{ number: 56, title: "Ticket breakdown" },
			breakdown([t1, t2]),
		);

		// Assert
		expect(ctx.octokit.rest.issues.addBlockedByDependency).toHaveBeenCalledWith(
			{
				issue_id: 301,
				issue_number: 202,
				owner: "jackmaders",
				repo: "watchpoint",
			},
		);
	});

	it("processes tickets in dependency order, so a dependent is created after its blocker", async () => {
		// Arrange
		const ctx = buildCtx();
		mockNoExistingChildIssues(ctx);
		const createOrder: string[] = [];
		vi.mocked(ctx.octokit.rest.issues.create).mockImplementation((async (
			params: unknown,
		) => {
			createOrder.push((params as { title: string }).title);
			return { data: { id: 301, number: 201 } };
		}) as unknown as typeof ctx.octokit.rest.issues.create);
		const t1 = fakeTicket({ id: "T1", title: "First" });
		const t2 = fakeTicket({ blockers: ["T1"], id: "T2", title: "Second" });

		// Act — blocker passed second in the input array, on purpose
		await wireTickets(
			ctx,
			{ number: 56, title: "Ticket breakdown" },
			breakdown([t2, t1]),
		);

		// Assert
		expect(createOrder).toEqual(["First", "Second"]);
	});

	it("updates a matched existing ticket's title, body, and milestone rather than creating a duplicate", async () => {
		// Arrange
		const ctx = buildCtx();
		vi.mocked(ctx.octokit.paginate).mockResolvedValue([
			{
				body: "<!-- spec-ticket-key: T1 -->",
				id: 301,
				number: 201,
				title: "Old title",
			},
		]);
		vi.mocked(ctx.octokit.rest.issues.listMilestones).mockResolvedValue({
			data: [{ number: 5, title: "[Spec #56] Ticket breakdown" }],
		} as unknown as Awaited<
			ReturnType<typeof ctx.octokit.rest.issues.listMilestones>
		>);

		// Act
		await wireTickets(
			ctx,
			{ number: 56, title: "Ticket breakdown" },
			breakdown([fakeTicket()]),
		);

		// Assert
		expect(ctx.octokit.rest.issues.update).toHaveBeenCalledWith(
			expect.objectContaining({
				issue_number: 201,
				milestone: 5,
				title: "Do the thing",
			}),
		);
		expect(ctx.octokit.rest.issues.create).not.toHaveBeenCalled();
		expect(ctx.octokit.rest.issues.addSubIssue).not.toHaveBeenCalled();
	});

	it("does not touch a matched ticket's state, so a closed ticket stays closed", async () => {
		// Arrange
		const ctx = buildCtx();
		vi.mocked(ctx.octokit.paginate).mockResolvedValue([
			{
				body: "<!-- spec-ticket-key: T1 -->",
				id: 301,
				number: 201,
				title: "Old title",
			},
		]);
		vi.mocked(ctx.octokit.rest.issues.listMilestones).mockResolvedValue({
			data: [{ number: 5, title: "[Spec #56] Ticket breakdown" }],
		} as unknown as Awaited<
			ReturnType<typeof ctx.octokit.rest.issues.listMilestones>
		>);

		// Act
		await wireTickets(
			ctx,
			{ number: 56, title: "Ticket breakdown" },
			breakdown([fakeTicket()]),
		);

		// Assert
		expect(ctx.octokit.rest.issues.update).toHaveBeenCalledWith(
			expect.not.objectContaining({ state: expect.anything() }),
		);
	});

	it("treats a dependent as frontier once its matched, already-closed blocker resolves — not just 'declares no blockers'", async () => {
		// Arrange
		// A re-run scenario: T1 was completed and closed since the last wire,
		// but the breakdown still lists it as T2's blocker. isFrontier must
		// read T1's real, current state, not just "T2.blockers is non-empty".
		const ctx = buildCtx();
		vi.mocked(ctx.octokit.paginate).mockResolvedValue([
			{
				body: "<!-- spec-ticket-key: T1 -->",
				id: 301,
				number: 201,
				state: "closed",
				title: "First",
			},
		]);
		vi.mocked(ctx.octokit.rest.issues.listMilestones).mockResolvedValue({
			data: [{ number: 5, title: "[Spec #56] Ticket breakdown" }],
		} as unknown as Awaited<
			ReturnType<typeof ctx.octokit.rest.issues.listMilestones>
		>);
		vi.mocked(ctx.octokit.rest.issues.create).mockResolvedValue({
			data: { id: 302, number: 202 },
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.create>>);
		const t1 = fakeTicket({ id: "T1", title: "First" });
		const t2 = fakeTicket({ blockers: ["T1"], id: "T2", title: "Second" });

		// Act
		const wired = await wireTickets(
			ctx,
			{ number: 56, title: "Ticket breakdown" },
			breakdown([t1, t2]),
		);

		// Assert
		expect(wired.find((ticket) => ticket.ticketId === "T2")?.isFrontier).toBe(
			true,
		);
	});

	it("treats a dependent as not-frontier while its matched blocker is still open", async () => {
		// Arrange
		const ctx = buildCtx();
		vi.mocked(ctx.octokit.paginate).mockResolvedValue([
			{
				body: "<!-- spec-ticket-key: T1 -->",
				id: 301,
				number: 201,
				state: "open",
				title: "First",
			},
		]);
		vi.mocked(ctx.octokit.rest.issues.listMilestones).mockResolvedValue({
			data: [{ number: 5, title: "[Spec #56] Ticket breakdown" }],
		} as unknown as Awaited<
			ReturnType<typeof ctx.octokit.rest.issues.listMilestones>
		>);
		vi.mocked(ctx.octokit.rest.issues.create).mockResolvedValue({
			data: { id: 302, number: 202 },
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.create>>);
		const t1 = fakeTicket({ id: "T1", title: "First" });
		const t2 = fakeTicket({ blockers: ["T1"], id: "T2", title: "Second" });

		// Act
		const wired = await wireTickets(
			ctx,
			{ number: 56, title: "Ticket breakdown" },
			breakdown([t1, t2]),
		);

		// Assert
		expect(wired.find((ticket) => ticket.ticketId === "T2")?.isFrontier).toBe(
			false,
		);
	});

	it("treats a newly created blocker as open, so its dependent isn't frontier on the same run", async () => {
		// Arrange
		const ctx = buildCtx();
		mockNoExistingChildIssues(ctx);
		vi.mocked(ctx.octokit.rest.issues.create).mockResolvedValue({
			data: { id: 301, number: 201 },
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.create>>);
		const t1 = fakeTicket({ id: "T1", title: "First" });
		const t2 = fakeTicket({ blockers: ["T1"], id: "T2", title: "Second" });

		// Act
		const wired = await wireTickets(
			ctx,
			{ number: 56, title: "Ticket breakdown" },
			breakdown([t1, t2]),
		);

		// Assert
		expect(wired.find((ticket) => ticket.ticketId === "T2")?.isFrontier).toBe(
			false,
		);
	});

	it("treats a bodyless existing sub-issue as having no marker, rather than throwing", async () => {
		// Arrange
		const ctx = buildCtx();
		vi.mocked(ctx.octokit.paginate).mockResolvedValue([
			{ id: 301, number: 201, title: "Do the thing" },
		]);
		vi.mocked(ctx.octokit.rest.issues.listMilestones).mockResolvedValue({
			data: [{ number: 5, title: "[Spec #56] Ticket breakdown" }],
		} as unknown as Awaited<
			ReturnType<typeof ctx.octokit.rest.issues.listMilestones>
		>);

		// Act
		await wireTickets(
			ctx,
			{ number: 56, title: "Ticket breakdown" },
			breakdown([fakeTicket()]),
		);

		// Assert — matched on title alone, since there was no body to carry a marker
		expect(ctx.octokit.rest.issues.update).toHaveBeenCalledWith(
			expect.objectContaining({ issue_number: 201 }),
		);
	});

	it("reports isNew and isFrontier accurately for the caller to act on", async () => {
		// Arrange
		const ctx = buildCtx();
		mockNoExistingChildIssues(ctx);
		vi.mocked(ctx.octokit.rest.issues.create).mockResolvedValue({
			data: { id: 301, number: 201 },
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.create>>);

		// Act
		const wired = await wireTickets(
			ctx,
			{ number: 56, title: "Ticket breakdown" },
			breakdown([fakeTicket({ id: "T1" })]),
		);

		// Assert
		expect(wired).toEqual([
			{
				isFrontier: true,
				isNew: true,
				number: 201,
				ticketId: "T1",
				title: "Do the thing",
			},
		]);
	});

	it("treats a ticket with declared blockers as not-frontier", async () => {
		// Arrange
		const ctx = buildCtx();
		mockNoExistingChildIssues(ctx);
		vi.mocked(ctx.octokit.rest.issues.create).mockResolvedValue({
			data: { id: 301, number: 201 },
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.create>>);
		const t1 = fakeTicket({ id: "T1" });
		const t2 = fakeTicket({ blockers: ["T1"], id: "T2" });

		// Act
		const wired = await wireTickets(
			ctx,
			{ number: 56, title: "Ticket breakdown" },
			breakdown([t1, t2]),
		);

		// Assert
		expect(wired.find((t) => t.ticketId === "T2")?.isFrontier).toBe(false);
	});

	it("tolerates the sub-issue link already existing (a re-run), rather than failing the whole wire", async () => {
		// Arrange
		const ctx = buildCtx();
		mockNoExistingChildIssues(ctx);
		vi.mocked(ctx.octokit.rest.issues.create).mockResolvedValue({
			data: { id: 301, number: 201 },
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.create>>);
		vi.mocked(ctx.octokit.rest.issues.addSubIssue).mockRejectedValue({
			status: 422,
		});

		// Act
		const act = wireTickets(
			ctx,
			{ number: 56, title: "Ticket breakdown" },
			breakdown([fakeTicket()]),
		);

		// Assert
		await expect(act).resolves.not.toThrow();
	});

	it("tolerates a blocker dependency already existing (a re-run), rather than failing the whole wire", async () => {
		// Arrange
		const ctx = buildCtx();
		mockNoExistingChildIssues(ctx);
		vi.mocked(ctx.octokit.rest.issues.create).mockResolvedValue({
			data: { id: 301, number: 201 },
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.create>>);
		vi.mocked(ctx.octokit.rest.issues.addBlockedByDependency).mockRejectedValue(
			{
				status: 422,
			},
		);
		const t1 = fakeTicket({ id: "T1" });
		const t2 = fakeTicket({ blockers: ["T1"], id: "T2" });

		// Act
		const act = wireTickets(
			ctx,
			{ number: 56, title: "Ticket breakdown" },
			breakdown([t1, t2]),
		);

		// Assert
		await expect(act).resolves.not.toThrow();
	});

	it("rethrows a sub-issue link failure that isn't the already-exists case", async () => {
		// Arrange
		const ctx = buildCtx();
		mockNoExistingChildIssues(ctx);
		vi.mocked(ctx.octokit.rest.issues.create).mockResolvedValue({
			data: { id: 301, number: 201 },
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.create>>);
		vi.mocked(ctx.octokit.rest.issues.addSubIssue).mockRejectedValue({
			status: 500,
		});

		// Act
		const act = wireTickets(
			ctx,
			{ number: 56, title: "Ticket breakdown" },
			breakdown([fakeTicket()]),
		);

		// Assert
		await expect(act).rejects.toEqual({ status: 500 });
	});

	it("rethrows a blocker-link failure that isn't the already-exists case", async () => {
		// Arrange
		const ctx = buildCtx();
		mockNoExistingChildIssues(ctx);
		vi.mocked(ctx.octokit.rest.issues.create).mockResolvedValue({
			data: { id: 301, number: 201 },
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.create>>);
		vi.mocked(ctx.octokit.rest.issues.addBlockedByDependency).mockRejectedValue(
			{
				status: 500,
			},
		);
		const t1 = fakeTicket({ id: "T1" });
		const t2 = fakeTicket({ blockers: ["T1"], id: "T2" });

		// Act
		const act = wireTickets(
			ctx,
			{ number: 56, title: "Ticket breakdown" },
			breakdown([t1, t2]),
		);

		// Assert
		await expect(act).rejects.toEqual({ status: 500 });
	});

	it("skips linking a blocker id that never resolved to a created or matched ref, rather than throwing", async () => {
		// Arrange
		// TicketBreakdownSchema's superRefine already rejects an undeclared
		// blocker id upstream — this locks in that wiring degrades safely too,
		// the same defensive shape as topologicalSortTickets.
		const ctx = buildCtx();
		mockNoExistingChildIssues(ctx);
		vi.mocked(ctx.octokit.rest.issues.create).mockResolvedValue({
			data: { id: 301, number: 201 },
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.create>>);
		const ticket = fakeTicket({ blockers: ["does-not-exist"], id: "T1" });

		// Act
		const act = wireTickets(
			ctx,
			{ number: 56, title: "Ticket breakdown" },
			breakdown([ticket]),
		);

		// Assert
		await expect(act).resolves.not.toThrow();
		expect(
			ctx.octokit.rest.issues.addBlockedByDependency,
		).not.toHaveBeenCalled();
	});
});
