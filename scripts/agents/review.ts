import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runIfMain } from "./entrypoint";
import { defaultExec, type ExecFn } from "./exec";
import { RunAgentError } from "./failure";
import {
	extractLabelNames,
	fetchIssueContext,
	type IssueContext,
	issueContextFromEnv,
	LABELS,
	postBotComment,
	resolvePatOctokit,
	transitionState,
} from "./github";
import { logger } from "./logger";
import {
	type ObjectRunOptions,
	type RunAgentResult,
	runAgent,
} from "./run-agent";
import {
	filterReviewComments,
	type InlineComment,
	OUTPUTS,
	type Review,
} from "./schemas";
import { runStage } from "./stage";

const REVIEW_STANDARDS_PROMPT_FILE = join(
	import.meta.dirname,
	"prompts",
	"review-standards.md",
);
const REVIEW_SPEC_PROMPT_FILE = join(
	import.meta.dirname,
	"prompts",
	"review-spec.md",
);
const CODING_STANDARDS_FILE = join(
	import.meta.dirname,
	"..",
	"..",
	"CODING_STANDARDS.md",
);

const REVIEW_FALLBACK_MODEL = { model: "gpt-5.4", provider: "openai" } as const;

type ReviewRunner = (
	options: ObjectRunOptions<Review>,
) => Promise<RunAgentResult<Review>>;

interface DiffState {
	path: string;
	rightLine: number;
}

function reviewLabelContext(ctx: IssueContext): {
	context: IssueContext;
	hasPat: boolean;
} {
	const patOctokit = resolvePatOctokit();
	return {
		context: patOctokit ? { ...ctx, octokit: patOctokit } : ctx,
		hasPat: patOctokit !== null,
	};
}

