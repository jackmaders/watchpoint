import { z } from "zod";
import type { ObjectOutput, OutputSpec } from "./output";

/**
 * Every schema the pipeline validates model output against, and the
 * `OUTPUTS` registry that ties a `Stage` to the schema it must produce (spec
 * §5.4). This module is the single source of truth: TypeScript types are
 * `z.infer`, enum unions are derived from the `as const` array or object
 * feeding `z.enum()`, and `Stage` is `keyof typeof OUTPUTS` — there is no
 * separate, hand-maintained list of stage names anywhere in the pipeline.
 */

// ---------------------------------------------------------------------------
// Shared enums — one `as const` array per enum; the TS union always comes
// from `z.infer`, never a hand-written `type X = "a" | "b"`.
// ---------------------------------------------------------------------------

/** AGENTS.md's commit format: `<type>(<scope>): <emoji> <description>`. */
export const CONVENTIONAL_COMMIT_TYPES = [
	"feat",
	"fix",
	"docs",
	"style",
	"refactor",
	"perf",
	"test",
	"build",
	"ci",
	"chore",
	"revert",
] as const;
export const ConventionalCommitTypeSchema = z.enum(CONVENTIONAL_COMMIT_TYPES);
export type ConventionalCommitType = z.infer<
	typeof ConventionalCommitTypeSchema
>;

/**
 * The real files under `.github/PULL_REQUEST_TEMPLATE/`. Hardcoded rather
 * than read from disk at import time, so a template rename and this schema
 * change land in the same reviewable diff; `schemas.spec.ts` asserts this
 * array still matches the directory exactly, the same drift check
 * `.agents/skills/UPSTREAM.md` runs for vendored skills (AGENTS.md, "Skill
 * vendoring").
 */
export const PR_TEMPLATE_NAMES = [
	"bugfix.md",
	"feature.md",
	"pull_request_template.md",
	"refactor.md",
] as const;
export const PrTemplateSchema = z.enum(PR_TEMPLATE_NAMES);
export type PrTemplate = z.infer<typeof PrTemplateSchema>;

/**
 * Only the two outcomes a model actually decides. Escalation is a fact the
 * workflow computes from the round-number labels already on the PR, not a
 * fact asked of the model (spec §5.4, "shape is not truth").
 */
export const REVIEW_VERDICTS = ["approved", "changes-requested"] as const;
export const ReviewVerdictSchema = z.enum(REVIEW_VERDICTS);
export type ReviewVerdict = z.infer<typeof ReviewVerdictSchema>;

// ---------------------------------------------------------------------------
// grill
// ---------------------------------------------------------------------------

export const GrillRoundSchema = z.object({
	frontierEmpty: z
		.boolean()
		.describe(
			"True once there is nothing left worth asking — the control signal that ends the grill loop.",
		),
	roundMarkdown: z
		.string()
		.min(1)
		.max(8000)
		.describe(
			"This round's numbered questions, each with a recommended answer, as markdown posted verbatim to the issue.",
		),
});
export type GrillRound = z.infer<typeof GrillRoundSchema>;

// ---------------------------------------------------------------------------
// spec
// ---------------------------------------------------------------------------

export const SeamSchema = z.object({
	name: z
		.string()
		.min(1)
		.max(200)
		.describe(
			"The seam's name — a module, function, or boundary the spec commits to testing against.",
		),
	rationale: z
		.string()
		.min(1)
		.max(1000)
		.describe("Why this seam, and not a narrower or wider one."),
});
export type Seam = z.infer<typeof SeamSchema>;

export const SpecSchema = z.object({
	outOfScope: z
		.array(z.string().min(1).max(300))
		.max(30)
		.describe(
			"Explicitly excluded work, so a later reader knows it was considered and declined.",
		),
	seams: z
		.array(SeamSchema)
		.max(30)
		.describe(
			"The test seams the spec commits to, named before implementation starts.",
		),
	specMarkdown: z
		.string()
		.min(1)
		.max(20000)
		.describe("The full specification markdown, published to the issue body."),
});
export type Spec = z.infer<typeof SpecSchema>;

// ---------------------------------------------------------------------------
// tickets — the highest-risk payload in the pipeline (spec §5.4)
// ---------------------------------------------------------------------------

export const TicketSchema = z.object({
	acceptanceCriteria: z
		.array(z.string().min(1).max(500))
		.min(1)
		.max(20)
		.describe(
			"At least one checkable condition that proves the ticket is done.",
		),
	blockers: z
		.array(z.string().min(1).max(64))
		.max(20)
		.describe(
			"Ids of other tickets in this same breakdown that must land first.",
		),
	id: z
		.string()
		.min(1)
		.max(64)
		.describe(
			"A model-generated key with no meaning outside this run — used only to wire blockers.",
		),
	implementationSteps: z
		.array(z.string().min(1).max(500))
		.max(30)
		.describe("An ordered outline of how to build this ticket."),
	title: z.string().min(1).max(200).describe("The ticket's title."),
	whatToBuild: z
		.string()
		.min(1)
		.max(4000)
		.describe(
			"What this ticket builds, in enough detail to implement without the parent spec open.",
		),
});
export type Ticket = z.infer<typeof TicketSchema>;

