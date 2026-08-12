import { extractLabelNames, hasStatus, type IssueContext } from "./github";
import type {
	Ticket,
	TicketBreakdown,
	WayfinderTicket,
	WayfinderTicketType,
} from "./schemas";

/**
 * `agent-itemizer.ts`'s valuable half (spec §5.9), repurposed as a pure
 * post-processor over `to-tickets`' validated output. The model proposes a
 * breakdown; everything in this module is deterministic — the topological
 * sort, issue creation, native sub-issue linking, native blocking, and the
 * milestone. **The model never wires dependencies** — the plugin's own docs
 * record model-driven wiring as unreliable upstream (`mattpocock/skills#554`,
 * `#513`).
 *
 * `addSubIssue`/`addBlockedByDependency` are the current, stable, *typed*
 * REST endpoints (`POST .../sub_issues`, `POST .../dependencies/blocked_by`)
 * rather than the GraphQL mutations `agent-itemizer.ts` used — both REST
 * endpoints take a **numeric database id**, never a `#number` and never a
 * GraphQL node id. This is the single most-missed detail in the whole system
 * (design doc, docs/agents/issue-tracker.md's wayfinder section), and the old
 * GraphQL calls passed `node_id` where a database id was needed — silently
 * swallowed by their own `catch`-and-`logger.warn`. Nothing here reuses that
 * code; `refs` below tracks both the issue number (for body text and
 * `addSubIssue`'s parent) and the database id (for `addBlockedByDependency`)
 * precisely so the two are never confused again.
 */

export interface ExistingChildIssue {
	number: number;
	id: number;
	title: string;
	body: string | null;
	state: string;
	labels?: Array<string | { name?: string }>;
	htmlUrl?: string;
}

export interface WiredTicket {
	ticketId: string;
	number: number;
	title: string;
	isNew: boolean;
	/** Every declared blocker is closed (vacuously true when there are none) — eligible for `dev:needed` on this same run. */
	isFrontier: boolean;
}

export interface WayfinderIssueRef {
	number: number;
	title: string;
	url: string;
}

export interface WayfinderMapRef extends WayfinderIssueRef {}

export interface WiredWayfinderTicket extends WiredTicket {
	type: WayfinderTicketType;
}

/** The two identities every issue this module touches needs: the human-facing number (body text, `addSubIssue`'s parent) and the database id (`addBlockedByDependency`) — see the module doc comment on why both, and never `node_id`, are what's threaded through here. */
interface IssueRef {
	number: number;
	id: number;
	state: string;
}

/** A ticket's `id` is model-generated and has no meaning outside the run that produced it (schemas.ts), so it cannot be relied on to survive a re-run — only this marker, embedded in the child issue's own body, can. */
export function ticketKeyMarker(ticketId: string): string {
	return `<!-- spec-ticket-key: ${ticketId} -->`;
}

export function wayfinderTicketKeyMarker(ticketId: string): string {
	return `<!-- wayfinder-ticket-key: ${ticketId} -->`;
}

/**
 * Kahn-style DFS topological sort. `TicketBreakdownSchema`'s `superRefine`
 * (schemas.ts) already rejects a cyclic blocker graph before this function
 * ever sees one, so — unlike `agent-itemizer.ts`'s version — this carries no
 * ancestor-tracking cycle guard: `visited` alone is enough to terminate.
 */
function topologicalSortByBlockers<
	T extends { id: string; blockers: readonly string[] },
>(tickets: readonly T[]): T[] {
	const byId = new Map(tickets.map((ticket) => [ticket.id, ticket]));
	const sorted: T[] = [];
	const visited = new Set<string>();

	function visit(ticket: T): void {
		if (visited.has(ticket.id)) return;
		visited.add(ticket.id);
		for (const blockerId of ticket.blockers) {
			const blocker = byId.get(blockerId);
			if (blocker) visit(blocker);
		}
		sorted.push(ticket);
	}

	for (const ticket of tickets) visit(ticket);
	return sorted;
}

export function topologicalSortTickets(tickets: readonly Ticket[]): Ticket[] {
	return topologicalSortByBlockers(tickets);
}

export function topologicalSortWayfinderTickets(
	tickets: readonly WayfinderTicket[],
): WayfinderTicket[] {
	return topologicalSortByBlockers(tickets);
}

function normalizeTitle(title: string): string {
	return title.toLowerCase().trim();
}

