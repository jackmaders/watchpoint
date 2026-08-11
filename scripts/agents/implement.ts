import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { resolveArtifactsDir, writeFailureReason } from "./artifacts";
import { runIfMain } from "./entrypoint";
import { defaultExec, type ExecFn } from "./exec";
import { RunAgentError, StageError, type WrittenFailure } from "./failure";
import {
	buildBranchName,
	countCommits,
	createBranchFromMain,
	pushBranch,
} from "./git";
import {
	fetchIssueContext,
	formatGeminiError,
	type IssueContext,
	issueContextFromEnv,
	LABELS,
	postBotComment,
	resolvePatOctokit,
	transitionState,
} from "./github";
import { MODELS } from "./models";
import {
	type ObjectRunOptions,
	type RunAgentResult,
	runAgent,
} from "./run-agent";
import { buildPullRequestTitle, type Implement, OUTPUTS } from "./schemas";
import { runStage } from "./stage";

const IMPLEMENT_PROMPT_FILE = join(
	import.meta.dirname,
	"prompts",
	"implement.md",
);
const TEMPLATE_DIR = join(
	import.meta.dirname,
	"..",
	"..",
	".github",
	"PULL_REQUEST_TEMPLATE",
);

/** Implement's product is `ImplementSchema`, so it runs the object form of `runAgent`. */
type ImplementRunner = (
	options: ObjectRunOptions<Implement>,
) => Promise<RunAgentResult<Implement>>;

/**
 * The subset of `octokit.rest.issues.get`'s response the first two shape
 * guards read. Both summaries are required, not optional: GitHub always
 * computes them for a repo with sub-issues and issue dependencies enabled
 * (which every ticket in this pipeline assumes — `docs/agents/issue-
 * tracker.md`'s wayfinding section is built entirely on native sub-issues and
 * native blocking), so a response missing either is an API-shape anomaly, not
 * evidence of zero sub-issues or zero blockers. `findShapeGuardRefusal`
 * refuses on that anomaly rather than defaulting it to zero — a ticket
 * report of "the guard let a blocked ticket through" is far more expensive
 * than a report of "the guard refused with a confusing summary".
 */
const ShapeGuardSummariesSchema = z.object({
	issue_dependencies_summary: z.object({ blocked_by: z.number() }),
	sub_issues_summary: z.object({ total: z.number() }),
});

export interface ShapeGuardIssue {
	number: number;
	sub_issues_summary?: { total: number } | null;
	issue_dependencies_summary?: { blocked_by: number } | null;
}

/** Matches "Closes #57", "Fixes #57", "Resolves #57" — GitHub's own auto-close keywords — anchored to a specific issue number so a bare mention ("see #57") or a different issue ("Closes #570") never matches. */
function closesIssuePattern(issueNumber: number): RegExp {
	return new RegExp(`\\b(closes|fixes|resolves)\\s+#${issueNumber}\\b`, "i");
}

/**
 * The third shape guard (spec §5.8, design doc §3.6 Stage 5): an open PR
 * whose body already closes this issue means someone — a prior run, a
 * collaborator — is already on it. Reads every open PR rather than
 * searching, since `search.issuesAndPullRequests` indexes lag real time and
 * this guard must never miss a PR that exists right now.
 */
export async function findExistingPullRequest(
	ctx: IssueContext,
	issueNumber: number,
): Promise<{ number: number } | null> {
	const pulls = await ctx.octokit.paginate(ctx.octokit.rest.pulls.list, {
		owner: ctx.owner,
		repo: ctx.repo,
		state: "open",
	});
	const pattern = closesIssuePattern(issueNumber);
	const match = pulls.find((pull) => pattern.test(pull.body ?? ""));
	return match ? { number: match.number } : null;
}

/**
 * The three shape guards (spec §5.8, design doc §3.6 Stage 5), each refusing
 * with a specific, actionable comment: a response missing its sub-issue or
 * blocker summary can't be trusted to prove the frontier invariant either
 * way; a spec/ticket-breakdown parent isn't an implementable ticket; an open
 * blocker means it isn't on the frontier yet; an open PR that already closes
 * this issue means someone is already on it. Returns `null` when none apply
 * — the only case `runImplementation` proceeds past.
 */