function updateDiffHeader(line: string, state: DiffState): boolean {
	if (line.startsWith("diff --git ")) {
		state.path = "";
		return true;
	}

	if (line.startsWith("+++ ")) {
		const path = line.slice(4);
		state.path = path === "/dev/null" ? "" : path.replace(/^b\//, "");
		return true;
	}

	if (line.startsWith("@@ ")) {
		const match = line.match(/^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
		if (match) state.rightLine = Number.parseInt(match[1], 10);
		return true;
	}

	return false;
}

function addDiffLine(
	line: string,
	state: DiffState,
	validLines: Set<string>,
): void {
	if (line.startsWith("\\")) return;
	if (!state.path || state.rightLine < 1) return;

	if (line.startsWith("+") || line.startsWith(" ")) {
		validLines.add(`${state.path}:${state.rightLine}`);
		state.rightLine += 1;
		return;
	}

	if (!line.startsWith("-")) state.rightLine += 1;
}

/** Returns path/line keys that GitHub can accept on the diff's right side. */
export function parseDiff(diffText: string): Set<string> {
	const validLines = new Set<string>();
	const state: DiffState = { path: "", rightLine: 0 };

	for (const line of diffText.split(/\r?\n/)) {
		if (updateDiffHeader(line, state)) continue;
		addDiffLine(line, state, validLines);
	}

	return validLines;
}

function assertCommandSucceeded(
	command: string,
	args: string[],
	result: { exitCode: number; stderr: string },
): void {
	if (result.exitCode !== 0) {
		throw new Error(
			`${command} ${args.join(" ")} failed: ${result.stderr.trim() || "unknown error"}`,
		);
	}
}

export async function getReviewDiff(
	exec: ExecFn = defaultExec,
): Promise<{ diff: string; validLines: Set<string> }> {
	const fetchArgs = ["fetch", "origin", "main"];
	const fetchResult = await exec("git", fetchArgs);
	assertCommandSucceeded("git", fetchArgs, fetchResult);

	const mergeBaseArgs = ["merge-base", "origin/main", "HEAD"];
	const mergeBaseResult = await exec("git", mergeBaseArgs);
	assertCommandSucceeded("git", mergeBaseArgs, mergeBaseResult);
	const mergeBase = mergeBaseResult.stdout.trim();
	if (!mergeBase) throw new Error("git merge-base failed: empty merge-base");

	const diffArgs = ["diff", mergeBase, "HEAD"];
	const diffResult = await exec("git", diffArgs);
	assertCommandSucceeded("git", diffArgs, diffResult);

	return { diff: diffResult.stdout, validLines: parseDiff(diffResult.stdout) };
}

/** Runs one review axis independently, retrying quota failures on the fallback model. */
export async function runReviewAxis(
	options: ObjectRunOptions<Review>,
	runner: ReviewRunner = runAgent,
): Promise<Review> {
	try {
		return (await runner(options)).output;
	} catch (error) {
		if (!(error instanceof RunAgentError) || error.failureClass !== "quota") {
			throw error;
		}

		return (
			await runner({
				...options,
				model: REVIEW_FALLBACK_MODEL,
			})
		).output;
	}
}

/** Finds the issue that a generated pull request claims to implement. */
export function parseOriginatingIssueNumber(
	prBody: string | null,
	headRef: string,
): number | null {
	const bodyMatch = prBody?.match(/\b(?:closes|fixes|resolves)\s+#(\d+)\b/i);
	if (bodyMatch) return Number.parseInt(bodyMatch[1], 10);

	const branchMatch = headRef.match(/^agent\/issue-(\d+)-/);
	return branchMatch ? Number.parseInt(branchMatch[1], 10) : null;
}

export interface ReviewPayload {
	body: string;
	comments: Array<Pick<InlineComment, "body" | "line" | "path">>;
	event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT";
}

/** Composes the two axis reports without combining their verdicts or findings. */
export function buildReviewBody(
	standards: Review,
	standardsDropped: number,
	spec: Review,
	specDropped: number,
): string {
	return `## Standards Review

**Verdict:** ${standards.verdict}
${standards.summary}

*Inline comments: ${standards.inlineComments.length} posted, ${standardsDropped} dropped.*

## Spec Review

**Verdict:** ${spec.verdict}
${spec.summary}

*Inline comments: ${spec.inlineComments.length} posted, ${specDropped} dropped.*`;
}

/** Builds the single GitHub review request from both independently-reviewed axes. */
export function buildReviewPayload(
	body: string,
	standards: Review,
	spec: Review,
): ReviewPayload {
	const changesRequested =
		standards.verdict === "changes-requested" ||
		spec.verdict === "changes-requested";

	return {
		body,
		comments: [...standards.inlineComments, ...spec.inlineComments].map(
			({ body: commentBody, line, path }) => ({
				body: commentBody,
				line,
				path,
			}),
		),
		event: changesRequested ? "REQUEST_CHANGES" : "APPROVE",
	};
}

async function fetchReviewThreads(ctx: IssueContext): Promise<string> {
	try {
		const { data: comments } = await ctx.octokit.rest.pulls.listReviewComments({
			owner: ctx.owner,
			pull_number: ctx.issueNumber,
			repo: ctx.repo,
		});

		if (comments.length === 0) return "No existing review threads.";
		return comments
			.map(
				(comment) =>
					`- **${comment.path}:${comment.line ?? "?"}** (${comment.user?.login ?? "unknown"}): ${comment.body ?? ""}`,
			)
			.join("\n");
	} catch (error) {
		logger.warn("Failed to fetch review threads:", error);
		return "Could not fetch existing review threads.";
	}
}

async function fetchSpecContext(
	ctx: IssueContext,
	prBody: string | null,
	headRef: string,
): Promise<string> {
	const issueNumber = parseOriginatingIssueNumber(prBody, headRef);
	if (issueNumber === null) return "No originating issue was found.";

	try {
		const { conversation } = await fetchIssueContext({ ...ctx, issueNumber });
		return conversation;
	} catch (error) {
		logger.warn(`Failed to fetch issue #${issueNumber} context:`, error);
		return "Could not fetch originating issue context.";
	}
}

async function postReview(
	ctx: IssueContext,
	payload: ReviewPayload,
	exec: ExecFn,
): Promise<void> {
	const outputDir = process.env.OUTPUT_DIR ?? "/tmp";
	const payloadPath = join(outputDir, `review-payload-${ctx.issueNumber}.json`);
	writeFileSync(payloadPath, JSON.stringify(payload, null, 2), "utf-8");

	const args = [
		"api",
		"--method",
		"POST",
		`repos/{owner}/{repo}/pulls/${ctx.issueNumber}/reviews`,
		"--input",
		payloadPath,
	];
	const result = await exec("gh", args);
	assertCommandSucceeded("gh", args, result);
}

async function postReviewReplies(
	replies: readonly Review["replies"][number][],
	exec: ExecFn,
): Promise<void> {
	for (const reply of replies) {
		const args = [
			"api",
			"--method",
			"POST",
			`repos/{owner}/{repo}/pulls/comments/${reply.commentId}/replies`,
			"--field",
			`body=${reply.body}`,
		];
		const result = await exec("gh", args);
		assertCommandSucceeded("gh", args, result);
	}
}

/** Commits and pushes any improvements made by the review agents as one slice. */
export async function commitReviewerImprovements(
	exec: ExecFn = defaultExec,
): Promise<boolean> {
	const statusArgs = ["status", "--porcelain"];
	const status = await exec("git", statusArgs);
	assertCommandSucceeded("git", statusArgs, status);
	if (!status.stdout.trim()) return false;

	const addArgs = ["add", "-A"];
	const add = await exec("git", addArgs);
	assertCommandSucceeded("git", addArgs, add);

	const commitArgs = [
		"commit",
		"-m",
		"chore(review): 📝 apply automated reviewer improvements",
	];
	const commit = await exec("git", commitArgs);
	assertCommandSucceeded("git", commitArgs, commit);

	const pushArgs = ["push", "origin", "HEAD"];
	const push = await exec("git", pushArgs);
	assertCommandSucceeded("git", pushArgs, push);
	return true;
}

async function markPullRequestReady(
	ctx: IssueContext,
	exec: ExecFn,
): Promise<void> {
	const args = [
		"pr",
		"ready",
		String(ctx.issueNumber),
		"--repo",
		`${ctx.owner}/${ctx.repo}`,
	];
	const result = await exec("gh", args);
	assertCommandSucceeded("gh", args, result);
}

async function runReviewAgents(
	runner: ReviewRunner,
	initialDiff: string,
	codingStandards: string,
	unresolvedThreads: string,
	specContext: string,
): Promise<{ standards: Review; spec: Review }> {
	const [standards, spec] = await Promise.all([
		runReviewAxis(
			{
				output: OUTPUTS["review-standards"],
				promptArgs: {
					CODING_STANDARDS: codingStandards,
					DIFF: initialDiff,
					UNRESOLVED_THREADS: unresolvedThreads,
				},
				promptFile: REVIEW_STANDARDS_PROMPT_FILE,
				skills: ["code-review"],
			},
			runner,
		),
		runReviewAxis(
			{
				output: OUTPUTS["review-spec"],
				promptArgs: {
					DIFF: initialDiff,
					SPEC_CONTEXT: specContext,
					UNRESOLVED_THREADS: unresolvedThreads,
				},
				promptFile: REVIEW_SPEC_PROMPT_FILE,
				skills: ["code-review"],
			},
			runner,
		),
	]);
	return { spec, standards };
}

async function publishReview(
	ctx: IssueContext,
	standards: Review,
	spec: Review,
	validLines: ReadonlySet<string>,
	exec: ExecFn,
): Promise<ReviewPayload["event"]> {
	const standardsFiltered = filterReviewComments(
		standards.inlineComments,
		validLines,
	);
	const specFiltered = filterReviewComments(spec.inlineComments, validLines);
	const standardsReport = {
		...standards,
		inlineComments: standardsFiltered.comments,
	};
	const specReport = { ...spec, inlineComments: specFiltered.comments };
	const body = buildReviewBody(
		standardsReport,
		standardsFiltered.droppedCount,
		specReport,
		specFiltered.droppedCount,
	);
	const payload = buildReviewPayload(body, standardsReport, specReport);
	await postReview(ctx, payload, exec);
	await postReviewReplies([...standards.replies, ...spec.replies], exec);
	return payload.event;
}

async function applyReviewState(
	ctx: IssueContext,
	labels: string[],
	isRound2: boolean,
	event: ReviewPayload["event"],
	exec: ExecFn,
): Promise<string[]> {
	const { context: labelContext, hasPat } = reviewLabelContext(ctx);

	if (event === "REQUEST_CHANGES") {
		const nextLabels = await (isRound2
			? transitionState(labelContext, labels, {
					add: [LABELS.reviewRound2, LABELS.reviewEscalated],
					remove: [LABELS.devNeeded],
				})
			: transitionState(labelContext, labels, {
					add: hasPat
						? [LABELS.reviewRound1, LABELS.devNeeded]
						: [LABELS.reviewRound1],
				}));
		if (!isRound2 && !hasPat) {
			await postBotComment(
				ctx,
				`🚦 Round 1 found changes, but \`AGENT_PAT\` isn't configured, so GitHub won't trigger the fix workflow automatically. Please add the \`${LABELS.devNeeded}\` label to this PR manually.`,
			);
		}
		return nextLabels;
	}

	const nextLabels = await transitionState(labelContext, labels, {
		add: [LABELS.reviewApproved],
		remove: [LABELS.reviewRound1, LABELS.reviewRound2],
	});
	await markPullRequestReady(ctx, exec);
	return nextLabels;
}

export async function runReview(
	ctx: IssueContext,
	runner: ReviewRunner = runAgent,
	exec: ExecFn = defaultExec,
): Promise<void> {
	const { data: pullRequest } = await ctx.octokit.rest.pulls.get({
		owner: ctx.owner,
		pull_number: ctx.issueNumber,
		repo: ctx.repo,
	});
	const currentLabels = extractLabelNames(pullRequest.labels);

	if (currentLabels.includes(LABELS.reviewRound2)) {
		await postBotComment(
			ctx,
			"⚠️ **Review Escalated:** This pull request has failed review in both round 1 and round 2. Escalating to human review.",
		);
		const { context: labelContext } = reviewLabelContext(ctx);
		await transitionState(labelContext, pullRequest.labels, {
			add: [LABELS.reviewEscalated],
			remove: [LABELS.reviewNeeded, LABELS.devNeeded],
		});
		return;
	}

	const isRound2 = currentLabels.includes(LABELS.reviewRound1);
	await runStage(
		ctx,
		pullRequest.labels,
		{ removeOnEntry: [LABELS.reviewNeeded], stageName: "Review" },
		async (labels) => {
			const [diff, codingStandards, unresolvedThreads, specContext] =
				await Promise.all([
					getReviewDiff(exec),
					Promise.resolve(readFileSync(CODING_STANDARDS_FILE, "utf-8")),
					fetchReviewThreads(ctx),
					fetchSpecContext(ctx, pullRequest.body, pullRequest.head.ref),
				]);
			const { standards, spec } = await runReviewAgents(
				runner,
				diff.diff,
				codingStandards,
				unresolvedThreads,
				specContext,
			);

			await commitReviewerImprovements(exec);
			const currentDiff = await getReviewDiff(exec);
			const event = await publishReview(
				ctx,
				standards,
				spec,
				currentDiff.validLines,
				exec,
			);
			return applyReviewState(ctx, labels, isRound2, event, exec);
		},
	);
}

export async function run(): Promise<void> {
	await runReview(issueContextFromEnv());
}

runIfMain(import.meta.main, run);