/**
 * Idempotency across runs (spec §5.9, "the model never wires dependencies").
 * The marker match is checked first but will rarely hit — a ticket's `id` is
 * only meaningful for one run's own blocker graph, so a fresh `to-tickets`
 * call has no reason to reuse it. The title match is what actually carries
 * "re-running updates existing tickets rather than duplicating them": a
 * revised breakdown's titles are the one thing a maintainer and a
 * regenerating model both keep stable across a re-run.
 */
export function findMatchingChildIssue(
	existingChildIssues: readonly ExistingChildIssue[],
	matchedNumbers: ReadonlySet<number>,
	ticket: Ticket,
): ExistingChildIssue | undefined {
	return findMatchingIssue(
		existingChildIssues,
		matchedNumbers,
		ticketKeyMarker(ticket.id),
		ticket.title,
	);
}

export function findMatchingWayfinderChildIssue(
	existingChildIssues: readonly ExistingChildIssue[],
	matchedNumbers: ReadonlySet<number>,
	ticket: WayfinderTicket,
): ExistingChildIssue | undefined {
	return findMatchingIssue(
		existingChildIssues,
		matchedNumbers,
		wayfinderTicketKeyMarker(ticket.id),
		ticket.title,
	);
}

function findMatchingIssue(
	existingChildIssues: readonly ExistingChildIssue[],
	matchedNumbers: ReadonlySet<number>,
	marker: string,
	title: string,
): ExistingChildIssue | undefined {
	const available = existingChildIssues.filter(
		(issue) => !matchedNumbers.has(issue.number),
	);

	return (
		available.find((issue) => issue.body?.includes(marker)) ??
		available.find(
			(issue) => normalizeTitle(issue.title) === normalizeTitle(title),
		)
	);
}

/**
 * `blockerNumbers` are resolved GitHub issue numbers, not the ephemeral
 * `Ticket.id`s — the whole point of rendering "Blocked by" as `#<number>` is
 * that it's a real, clickable, auto-linked reference the same way native
 * issue dependencies already show it, matching the `<issue-template>` shape
 * `to-tickets`' own skill and this pipeline's other spec/ticket issues use
 * (`## Parent`, `## What to build`, `## Acceptance criteria`, `## Blocked by`).
 */
export function buildChildIssueBody(
	parentNumber: number,
	ticket: Ticket,
	blockerNumbers: readonly number[],
): string {
	const steps = ticket.implementationSteps
		.map((step, index) => `${index + 1}. ${step}`)
		.join("\n");
	const criteria = ticket.acceptanceCriteria
		.map((criterion) => `- [ ] ${criterion}`)
		.join("\n");
	const blockedBy =
		blockerNumbers.length > 0
			? blockerNumbers.map((number) => `- #${number}`).join("\n")
			: "None — can start immediately.";

	return `## Parent

Part of #${parentNumber}.

${ticketKeyMarker(ticket.id)}

## What to build

${ticket.whatToBuild}

## Implementation steps

${steps}

## Acceptance criteria

${criteria}

## Blocked by

${blockedBy}`;
}

export function buildWayfinderTicketBody(
	map: WayfinderMapRef,
	ticket: WayfinderTicket,
	blockers: readonly WayfinderIssueRef[],
): string {
	const blockedBy =
		blockers.length > 0
			? blockers
					.map((blocker) => `[${blocker.title}](${blocker.url})`)
					.join("\n")
			: "None — can start immediately.";

	return `## Map

[${map.title}](${map.url})

<!-- wayfinder-map: ${map.number} -->
${wayfinderTicketKeyMarker(ticket.id)}

## Question

${ticket.question}

## Blocked by

${blockedBy}`;
}

export function wayfinderTicketLabel(type: WayfinderTicketType): string {
	return `wayfinder:${type}`;
}

/**
 * One milestone per spec, matched by its `[Spec #<n>]` prefix so a parent
 * title edit renames the milestone instead of forking a second one.
 */
export async function getOrCreateMilestone(
	ctx: IssueContext,
	parentNumber: number,
	parentTitle: string,
): Promise<number> {
	const { octokit, owner, repo } = ctx;
	const title = `[Spec #${parentNumber}] ${parentTitle}`;
	const prefix = `[Spec #${parentNumber}]`;

	const { data: milestones } = await octokit.rest.issues.listMilestones({
		owner,
		repo,
		state: "all",
	});

	const existing = milestones.find((milestone) =>
		milestone.title.startsWith(prefix),
	);
	if (existing) {
		if (existing.title !== title) {
			await octokit.rest.issues.updateMilestone({
				milestone_number: existing.number,
				owner,
				repo,
				title,
			});
		}
		return existing.number;
	}

	const { data: created } = await octokit.rest.issues.createMilestone({
		owner,
		repo,
		title,
	});
	return created.number;
}