export async function findShapeGuardRefusal(
	ctx: IssueContext,
	issue: ShapeGuardIssue,
): Promise<string | null> {
	const summaries = ShapeGuardSummariesSchema.safeParse(issue);
	if (!summaries.success) {
		return `🚫 **Refused:** GitHub's response for this issue is missing its sub-issue or blocker summary, so I can't confirm it's actually on the frontier. Re-add \`${LABELS.devNeeded}\` to retry, or check the run log if this keeps happening.`;
	}

	const { sub_issues_summary, issue_dependencies_summary } = summaries.data;
	if (sub_issues_summary.total > 0) {
		return `🚫 **Refused:** this issue has ${sub_issues_summary.total} sub-issue(s) — that makes it a spec or ticket-breakdown parent, not an implementable ticket. Pick one of its child tickets instead.`;
	}

	if (issue_dependencies_summary.blocked_by > 0) {
		return `🚫 **Refused:** this ticket has ${issue_dependencies_summary.blocked_by} open blocker(s) — it isn't on the frontier yet. Re-add \`${LABELS.devNeeded}\` once every blocker closes.`;
	}

	const existingPr = await findExistingPullRequest(ctx, issue.number);
	if (existingPr) {
		return `🚫 **Refused:** #${existingPr.number} is an open pull request that already closes this issue. Re-add \`${LABELS.devNeeded}\` only once that PR is closed or abandoned.`;
	}

	return null;
}

/**
 * `Closes #<n>` is guaranteed by the workflow, on its own line at the top,
 * never left to the model to remember — the same "workflow guarantees what
 * it can, never trusts the model for it" rule `spec.ts`'s deterministic Out
 * of Scope section follows. The chosen template's real content follows
 * beneath the model's summary, giving the maintainer the checklist without
 * asking the model to reproduce it from memory.
 */
export function buildPullRequestBody(
	issueNumber: number,
	summary: string,
	templateContent: string,
): string {
	return `Closes #${issueNumber}\n\n${summary}\n\n---\n\n${templateContent}`;
}

/**
 * Posted inside the PR body — not a separate comment — so the warning is
 * visible the moment a maintainer opens the PR, wherever they open it from.
 */
const NO_PAT_CI_NOTICE =
	"\n\n> ⚠️ Opened with the default `GITHUB_TOKEN` because `AGENT_PAT` isn't configured. Per GitHub's own docs on `GITHUB_TOKEN` and workflow triggers, a `pull_request` event created this way still queues `PR Quality Checks`, but leaves it waiting for a maintainer to approve the run rather than starting it automatically — open the Actions tab and approve it to get checks running.";

/**
 * Opens the draft PR with the `AGENT_PAT`-authenticated client when it's
 * configured: per GitHub's docs on `GITHUB_TOKEN` and workflow triggers, a
 * `pull_request: opened` event created by a workflow using the default
 * `GITHUB_TOKEN` still creates a run of `PR Quality Checks`
 * (`pull_request: branches: [main]`) — but leaves it sitting in an
 * approval-required state a maintainer has to click through, rather than
 * running automatically. Falls back to `ctx.octokit` when `AGENT_PAT` isn't
 * configured, same as every other PAT-gated mutation in this pipeline, and
 * says so in the PR body so a maintainer knows checks need a manual nudge.
 */
async function createDraftPullRequest(
	ctx: IssueContext,
	options: {
		branchName: string;
		issueNumber: number;
		pr: Implement["pr"];
		summary: string;
	},
): Promise<number> {
	const templateContent = readFileSync(
		join(TEMPLATE_DIR, options.pr.template),
		"utf-8",
	);
	const patOctokit = resolvePatOctokit();
	const body =
		buildPullRequestBody(
			options.issueNumber,
			options.summary,
			templateContent,
		) + (patOctokit ? "" : NO_PAT_CI_NOTICE);

	const { data } = await (patOctokit ?? ctx.octokit).rest.pulls.create({
		base: "main",
		body,
		draft: true,
		head: options.branchName,
		owner: ctx.owner,
		repo: ctx.repo,
		title: buildPullRequestTitle(options.pr),
	});
	return data.number;
}

/**
 * `review:needed` must fire `agent-review.yml`, which a label applied with
 * the default `GITHUB_TOKEN` cannot do (spec §5.8) — mirrors `spec.ts`'s
 * `chainToTickets` and `tickets.ts`'s `labelFrontierAsDevNeeded`, but against
 * the freshly created PR rather than `ctx`'s own issue.
 */
