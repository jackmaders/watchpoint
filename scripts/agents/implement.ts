import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as github from "@actions/github";
import { resolveArtifactsDir, writeFailureReason } from "./artifacts";
import { runIfMain } from "./entrypoint";
import { defaultExec, type ExecFn } from "./exec";
import { RunAgentError } from "./failure";
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
import { type Implement, OUTPUTS } from "./schemas";

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

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			GITHUB_TOKEN: string;
			ISSUE_NUMBER: string;
			AGENT_PAT?: string;
		}
	}
}

/** Implement's product is `ImplementSchema`, so it runs the object form of `runAgent`. */
type ImplementRunner = (
	options: ObjectRunOptions<Implement>,
) => Promise<RunAgentResult<Implement>>;

/** The subset of `octokit.rest.issues.get`'s response this module's shape guards read — kept narrow so a test can hand-build one without impersonating the full GitHub schema. */
interface ShapeGuardIssue {
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
 * with a specific, actionable comment: a spec/ticket-breakdown parent isn't
 * an implementable ticket; an open blocker means it isn't on the frontier
 * yet; an open PR that already closes this issue means someone is already
 * on it. Returns `null` when none apply — the only case `runImplementation`
 * proceeds past.
 */
export async function findShapeGuardRefusal(
	ctx: IssueContext,
	issue: ShapeGuardIssue,
): Promise<string | null> {
	const subIssueCount = issue.sub_issues_summary?.total ?? 0;
	if (subIssueCount > 0) {
		return `🚫 **Refused:** this issue has ${subIssueCount} sub-issue(s) — that makes it a spec or ticket-breakdown parent, not an implementable ticket. Pick one of its child tickets instead.`;
	}

	const blockedByCount = issue.issue_dependencies_summary?.blocked_by ?? 0;
	if (blockedByCount > 0) {
		return `🚫 **Refused:** this ticket has ${blockedByCount} open blocker(s) — it isn't on the frontier yet. Re-add \`${LABELS.devNeeded}\` once every blocker closes.`;
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
	const body = buildPullRequestBody(
		options.issueNumber,
		options.summary,
		templateContent,
	);

	const { data } = await ctx.octokit.rest.pulls.create({
		base: "main",
		body,
		draft: true,
		head: options.branchName,
		owner: ctx.owner,
		repo: ctx.repo,
		title: options.pr.title,
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
	const pat = process.env.AGENT_PAT;
	if (!pat) {
		await postBotComment(
			ctx,
			`🚦 #${prNumber} is open, but \`AGENT_PAT\` isn't configured, so I can't chain to the review stage automatically. Please add the \`${LABELS.reviewNeeded}\` label to #${prNumber} yourself.`,
		);
		return;
	}

	const patOctokit = github.getOctokit(pat);
	await patOctokit.rest.issues.addLabels({
		issue_number: prNumber,
		labels: [LABELS.reviewNeeded],
		owner: ctx.owner,
		repo: ctx.repo,
	});
}

/**
 * A `RunAgentError` already carries `run-agent.ts`'s own classification
 * (`quota`, `turn-limit`, `bad-output`, `skill-miss` — spec §5.3's table),
 * decided at the throw site, never re-derived here. Everything else is one
 * of this stage's own post-hoc measured checks (`git rev-list`, `bun run
 * validate`'s exit code, `git push`'s stderr) — each one a fact the workflow
 * itself measured, never self-reported by the model (spec §5.4) — matched by
 * the literal message each throw site below uses, or `unclassified` for
 * anything else (a plain rejection with no known shape).
 */
function classifyImplementFailure(error: unknown): string {
	if (error instanceof RunAgentError) return error.failureClass;
	const message = error instanceof Error ? error.message : String(error);
	if (message.includes("No commits were made")) return "no-commits";
	if (message.includes("bun run validate failed")) return "validate-failed";
	if (message.includes("advanced during the run")) return "push-race";
	return "unclassified";
}

/**
 * Written on every failure path, via the same writer `run-agent.ts` uses for
 * its own classified failures. For a `RunAgentError`, `run-agent.ts` already
 * wrote this file with the correct classification before throwing — this
 * call re-derives the identical classification and overwrites the file with
 * the same content, rather than risk clobbering it with `unclassified`.
 */
function writeImplementFailure(error: unknown): void {
	const dir = resolveArtifactsDir();
	if (dir === null) return;
	writeFailureReason(
		dir,
		classifyImplementFailure(error),
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

	let labels = await transitionState(ctx, issue.labels, {
		add: [LABELS.agentInProgress],
		remove: [LABELS.devNeeded, LABELS.agentBlocked],
	});

	const branchName = buildBranchName(issue.number, issue.title);

	try {
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
			throw new Error(
				"No commits were made — the implement run produced no changes to review.",
			);
		}

		const validation = await exec("bun", ["run", "validate"]);
		if (validation.exitCode !== 0) {
			throw new Error(
				`bun run validate failed:\n${(validation.stderr || validation.stdout).slice(-4000)}`,
			);
		}

		await pushBranch(exec, branchName, branchHeadSha);

		const prNumber = await createDraftPullRequest(ctx, {
			branchName,
			issueNumber: issue.number,
			pr: result.output.pr,
			summary: result.output.summary,
		});

		await chainToReview(ctx, prNumber);
	} catch (error) {
		writeImplementFailure(error);
		labels = await transitionState(ctx, labels, {
			add: [LABELS.agentBlocked],
		});
		await postIssueErrorComment(ctx, "Implement", error);
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

	await runImplementation(ctx);
}

runIfMain(import.meta.main, run);