async function fetchExistingChildIssues(
	ctx: IssueContext,
	parentNumber: number,
): Promise<ExistingChildIssue[]> {
	const { octokit, owner, repo } = ctx;
	const issues = await octokit.paginate(octokit.rest.issues.listSubIssues, {
		issue_number: parentNumber,
		owner,
		repo,
	});
	return issues.map((issue) => ({
		body: issue.body ?? null,
		htmlUrl: issue.html_url,
		id: issue.id,
		labels: issue.labels,
		number: issue.number,
		state: issue.state,
		title: issue.title,
	}));
}

async function linkSubIssue(
	ctx: IssueContext,
	parentNumber: number,
	childId: number,
): Promise<void> {
	try {
		await ctx.octokit.rest.issues.addSubIssue({
			issue_number: parentNumber,
			owner: ctx.owner,
			repo: ctx.repo,
			sub_issue_id: childId,
		});
	} catch (error) {
		// GitHub reports 422 when the sub-issue link already exists — the
		// expected shape of a re-run, not a failure.
		if (!hasStatus(error, 422)) throw error;
	}
}

async function linkBlocker(
	ctx: IssueContext,
	issueNumber: number,
	blockerId: number,
): Promise<void> {
	try {
		await ctx.octokit.rest.issues.addBlockedByDependency({
			issue_id: blockerId,
			issue_number: issueNumber,
			owner: ctx.owner,
			repo: ctx.repo,
		});
	} catch (error) {
		// GitHub reports 422 when the blocking dependency already exists — the
		// expected shape of a re-run, not a failure.
		if (!hasStatus(error, 422)) throw error;
	}
}

/**
 * Creates or updates every ticket in the breakdown as a native sub-issue of
 * `parent`, wired in dependency order so a dependent's "Blocked by" section
 * and native blocking edge can always resolve to a real issue number — by
 * the time a ticket is processed, `topologicalSortTickets` guarantees every
 * ticket it blocks on has already been created or matched.
 *
 * Deliberately never sets `dev:needed` here, and never touches `state` or
 * an existing issue's labels: this function runs under the workflow's
 * default `GITHUB_TOKEN`, which cannot fire `agent-implement.yml` even if it
 * did apply the label (spec §5.8) — the caller labels the frontier
 * separately, through an `AGENT_PAT`-authenticated client, using the
 * `isFrontier` flag this function reports back. Leaving `state` alone means
 * a ticket a maintainer already closed stays closed across a re-run.
 */
export async function wireTickets(
	ctx: IssueContext,
	parent: { number: number; title: string },
	breakdown: TicketBreakdown,
): Promise<WiredTicket[]> {
	const { octokit, owner, repo } = ctx;
	const milestoneNumber = await getOrCreateMilestone(
		ctx,
		parent.number,
		parent.title,
	);
	const existingChildIssues = await fetchExistingChildIssues(
		ctx,
		parent.number,
	);
	const sorted = topologicalSortTickets(breakdown.tickets);

	const matchedNumbers = new Set<number>();
	const refs = new Map<string, IssueRef>();
	const wired: WiredTicket[] = [];

	for (const ticket of sorted) {
		// Vacuously true when `blockers` is empty — a ticket with none is
		// frontier by definition, the same case `.every()` returns `true` for
		// with no callback invocations. By dependency order every blocker this
		// ticket declares already has a `refs` entry with its real state.
		const isFrontier = ticket.blockers.every(
			(blockerId) => refs.get(blockerId)?.state === "closed",
		);
		const blockerNumbers = ticket.blockers
			.map((blockerId) => refs.get(blockerId)?.number)
			.filter((number): number is number => number !== undefined);
		const body = buildChildIssueBody(parent.number, ticket, blockerNumbers);
		const match = findMatchingChildIssue(
			existingChildIssues,
			matchedNumbers,
			ticket,
		);

		let ref: IssueRef;
		let isNew: boolean;

		if (match) {
			matchedNumbers.add(match.number);
			await octokit.rest.issues.update({
				body,
				issue_number: match.number,
				milestone: milestoneNumber,
				owner,
				repo,
				title: ticket.title,
			});
			ref = { id: match.id, number: match.number, state: match.state };
			isNew = false;
		} else {
			const { data: created } = await octokit.rest.issues.create({
				body,
				labels: [],
				milestone: milestoneNumber,
				owner,
				repo,
				title: ticket.title,
			});
			// A freshly created issue is always open — GitHub's own default,
			// not a param this call ever sets — so there's no response field
			// to read here that could disagree.
			ref = { id: created.id, number: created.number, state: "open" };
			isNew = true;
			await linkSubIssue(ctx, parent.number, created.id);
		}

		for (const blockerId of ticket.blockers) {
			const blockerRef = refs.get(blockerId);
			if (blockerRef) await linkBlocker(ctx, ref.number, blockerRef.id);
		}

		refs.set(ticket.id, ref);
		wired.push({
			isFrontier,
			isNew,
			number: ref.number,
			ticketId: ticket.id,
			title: ticket.title,
		});
	}

	return wired;
}