async function chainToReview(
	ctx: IssueContext,
	prNumber: number,
): Promise<void> {
	const patOctokit = resolvePatOctokit();
	if (!patOctokit) {
		await postBotComment(
			ctx,
			`🚦 #${prNumber} is open, but \`AGENT_PAT\` isn't configured, so I can't chain to the review stage automatically. Please add the \`${LABELS.reviewNeeded}\` label to #${prNumber} yourself.`,
		);
		return;
	}

	await patOctokit.rest.issues.addLabels({
		issue_number: prNumber,
		labels: [LABELS.reviewNeeded],
		owner: ctx.owner,
		repo: ctx.repo,
	});
}

/**
 * The failure class read straight off the error's own type — never
 * re-derived by matching substrings of its message. A `RunAgentError` already
 * carries `run-agent.ts`'s classification (`quota`, `turn-limit`,
 * `bad-output`, `skill-miss` — spec §5.3's table); a `StageError` carries this
 * module's own post-hoc measured classification (`no-commits`,
 * `validate-failed`, `push-race`), assigned at the exact throw site that
 * measured it. Anything else is a plain rejection with no known shape.
 */
function classifyStageFailure(error: unknown): WrittenFailure {
	if (error instanceof RunAgentError) return error.failureClass;
	if (error instanceof StageError) return error.failureClass;
	return "unclassified";
}

/** Written on every failure path, via the same writer `run-agent.ts` uses for its own classified failures. */
function writeImplementFailure(error: unknown): void {
	const dir = resolveArtifactsDir();
	if (dir === null) return;
	writeFailureReason(
		dir,
		classifyStageFailure(error),
		formatGeminiError(error),
	);
}

/**
 * Picks up an unblocked ticket and implements it test-first on its own
 * branch (spec §5.8, design doc §3.6 Stage 5): shape guards, branch from
 * `main`, run the `implement` skill, measure commits and validation, push,
 * open a draft PR, and chain to review.
 *
 * Division of labour, non-negotiable: the agent (`runner`) only writes code
 * and commits. Every git and GitHub mutation below is this function's own
 * responsibility, never the model's (the prompt carries the standing
 * prohibition verbatim) — which is what makes a failure at any step
 * debuggable from the workflow's own log rather than from the model's
 * transcript.
 *
 * The shape guards run *before* `runStage` — a refusal never enters
 * `agent:in-progress` at all, so `runStage`'s own `agent:blocked`-on-failure
 * path never applies to a ticket that was refused for being the wrong shape.
 */
export async function runImplementation(
	ctx: IssueContext,
	runner: ImplementRunner = runAgent,
	exec: ExecFn = defaultExec,
): Promise<void> {
	const { conversation, issue } = await fetchIssueContext(ctx);

	const refusal = await findShapeGuardRefusal(ctx, issue);
	if (refusal) {
		await postBotComment(ctx, refusal);
		await transitionState(ctx, issue.labels, {
			add: [LABELS.agentBlocked],
			remove: [LABELS.devNeeded],
		});
		return;
	}

	const branchName = buildBranchName(issue.number, issue.title);

	await runStage(
		ctx,
		issue.labels,
		{
			onFailure: writeImplementFailure,
			removeOnEntry: [LABELS.devNeeded],
			stageName: "Implement",
		},
		async (labels) => {
			const branchHeadSha = await createBranchFromMain(exec, branchName);

			const result = await runner({
				expectSkill: "implement",
				model: MODELS.implement,
				output: OUTPUTS.implement,
				promptArgs: {
					BRANCH_NAME: branchName,
					ISSUE_NUMBER: String(issue.number),
					TICKET: conversation,
				},
				promptFile: IMPLEMENT_PROMPT_FILE,
			});

			const commitCount = await countCommits(exec, branchHeadSha);
			if (commitCount === 0) {
				throw new StageError(
					"no-commits",
					"No commits were made — the implement run produced no changes to review.",
				);
			}

			const validation = await exec("bun", ["run", "validate"]);
			if (validation.exitCode !== 0) {
				throw new StageError(
					"validate-failed",
					`bun run validate failed:\n${(validation.stderr || validation.stdout).slice(-4000)}`,
				);
			}

			await pushBranch(exec, branchName);

			const prNumber = await createDraftPullRequest(ctx, {
				branchName,
				issueNumber: issue.number,
				pr: result.output.pr,
				summary: result.output.summary,
			});

			await chainToReview(ctx, prNumber);

			// Nothing here changes the issue's own labels — the PR and its
			// review:needed label belong to a different issue — so the entry
			// snapshot `runStage` handed in is still accurate for its `finally`.
			return labels;
		},
	);
}

export async function run(): Promise<void> {
	await runImplementation(issueContextFromEnv());
}

runIfMain(import.meta.main, run);