interface BlockerGraphNode {
	id: string;
	blockers: readonly string[];
}

/**
 * DFS cycle detection over the blocker graph. An id that appears in
 * `blockers` but was never declared is inert here — walking it just finds no
 * further blockers — because the sibling check in `TicketBreakdownSchema`
 * already reports an undeclared blocker on its own.
 */
function findBlockerCycle(
	tickets: readonly BlockerGraphNode[],
): string[] | null {
	const blockersById = new Map(
		tickets.map((ticket) => [ticket.id, ticket.blockers]),
	);
	const state = new Map<string, "visiting" | "done">();

	function visit(id: string, path: readonly string[]): string[] | null {
		if (state.get(id) === "done") return null;
		if (state.get(id) === "visiting") return [...path, id];

		state.set(id, "visiting");
		for (const blocker of blockersById.get(id) ?? []) {
			const found = visit(blocker, [...path, id]);
			if (found) return found;
		}
		state.set(id, "done");
		return null;
	}

	for (const ticket of tickets) {
		const cycle = visit(ticket.id, []);
		if (cycle) return cycle;
	}
	return null;
}

/**
 * The three cross-ticket semantic checks (spec §5.4) beyond individual-ticket
 * shape: every ticket id must be unique within the breakdown, every blocker
 * id must resolve within this same breakdown, and the blocker graph must be
 * acyclic. All three live in one `superRefine` so a failure here fails
 * `safeParse` for the whole payload — tickets are interdependent, so
 * accepting nine of ten would leave a dangling blocker reference.
 *
 * The uniqueness check matters beyond schema hygiene: `wiring.ts` keys a
 * `Map` by `ticket.id` to resolve blockers to real issue numbers. Without
 * this check, a duplicate id would pass validation and then silently drop
 * one of the two tickets from `topologicalSortTickets`'s output — no error,
 * just a ticket that never gets created.
 */
export const TicketBreakdownSchema = z
	.object({
		tickets: z
			.array(TicketSchema)
			.min(1)
			.max(50)
			.describe(
				"A spec broken into vertical slices, each demoable on its own.",
			),
	})
	.superRefine((data, ctx) => {
		const seenIds = new Set<string>();
		data.tickets.forEach((ticket, ticketIndex) => {
			if (seenIds.has(ticket.id)) {
				ctx.addIssue({
					code: "custom",
					message: `Ticket id "${ticket.id}" is used by more than one ticket in this breakdown.`,
					path: ["tickets", ticketIndex, "id"],
				});
			}
			seenIds.add(ticket.id);
		});

		const declaredIds = new Set(data.tickets.map((ticket) => ticket.id));

		data.tickets.forEach((ticket, ticketIndex) => {
			ticket.blockers.forEach((blocker, blockerIndex) => {
				if (declaredIds.has(blocker)) return;
				ctx.addIssue({
					code: "custom",
					message: `Ticket "${ticket.id}" blocks on "${blocker}", which is not a declared ticket id.`,
					path: ["tickets", ticketIndex, "blockers", blockerIndex],
				});
			});
		});

		const cycle = findBlockerCycle(data.tickets);
		if (cycle) {
			ctx.addIssue({
				code: "custom",
				message: `The blocker graph contains a cycle: ${cycle.join(" -> ")}.`,
				path: ["tickets"],
			});
		}
	});
export type TicketBreakdown = z.infer<typeof TicketBreakdownSchema>;

// ---------------------------------------------------------------------------
// implement
// ---------------------------------------------------------------------------

export const PullRequestMetadataSchema = z.object({
	emoji: z
		.string()
		.min(1)
		.max(16)
		.describe(
			"The emoji for the commit/PR title, matching AGENTS.md's commit format.",
		),
	scope: z
		.string()
		.min(1)
		.max(100)
		.describe(
			"The conventional-commit scope — the slice or module this PR touches.",
		),
	template: PrTemplateSchema.describe(
		"Which file in .github/PULL_REQUEST_TEMPLATE/ this PR's body is structured against.",
	),
	title: z
		.string()
		.min(1)
		.max(200)
		.describe(
			"The PR title, in `<type>(<scope>): <emoji> <description>` format.",
		),
	type: ConventionalCommitTypeSchema.describe(
		"The conventional-commit type this PR's commits are shaped as.",
	),
});
export type PullRequestMetadata = z.infer<typeof PullRequestMetadataSchema>;

export const ImplementSchema = z.object({
	pr: PullRequestMetadataSchema,
	summary: z
		.string()
		.min(1)
		.max(4000)
		.describe(
			"What was built, for the PR description — commit count and validation status are measured, never reported here.",
		),
});
export type Implement = z.infer<typeof ImplementSchema>;

