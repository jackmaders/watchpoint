import { join } from "node:path";
import * as github from "@actions/github";
import { runIfMain } from "./entrypoint";
import {
	extractLabelNames,
	fetchIssueContext,
	type IssueContext,
	LABELS,
	postBotComment,
	postIssueErrorComment,
	transitionState,
} from "./github";
import { MODELS } from "./models";
import {
	type ObjectRunOptions,
	type RunAgentResult,
	runAgent,
} from "./run-agent";
import { OUTPUTS, type Seam, type Spec } from "./schemas";

const SPEC_PROMPT_FILE = join(import.meta.dirname, "prompts", "spec.md");

const ORIGINAL_PROPOSAL_DETAILS_PATTERN =
	/<details>\s*<summary>📜 Original Issue Proposal<\/summary>\s*([\s\S]*?)\s*<\/details>/i;

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			GITHUB_TOKEN: string;
			ISSUE_NUMBER: string;
			AGENT_PAT?: string;
		}
	}
}

/** Spec's product is `SpecSchema`, so it runs the object form of `runAgent`. */
type SpecRunner = (
	options: ObjectRunOptions<Spec>,
) => Promise<RunAgentResult<Spec>>;

/**
 * `transitionState`'s label-array parameter, matching what `fetchIssueContext`
 * hands back on `issue.labels` — named here for the same reason `grill.ts`
 * names it: `chainToTickets`'s signature doesn't have to spell out octokit's
 * own label-response shape.
 */
type IssueLabels = Parameters<typeof transitionState>[1];

/**
 * Re-running `/to-spec` — a retry, or `spec:needed` re-added by hand — must
 * not nest a second `<details>` wrapper around the first. A body that has
 * already been published once has its original proposal inside that wrapper
 * already, so unwrapping it there returns the true original rather than the
 * prior run's full spec; a body that has never been published has no wrapper
 * to find, so it is returned unchanged. Mirrors the pre-pipeline
 * `extractOriginalProposal` this ticket's issue names as the existing
 * convention to preserve.
 */
export function extractOriginalProposal(body: string): string {
	const match = body.match(ORIGINAL_PROPOSAL_DETAILS_PATTERN);
	return (match?.[1] ?? body).trim();
}

/**
 * Renders the issue body the spec is published to. `outOfScope` gets its own
 * deterministic section here rather than trusting the model to include an
 * "Out of Scope" heading in `specMarkdown` itself (the prompt asks it not
 * to) — the workflow can guarantee a heading renders correctly; a model
 * cannot be asked to guarantee it every run.
 *
 * The `<details>` wrapper is only added when there is a real proposal to
 * preserve, matching `executeSpecPublishing`'s own behaviour exactly — a
 * bodyless issue publishes the spec bare rather than growing a wrapper
 * around nothing.
 */
export function buildSpecBody(spec: Spec, originalBody: string): string {
	const proposal = extractOriginalProposal(originalBody);
	const outOfScopeSection =
		spec.outOfScope.length > 0
			? `\n\n## Out of Scope\n\n${spec.outOfScope.map((item) => `- ${item}`).join("\n")}`
			: "";
	const proposalSection =
		proposal.length > 0
			? `\n\n<details>\n<summary>📜 Original Issue Proposal</summary>\n\n${proposal}\n</details>`
			: "";

	return `${spec.specMarkdown}${outOfScopeSection}${proposalSection}`;
}

/**
 * Seams travel downstream to `tdd` and `code-review` (spec §5.8), so they are
 * posted as their own comment — reviewable without reading the whole spec —
 * rather than folded into the issue-body update.
 */
export function buildSeamsComment(seams: readonly Seam[]): string {
	if (seams.length === 0) {
		return "🪡 **Test Seams**\n\nNo seams were named for this spec.";
	}

	const list = seams
		.map((seam) => `- **${seam.name}**: ${seam.rationale}`)
		.join("\n");

	return `🪡 **Test Seams**\n\n\`tdd\` writes tests only at these; \`code-review\`'s Spec axis flags any seam nobody agreed to.\n\n${list}`;
}

/**
 * Adding `tickets:needed` must fire `agent-tickets.yml`, which a label
 * applied with the default `GITHUB_TOKEN` cannot do (spec §5.8) — so this
 * either authenticates as `AGENT_PAT` and performs the transition, or leaves
 * the labels alone entirely and asks the maintainer to do it by hand.
 * Mirrors `grill.ts`'s `chainToSpec`.
 */
async function chainToTickets(
	ctx: IssueContext,
	currentLabels: IssueLabels,
): Promise<string[]> {
	const pat = process.env.AGENT_PAT;
	if (!pat) {
		await postBotComment(
			ctx,
			`🚦 The spec is published, but \`AGENT_PAT\` isn't configured, so I can't chain to the ticket-breakdown stage automatically. Please add the \`${LABELS.ticketsNeeded}\` label yourself to continue.`,
		);
		return extractLabelNames(currentLabels);
	}

	const chainCtx: IssueContext = { ...ctx, octokit: github.getOctokit(pat) };
	return transitionState(chainCtx, currentLabels, {
		add: [LABELS.ticketsNeeded],
	});
}

/**
 * Publishes a settled grill conversation as a specification (spec §5.8,
 * design doc §3.6 Stage 3): run the `to-spec` skill, write the spec to the
 * issue body with the original proposal preserved, post the seams as their
 * own comment, mark the issue ready, and chain to `tickets`.
 *
 * As in `grill.ts`, every `transitionState` call threads the *previous*
 * call's returned label names into the next one rather than re-diffing
 * against the initial, now-stale snapshot (CODING_STANDARDS.md, "Call-site
 * signature tracing").
 */
export async function runSpecPublication(
	ctx: IssueContext,
	runner: SpecRunner = runAgent,
): Promise<void> {
	const { conversation, issue } = await fetchIssueContext(ctx);
	const originalBody = issue.body ?? "";

	let labels = await transitionState(ctx, issue.labels, {
		add: [LABELS.agentInProgress],
		remove: [LABELS.specNeeded, LABELS.agentBlocked],
	});

	try {
		const result = await runner({
			expectSkill: "to-spec",
			model: MODELS.spec,
			output: OUTPUTS.spec,
			promptArgs: { CONVERSATION: conversation },
			promptFile: SPEC_PROMPT_FILE,
		});

		await ctx.octokit.rest.issues.update({
			body: buildSpecBody(result.output, originalBody),
			issue_number: ctx.issueNumber,
			owner: ctx.owner,
			repo: ctx.repo,
		});

		await postBotComment(ctx, buildSeamsComment(result.output.seams));

		labels = await transitionState(ctx, labels, {
			add: [LABELS.specReady, LABELS.readyForAgent],
		});
		labels = await chainToTickets(ctx, labels);
	} catch (error) {
		labels = await transitionState(ctx, labels, {
			add: [LABELS.agentBlocked],
		});
		await postIssueErrorComment(ctx, "Spec", error);
		throw error;
	} finally {
		await transitionState(ctx, labels, { remove: [LABELS.agentInProgress] });
	}
}

export async function run(): Promise<void> {
	const issueNumber = parseInt(process.env.ISSUE_NUMBER ?? "0", 10);
	const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
	const ctx: IssueContext = {
		issueNumber,
		octokit,
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
	};

	await runSpecPublication(ctx);
}

runIfMain(import.meta.main, run);