interface WayfinderRef {
	id: number;
	number: number;
	state: string;
	title: string;
	url: string;
}

function fallbackIssueUrl(ctx: IssueContext, number: number): string {
	return `https://github.com/${ctx.owner}/${ctx.repo}/issues/${number}`;
}

async function syncWayfinderTicketLabel(
	ctx: IssueContext,
	issueNumber: number,
	labels: Array<string | { name?: string }> | undefined,
	desiredLabel: string,
): Promise<void> {
	const currentWayfinderLabels = extractLabelNames(labels).filter((label) =>
		label.startsWith("wayfinder:"),
	);

	for (const label of currentWayfinderLabels) {
		if (label === desiredLabel) continue;
		await ctx.octokit.rest.issues.removeLabel({
			issue_number: issueNumber,
			name: label,
			owner: ctx.owner,
			repo: ctx.repo,
		});
	}

	if (!currentWayfinderLabels.includes(desiredLabel)) {
		await ctx.octokit.rest.issues.addLabels({
			issue_number: issueNumber,
			labels: [desiredLabel],
			owner: ctx.owner,
			repo: ctx.repo,
		});
	}
}

/**
 * Creates or updates Wayfinder decision tickets under a map. The model only
 * supplies titles, questions, types, and run-local blocker ids; this function
 * resolves those ids to real issue refs, creates native sub-issue links, and
 * adds native `blocked_by` edges in dependency order. Visible issue text
 * links to map and ticket titles, never bare issue numbers.
 */
export async function wireWayfinderTickets(
	ctx: IssueContext,
	map: WayfinderMapRef,
	tickets: readonly WayfinderTicket[],
): Promise<WiredWayfinderTicket[]> {
	const existingChildIssues = await fetchExistingChildIssues(ctx, map.number);
	const sorted = topologicalSortWayfinderTickets(tickets);
	const matchedNumbers = new Set<number>();
	const refs = new Map<string, WayfinderRef>();
	const wired: WiredWayfinderTicket[] = [];

	for (const ticket of sorted) {
		const blockerRefs = ticket.blockers
			.map((blockerId) => refs.get(blockerId))
			.filter((ref): ref is WayfinderRef => ref !== undefined);
		const isFrontier = ticket.blockers.every(
			(blockerId) => refs.get(blockerId)?.state === "closed",
		);
		const body = buildWayfinderTicketBody(map, ticket, blockerRefs);
		const desiredLabel = wayfinderTicketLabel(ticket.type);
		const match = findMatchingWayfinderChildIssue(
			existingChildIssues,
			matchedNumbers,
			ticket,
		);

		let ref: WayfinderRef;
		let isNew: boolean;

		if (match) {
			matchedNumbers.add(match.number);
			await ctx.octokit.rest.issues.update({
				body,
				issue_number: match.number,
				owner: ctx.owner,
				repo: ctx.repo,
				title: ticket.title,
			});
			await syncWayfinderTicketLabel(
				ctx,
				match.number,
				match.labels,
				desiredLabel,
			);
			ref = {
				id: match.id,
				number: match.number,
				state: match.state,
				title: ticket.title,
				url: match.htmlUrl ?? fallbackIssueUrl(ctx, match.number),
			};
			isNew = false;
		} else {
			const { data: created } = await ctx.octokit.rest.issues.create({
				body,
				labels: [desiredLabel],
				owner: ctx.owner,
				repo: ctx.repo,
				title: ticket.title,
			});
			ref = {
				id: created.id,
				number: created.number,
				state: "open",
				title: ticket.title,
				url: created.html_url ?? fallbackIssueUrl(ctx, created.number),
			};
			isNew = true;
			await linkSubIssue(ctx, map.number, created.id);
		}

		for (const blockerRef of blockerRefs) {
			await linkBlocker(ctx, ref.number, blockerRef.id);
		}

		refs.set(ticket.id, ref);
		wired.push({
			isFrontier,
			isNew,
			number: ref.number,
			ticketId: ticket.id,
			title: ticket.title,
			type: ticket.type,
		});
	}

	return wired;
}
