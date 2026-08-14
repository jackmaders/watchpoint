import { join } from "node:path";
import { runIfMain } from "./entrypoint";
import {
	fetchIssueContext,
	type IssueContext,
	isBotComment,
	issueContextFromEnv,
	LABELS,
	postBotComment,
	transitionState,
} from "./github";
import {
	type ObjectRunOptions,
	type RunAgentResult,
	runAgent,
} from "./run-agent";
import {
	OUTPUTS,
	type TicketBreakdown,
	TicketBreakdownSchema,
} from "./schemas";
import { chainLabels } from "./shared/chaining";
import { runStage } from "./stage";
import { type WiredTicket, wireTickets } from "./wiring";

const TICKETS_PROMPT_FILE = join(import.meta.dirname, "prompts", "tickets.md");
const TICKETS_PAYLOAD_PATTERN = /<!-- tickets-payload: ([\s\S]*?) -->/;

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			/** Set only when this run was triggered by an issue comment, not the `tickets:needed` label. */
			COMMENT_BODY?: string;
		}
	}
}

/**
 * Anchored to the start of a line, matching `dispatch.ts`'s `PING_COMMAND_REGEX`
 * — a stray "/approve" mentioned mid-sentence must never fire a mutation this
 * consequential (creating issues, a milestone, native dependencies).
 */
export const APPROVE_COMMAND_REGEX = /^\/approve\b/m;

export function matchesApproveCommand(commentBody: string): boolean {
	return APPROVE_COMMAND_REGEX.test(commentBody);
}

/** Tickets' proposal product is `TicketBreakdownSchema`, so it runs the object form of `runAgent`. */
type TicketsRunner = (
	options: ObjectRunOptions<TicketBreakdown>,
) => Promise<RunAgentResult<TicketBreakdown>>;

/**
 * The numbered quiz comment (spec §5.8's "quiz gate", the issue's "over-
 * decomposition is the most-reported friction on this skill"). The full,
 * schema-validated breakdown travels with it as a hidden payload — `/approve`
 * re-parses that payload rather than asking the model again, so approval
 * costs no further request and can never approve a *different* breakdown
 * than the one the maintainer actually read.
 */
export function buildProposalComment(breakdown: TicketBreakdown): string {
	const list = breakdown.tickets
		.map((ticket, index) => {
			const blockedBy =
				ticket.blockers.length > 0
					? ticket.blockers.join(", ")
					: "None — can start immediately";
			return `${index + 1}. **${ticket.title}**\n   ${ticket.whatToBuild}\n   - Blocked by: ${blockedBy}\n   - Acceptance criteria: ${ticket.acceptanceCriteria.length}`;
		})
		.join("\n\n");

	return `🎫 **Proposed Ticket Breakdown**

${list}

Reply \`/approve\` to create these as native sub-issues, in dependency order, with native blocking. To revise the breakdown instead — merge tickets, adjust the granularity — leave feedback in a comment, then re-add \`tickets:needed\` once you're ready for a fresh proposal.

<!-- tickets-payload: ${JSON.stringify(breakdown)} -->`;
}

/**
 * Re-validates against `TicketBreakdownSchema` on the way back out, not just
 * on the way in — defense in depth against a comment body edited by hand
 * between proposal and approval (spec §5.4, every payload is validated
 * before it can drive a mutation).
 */
export function extractTicketsPayload(
	commentBody: string,
): TicketBreakdown | null {
	const match = commentBody.match(TICKETS_PAYLOAD_PATTERN);
	if (!match) return null;

	let parsed: unknown;
	try {
		parsed = JSON.parse(match[1]);
	} catch {
		return null;
	}

	const result = TicketBreakdownSchema.safeParse(parsed);
	return result.success ? result.data : null;
}

/**
 * Only a bot-authored comment (the `<!-- bot-comment -->` marker, not
 * `user.type` — the `AGENT_PAT` used to post it isn't `user.type == "Bot"`,
 * spec §5.8) is trusted as a source of the payload, so a human pasting
 * payload-shaped text can never smuggle a fabricated breakdown into `/approve`.
 * Walked from the end since the latest proposal is the one `/approve` means.
 */
export function findLatestTicketsPayload(
	comments: readonly { body?: string | null }[],
): TicketBreakdown | null {
	for (let index = comments.length - 1; index >= 0; index--) {
		const body = comments[index].body ?? "";
		if (!isBotComment(body)) continue;
		const payload = extractTicketsPayload(body);
		if (payload) return payload;
	}
	return null;
}

export function buildWiredComment(wired: readonly WiredTicket[]): string {
	const lines = wired
		.map(
			(ticket) =>
				`- #${ticket.number} — ${ticket.title}${ticket.isNew ? "" : " (updated)"}`,
		)
		.join("\n");

	return `🎯 **Tickets Wired**\n\n${wired.length} ticket(s) created or updated as native sub-issues, in dependency order:\n\n${lines}`;
}