// ---------------------------------------------------------------------------
// review — both axes (Standards, Spec) share this shape
// ---------------------------------------------------------------------------

export const InlineCommentSchema = z.object({
	body: z.string().min(1).max(4000).describe("The comment's body."),
	line: z
		.int()
		.min(1)
		.describe(
			"The line number on the diff's RIGHT side this comment anchors to.",
		),
	path: z
		.string()
		.min(1)
		.max(500)
		.describe(
			"The file path this comment anchors to, exactly as it appears in the diff.",
		),
});
export type InlineComment = z.infer<typeof InlineCommentSchema>;

export const ReplySchema = z.object({
	body: z.string().min(1).max(4000).describe("The reply's body."),
	commentId: z
		.string()
		.min(1)
		.max(64)
		.describe("The id of the existing PR comment this replies to."),
});
export type Reply = z.infer<typeof ReplySchema>;

export const ReviewSchema = z.object({
	inlineComments: z
		.array(InlineCommentSchema)
		.max(50)
		.describe(
			"Findings anchored to real diff lines — pass through `filterReviewComments` before posting.",
		),
	replies: z
		.array(ReplySchema)
		.max(50)
		.describe("Replies to threads already on the PR."),
	summary: z
		.string()
		.min(1)
		.max(4000)
		.describe("This axis's top-level summary, posted as the review body."),
	verdict: ReviewVerdictSchema.describe(
		"This axis's outcome for the round — the workflow, not the model, decides escalation.",
	),
});
export type Review = z.infer<typeof ReviewSchema>;

/** A `${path}:${line}` composite key into the diff's valid-comment-line set. */
export function diffLineKey(path: string, line: number): string {
	return `${path}:${line}`;
}

/**
 * The semantic check for review comments (spec §5.4). Unlike the ticket
 * breakdown, an invalid comment is dropped individually rather than failing
 * the whole payload — review comments are independent of one another — and
 * the drop count is returned so it can be surfaced in the review body rather
 * than silently swallowed.
 */
export function filterReviewComments(
	comments: readonly InlineComment[],
	validLines: ReadonlySet<string>,
): { comments: InlineComment[]; droppedCount: number } {
	const kept = comments.filter((comment) =>
		validLines.has(diffLineKey(comment.path, comment.line)),
	);
	return { comments: kept, droppedCount: comments.length - kept.length };
}

// ---------------------------------------------------------------------------
// implement-pr — the fix round's thread replies
// ---------------------------------------------------------------------------

export const ImplementPrSchema = z.object({
	replies: z
		.array(ReplySchema)
		.max(50)
		.describe("Replies to the review threads this fix round addressed."),
	summary: z
		.string()
		.min(1)
		.max(4000)
		.describe("What changed in this fix round."),
});
export type ImplementPr = z.infer<typeof ImplementPrSchema>;

// ---------------------------------------------------------------------------
// research
// ---------------------------------------------------------------------------

export const SourceSchema = z.object({
	title: z.string().min(1).max(300).describe("The source's title."),
	url: z.url().max(500).describe("The source's URL."),
});
export type Source = z.infer<typeof SourceSchema>;

export const ResearchSchema = z.object({
	findingsMarkdown: z
		.string()
		.min(1)
		.max(20000)
		.describe("The findings, as markdown, for the findings file."),
	sources: z
		.array(SourceSchema)
		.max(50)
		.describe("Primary sources the findings cite."),
});
export type Research = z.infer<typeof ResearchSchema>;

// ---------------------------------------------------------------------------
// The registry. Adding a stage means adding one entry here — `Stage` and
// every downstream consumer (`models.ts`, the completeness test) follow from
// this object rather than being maintained alongside it.
// ---------------------------------------------------------------------------

export const OUTPUTS = {
	grill: { kind: "object", schema: GrillRoundSchema, tag: "round" },
	implement: { kind: "object", schema: ImplementSchema, tag: "implement" },
	"implement-pr": {
		kind: "object",
		schema: ImplementPrSchema,
		tag: "implement-pr",
	},
	ping: { kind: "prose" },
	research: { kind: "object", schema: ResearchSchema, tag: "research" },
	"review-spec": { kind: "object", schema: ReviewSchema, tag: "review" },
	"review-standards": { kind: "object", schema: ReviewSchema, tag: "review" },
	spec: { kind: "object", schema: SpecSchema, tag: "spec" },
	tickets: { kind: "object", schema: TicketBreakdownSchema, tag: "tickets" },
} as const satisfies Record<string, OutputSpec<unknown>>;

export type Stage = keyof typeof OUTPUTS;

/** The type a stage's `runAgent` call resolves to — `string` for a prose stage, its schema's inferred type otherwise. */
export type OutputOf<S extends Stage> =
	(typeof OUTPUTS)[S] extends ObjectOutput<infer T> ? T : string;
