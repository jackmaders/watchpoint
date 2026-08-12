import { join } from "node:path";
import { runIfMain } from "./entrypoint";
import { defaultExec, type ExecFn } from "./exec";
import {
	fetchIssueContext,
	type IssueContext,
	issueContextFromEnv,
	LABELS,
	postBotComment,
	resolvePatOctokit,
	transitionState,
} from "./github";
import { getReviewDiff, parseOriginatingIssueNumber } from "./review";
import {
	type ObjectRunOptions,
	type RunAgentResult,
	runAgent,
} from "./run-agent";
import { type ImplementPr, OUTPUTS } from "./schemas";
import { runStage } from "./stage";

const IMPLEMENT_PR_PROMPT_FILE = join(
	import.meta.dirname,
	"prompts",
	"implement-pr.md",
);

type ImplementPrRunner = (
	options: ObjectRunOptions<ImplementPr>,
) => Promise<RunAgentResult<ImplementPr>>;

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

async function fetchReviewThreads(ctx: IssueContext): Promise<string> {
	const { data: comments } = await ctx.octokit.rest.pulls.listReviewComments({
		owner: ctx.owner,
		pull_number: ctx.issueNumber,
		repo: ctx.repo,
	});

	if (comments.length === 0) return "No existing review threads.";

	return comments
		.map(
			(comment) =>
				`- Comment ${comment.id} at **${comment.path}:${comment.line ?? "?"}** (${comment.user?.login ?? "unknown"}): ${comment.body ?? ""}`,
		)
		.join("\n");
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

	const { conversation } = await fetchIssueContext({ ...ctx, issueNumber });
	return { conversation, issueNumber };
}

async function commitAndPushFixes(
	exec: ExecFn,
	branchName: string,
): Promise<void> {
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

	const pushArgs = ["push", "origin", branchName];
	const push = await exec("git", pushArgs);
	assertCommandSucceeded("git", pushArgs, push);
}

async function postReviewReplies(
	ctx: IssueContext,
	replies: readonly ImplementPr["replies"][number][],
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

async function chainToReview(ctx: IssueContext): Promise<void> {
	const patOctokit = resolvePatOctokit();
	if (!patOctokit) {
		await postBotComment(
			ctx,
			`🚦 Fixes are pushed, but \`AGENT_PAT\` isn't configured, so I can't chain to the review stage automatically. Please add the \`${LABELS.reviewNeeded}\` label to #${ctx.issueNumber} yourself.`,
		);
		return;
	}

	await patOctokit.rest.issues.addLabels({
		issue_number: ctx.issueNumber,
		labels: [LABELS.reviewNeeded],
		owner: ctx.owner,
		repo: ctx.repo,
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
		{
			removeOnEntry: [LABELS.devNeeded],
			stageName: "Implement PR",
		},
		async (labels) => {
			const [{ diff }, reviewThreads, ticket] = await Promise.all([
				getReviewDiff(exec),
				fetchReviewThreads(ctx),
				fetchTicketContext(ctx, pullRequest.body, pullRequest.head.ref),
			]);

			const result = await runner({
				output: OUTPUTS["implement-pr"],
				promptArgs: {
					BRANCH_NAME: pullRequest.head.ref,
					DIFF: diff,
					ISSUE_NUMBER: String(ticket.issueNumber ?? ctx.issueNumber),
					REVIEW_THREADS: reviewThreads,
					TICKET: ticket.conversation,
				},
				promptFile: IMPLEMENT_PR_PROMPT_FILE,
				skills: ["implement"],
			});

			await commitAndPushFixes(exec, pullRequest.head.ref);
			await postReviewReplies(ctx, result.output.replies, exec);
			await chainToReview(ctx);
			return labels;
		},
	);
}

export async function run(): Promise<void> {
	await runImplementPr(issueContextFromEnv());
}

runIfMain(import.meta.main, run);