/**
 * `dev:needed` must fire `agent-implement.yml`, which a label applied with
 * the default `GITHUB_TOKEN` cannot do (spec §5.8) — mirrors `grill.ts`'s
 * `chainToSpec` and `spec.ts`'s `chainToTickets`, but against N child issues
 * instead of one parent, so the fallback comment lists every number a
 * maintainer would need to label by hand rather than naming just one.
 *
 * No empty-`frontier` guard: `TicketBreakdownSchema` requires at least one
 * ticket and rejects any blocker referencing an undeclared id (schemas.ts),
 * so a validated breakdown's blocker graph is a finite DAG — which always has
 * at least one ticket with no blockers. `frontier` empty here would mean a
 * payload already passed schema validation but isn't actually a DAG, which
 * is a contradiction, not a case to branch on.
 */
async function labelFrontierAsDevNeeded(
	ctx: IssueContext,
	wired: readonly WiredTicket[],
): Promise<void> {
	const frontier = wired.filter((ticket) => ticket.isFrontier);
	await chainLabels(ctx, {
		fallbackMessage: `🚦 Tickets are wired, but \`AGENT_PAT\` isn't configured, so I can't label the frontier automatically. Please add \`${LABELS.devNeeded}\` yourself to: ${frontier.map((ticket) => `#${ticket.number}`).join(", ")}.`,
		issueNumbers: frontier.map((ticket) => ticket.number),
		label: LABELS.devNeeded,
	});
}

/**
 * The propose half of the quiz gate (spec §5.8, design doc §3.6 Stage 4):
 * run `to-tickets`, post the numbered breakdown with its hidden payload, and
 * wait for `/approve`. Creates nothing — `wireTickets` runs only from
 * `runTicketsWiring`, never from here.
 */
export async function runTicketsProposal(
	ctx: IssueContext,
	runner: TicketsRunner = runAgent,
): Promise<void> {
	const { conversation, issue } = await fetchIssueContext(ctx);

	await runStage(
		ctx,
		issue.labels,
		{ removeOnEntry: [LABELS.ticketsNeeded], stageName: "Tickets" },
		async (labels) => {
			const result = await runner({
				output: OUTPUTS.tickets,
				promptArgs: { CONVERSATION: conversation },
				promptFile: TICKETS_PROMPT_FILE,
				skills: ["to-tickets"],
			});

			await postBotComment(ctx, buildProposalComment(result.output));

			return transitionState(ctx, labels, {
				add: [LABELS.ticketsProposed],
			});
		},
	);
}

/**
 * The approve half of the quiz gate: re-parse the already-approved payload
 * (no second model call), wire it deterministically via `wireTickets`, strip
 * `ready-for-agent` from the parent (the documented footgun — an AFK poller
 * that still sees it would try to build the whole spec in one run instead of
 * picking up the frontier slices), and label the frontier `dev:needed`.
 */
export async function runTicketsWiring(ctx: IssueContext): Promise<void> {
	const { comments, issue } = await fetchIssueContext(ctx);

	await runStage(
		ctx,
		issue.labels,
		// No `removeOnEntry`, unlike `runTicketsProposal`'s: this path only ever
		// runs from a comment while `tickets:proposed` is already present, by
		// which point the proposal phase has already removed `tickets:needed` —
		// removing it again here would be a no-op that reads as live cleanup
		// when it never fires.
		{ stageName: "Tickets" },
		async (labels) => {
			const breakdown = findLatestTicketsPayload(comments);
			if (!breakdown) {
				throw new Error(
					"No valid ticket breakdown found in this issue's comments — re-add tickets:needed to get a fresh proposal.",
				);
			}

			const wired = await wireTickets(
				ctx,
				{ number: issue.number, title: issue.title },
				breakdown,
			);

			await postBotComment(ctx, buildWiredComment(wired));

			const wiredLabels = await transitionState(ctx, labels, {
				add: [LABELS.ticketsWired],
				remove: [LABELS.ticketsProposed, LABELS.readyForAgent],
			});

			await labelFrontierAsDevNeeded(ctx, wired);
			return wiredLabels;
		},
	);
}

export async function run(): Promise<void> {
	const ctx = issueContextFromEnv();

	// Empty, not just unset: agent-tickets.yml's `env:` block always sets
	// COMMENT_BODY to *something*, even on the label-triggered run — GitHub
	// Actions has no way to conditionally omit a key within one step's `env:`
	// — so `''` on that path is what tells the two entry points apart here,
	// not strict `undefined`.
	const commentBody = process.env.COMMENT_BODY;
	if (!commentBody) {
		await runTicketsProposal(ctx);
		return;
	}

	if (isBotComment(commentBody) || !matchesApproveCommand(commentBody)) {
		return;
	}

	await runTicketsWiring(ctx);
}

runIfMain(import.meta.main, run);
