import { join } from "node:path";
import { runIfMain } from "./entrypoint";
import { defaultExec, type ExecFn } from "./exec";
import {
	formatGeminiError,
	type IssueContext,
	issueContextFromEnv,
	LABELS,
} from "./github";
import { getReviewDiff, parseOriginatingIssueNumber } from "./review";
import {
	type ObjectRunOptions,
	type RunAgentResult,
	runAgent,
} from "./run-agent";
import { type ImplementPr, OUTPUTS } from "./schemas";
import {
	chainLabel,
	escalateToHuman,
	fetchReviewFeedback,
	postFeedbackResponses,
} from "./shared";
import { runStage } from "./stage";

export { postFeedbackResponses } from "./shared";

const IMPLEMENT_PR_PROMPT_FILE = join(
	import.meta.dirname,
	"prompts",
	"implement-pr.md",
);

export const REQUIRED_QUALITY_CHECK_NAMES = [
	"✨ Check Code Quality",
	"🎭 Run E2E Tests",
	"🏗️ Build Web App",
	"🛢 Check Database Schema",
	"🧪 Run Unit Tests",
] as const;

const QUALITY_WORKFLOW_ID = "pull-request.yml";
const QUALITY_CHECK_TIMEOUT_MS = 20 * 60_000;
const QUALITY_CHECK_POLL_INTERVAL_MS = 15_000;

type ImplementPrRunner = (
	options: ObjectRunOptions<ImplementPr>,
) => Promise<RunAgentResult<ImplementPr>>;

export type QualityChecksResult =
	| { status: "passed" }
	| { reason: string; status: "failed" | "timed-out" };

interface QualityCheckWaitOptions {
	intervalMs?: number;
	now?: () => number;
	sleep?: (milliseconds: number) => Promise<void>;
	timeoutMs?: number;
}

export type ImplementPrOutputValidation =
	| { valid: true }
	| { reason: string; valid: false };

/** Ensures the model classified every supplied source exactly once before mutation. */
export function validateImplementPrOutput(
	output: ImplementPr,
	sourceIds: readonly string[],
): ImplementPrOutputValidation {
	const expected = new Set(sourceIds);
	const seen = new Set<string>();

	for (const item of output.feedback) {
		if (!expected.has(item.sourceId)) {
			return {
				reason: `Unknown feedback source id: ${item.sourceId}.`,
				valid: false,
			};
		}
		if (seen.has(item.sourceId)) {
			return {
				reason: `Duplicate feedback source id: ${item.sourceId}.`,
				valid: false,
			};
		}
		seen.add(item.sourceId);
	}

	const missing = sourceIds.find((sourceId) => !seen.has(sourceId));
	if (missing) {
		return {
			reason: `Missing feedback source id: ${missing}.`,
			valid: false,
		};
	}

	return { valid: true };
}

interface CommandResult {
	exitCode: number;
	stderr: string;
	stdout: string;
}

function assertCommandSucceeded(
	command: string,
	args: string[],
	result: CommandResult,
): void {
	if (result.exitCode !== 0) {
		throw new Error(
			`${command} ${args.join(" ")} failed: ${result.stderr.trim() || result.stdout.trim() || "unknown error"}`,
		);
	}
}

function defaultSleep(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

interface QualityCheckJob {
	conclusion: string | null;
	name: string;
	status: string;
}

interface QualityCheckRun {
	conclusion: string | null;
	status: string | null;
}

function inspectQualityCheckRun(
	run: QualityCheckRun,
	jobs: readonly QualityCheckJob[],
): QualityChecksResult | null {
	const jobsByName = new Map(
		jobs
			.filter((job) =>
				(REQUIRED_QUALITY_CHECK_NAMES as readonly string[]).includes(job.name),
			)
			.map((job) => [job.name, job]),
	);
	const missing = REQUIRED_QUALITY_CHECK_NAMES.filter(
		(name) => !jobsByName.has(name),
	);

	if (missing.length === 0) {
		const pending = REQUIRED_QUALITY_CHECK_NAMES.some(
			(name) => jobsByName.get(name)?.status !== "completed",
		);
		if (!pending) {
			const failed = REQUIRED_QUALITY_CHECK_NAMES.find(
				(name) => jobsByName.get(name)?.conclusion !== "success",
			);
			if (failed) {
				return {
					reason: `Required PR Quality Checks job ${failed} did not pass.`,
					status: "failed",
				};
			}
			return { status: "passed" };
		}
	}

	if (run.status === "completed" && run.conclusion !== "success") {
		return {
			reason: `PR Quality Checks completed with conclusion ${run.conclusion ?? "unknown"}; missing jobs: ${missing.join(", ") || "none"}.`,
			status: "failed",
		};
	}

	return null;
}

async function readQualityCheckResult(
	ctx: IssueContext,
	sha: string,
): Promise<QualityChecksResult | null> {
	const { data } = await ctx.octokit.rest.actions.listWorkflowRunsForRepo({
		head_sha: sha,
		owner: ctx.owner,
		per_page: 100,
		repo: ctx.repo,
		workflow_id: QUALITY_WORKFLOW_ID,
	});
	const run = data.workflow_runs.find(
		(candidate) =>
			candidate.head_sha === sha && candidate.name === "PR Quality Checks",
	);
	if (!run) return null;

	const { data: jobsData } =
		await ctx.octokit.rest.actions.listJobsForWorkflowRun({
			owner: ctx.owner,
			per_page: 100,
			repo: ctx.repo,
			run_id: run.id,
		});
	return inspectQualityCheckRun(run, jobsData.jobs);
}

async function readQualityCheckResultSafely(
	ctx: IssueContext,
	sha: string,
): Promise<QualityChecksResult | null> {
	try {
		return await readQualityCheckResult(ctx, sha);
	} catch (error) {
		return {
			reason: `Could not read PR Quality Checks for ${sha}: ${formatGeminiError(error)}`,
			status: "failed",
		};
	}
}

/** Waits on the exact pushed SHA until every required PR quality job succeeds. */
export async function waitForQualityChecks(
	ctx: IssueContext,
	sha: string,
	options: QualityCheckWaitOptions = {},
): Promise<QualityChecksResult> {
	const now = options.now ?? Date.now;
	const sleep = options.sleep ?? defaultSleep;
	const timeoutMs = options.timeoutMs ?? QUALITY_CHECK_TIMEOUT_MS;
	const intervalMs = options.intervalMs ?? QUALITY_CHECK_POLL_INTERVAL_MS;
	const deadline = now() + timeoutMs;

	while (true) {
		const result = await readQualityCheckResultSafely(ctx, sha);
		if (result) return result;

		const remainingMs = deadline - now();
		if (remainingMs <= 0) {
			return {
				reason: `Timed out waiting for PR Quality Checks for ${sha}.`,
				status: "timed-out",
			};
		}
		await sleep(Math.min(intervalMs, remainingMs));
	}
}

async function fetchTicketContext(
	ctx: IssueContext,
	prBody: string | null,
	headRef: string,
): Promise<{ issueNumber: number | null; conversation: string }> {
	const issueNumber = parseOriginatingIssueNumber(prBody, headRef);
	if (issueNumber === null) {
		return { conversation: "No originating issue was found.", issueNumber };
	}

	const { fetchIssueContext } = await import("./github");
	const { conversation } = await fetchIssueContext({ ...ctx, issueNumber });
	return { conversation, issueNumber };
}

async function commitAndPushFixes(
	exec: ExecFn,
	branchName: string,
): Promise<string> {
	const statusArgs = ["status", "--porcelain"];
	const status = await exec("git", statusArgs);
	assertCommandSucceeded("git", statusArgs, status);

	if (status.stdout.trim()) {
		const addArgs = ["add", "-A"];
		const add = await exec("git", addArgs);
		assertCommandSucceeded("git", addArgs, add);

		const commitArgs = [
			"commit",
			"-m",
			"fix(review): 🔧 address automated review findings",
		];
		const commit = await exec("git", commitArgs);
		assertCommandSucceeded("git", commitArgs, commit);
	}

	const pushArgs = ["push", "origin", `HEAD:${branchName}`];
	const push = await exec("git", pushArgs);
	assertCommandSucceeded("git", pushArgs, push);

	const shaArgs = ["rev-parse", "HEAD"];
	const shaResult = await exec("git", shaArgs);
	assertCommandSucceeded("git", shaArgs, shaResult);
	const sha = shaResult.stdout.trim();
	if (!sha) throw new Error("git rev-parse HEAD returned an empty SHA");
	return sha;
}

async function chainToReview(ctx: IssueContext): Promise<void> {
	await chainLabel(ctx, {
		fallbackMessage: `🚦 Fixes are pushed, but \`AGENT_PAT\` isn't configured, so I can't chain to the review stage automatically. Please add the \`${LABELS.reviewNeeded}\` label to #${ctx.issueNumber} yourself.`,
		label: LABELS.reviewNeeded,
	});
}

/** Runs the automated fix round on the PR branch and chains the next review. */
export async function runImplementPr(
	ctx: IssueContext,
	runner: ImplementPrRunner = runAgent,
	exec: ExecFn = defaultExec,
): Promise<void> {
	const { data: pullRequest } = await ctx.octokit.rest.pulls.get({
		owner: ctx.owner,
		pull_number: ctx.issueNumber,
		repo: ctx.repo,
	});

	await runStage(
		ctx,
		pullRequest.labels,
		{ removeOnEntry: [LABELS.devNeeded], stageName: "Implement PR" },
		async (labels) => {
			const [{ diff }, feedbackContext, ticket] = await Promise.all([
				getReviewDiff(exec),
				fetchReviewFeedback(ctx),
				fetchTicketContext(ctx, pullRequest.body, pullRequest.head.ref),
			]);

			const result = await runner({
				output: OUTPUTS["implement-pr"],
				promptArgs: {
					BRANCH_NAME: pullRequest.head.ref,
					DIFF: diff,
					ISSUE_NUMBER: String(ticket.issueNumber ?? ctx.issueNumber),
					REVIEW_THREADS: feedbackContext.conversation,
					TICKET: ticket.conversation,
				},
				promptFile: IMPLEMENT_PR_PROMPT_FILE,
				skills: ["implement"],
			});

			const sourceIds = Array.from(feedbackContext.sources.keys());
			const validation = validateImplementPrOutput(result.output, sourceIds);
			if (!validation.valid) {
				return escalateToHuman(
					ctx,
					labels,
					`The fix agent returned an invalid feedback classification: ${validation.reason} No code or feedback replies were mutated.`,
				);
			}

			const sha = await commitAndPushFixes(exec, pullRequest.head.ref);
			await postFeedbackResponses(
				result.output.feedback,
				feedbackContext.sources,
				ctx,
				exec,
			);

			const unresolvedFeedback = result.output.feedback.filter(
				(item) => item.status !== "fixed",
			);
			if (unresolvedFeedback.length > 0) {
				return escalateToHuman(
					ctx,
					labels,
					`The fix agent reported ${unresolvedFeedback.length} feedback item(s) as invalid or transiently not actionable.`,
				);
			}

			const qualityResult = await waitForQualityChecks(ctx, sha);
			if (qualityResult.status !== "passed") {
				return escalateToHuman(ctx, labels, qualityResult.reason);
			}

			await chainToReview(ctx);
			return labels;
		},
	);
}

export async function run(): Promise<void> {
	await runImplementPr(issueContextFromEnv());
}

runIfMain(import.meta.main, run);
