import type * as github from "@actions/github";

export const SPEC_NEEDED_LABEL = "spec-needed";
export const SPEC_READY_LABEL = "spec-ready";
export const DEV_NEEDED_LABEL = "dev-needed";
export const DEV_IN_PROGRESS_LABEL = "dev-in-progress";
export const APPROVED_LABEL = "approved";
export const NEEDS_HUMAN_REVIEW_LABEL = "needs-human-review";
export const BOT_COMMENT_MARKER = "<!-- bot-comment -->";

export type OctokitClient = ReturnType<typeof github.getOctokit>;

export interface IssueContext {
	octokit: OctokitClient;
	issueNumber: number;
	owner: string;
	repo: string;
}

export function extractLabelNames(
	labels?: Array<string | { name?: string } | undefined | null>,
): string[] {
	if (!labels) return [];
	return labels
		.filter(
			(l): l is string | { name?: string } => l !== null && l !== undefined,
		)
		.map((l) => (typeof l === "string" ? l : (l.name ?? "")));
}

export async function removeLabel(ctx: IssueContext, name: string) {
	try {
		await ctx.octokit.rest.issues.removeLabel({
			issue_number: ctx.issueNumber,
			name,
			owner: ctx.owner,
			repo: ctx.repo,
		});
	} catch (error: unknown) {
		if (
			typeof error === "object" &&
			error !== null &&
			"status" in error &&
			(error as { status?: number }).status === 404
		) {
			return;
		}
		throw error;
	}
}

export async function removeLabelIfPresent(
	ctx: IssueContext,
	labels: Array<string | { name?: string }>,
	labelToRemove: string,
) {
	const labelNames = extractLabelNames(labels);

	if (labelNames.includes(labelToRemove)) {
		await removeLabel(ctx, labelToRemove);
	}
}

export async function transitionState(
	ctx: IssueContext,
	currentLabels: Array<string | { name?: string }>,
	options: {
		add?: string[];
		remove?: string[];
	},
) {
	const currentNames = extractLabelNames(currentLabels);
	const toRemove = (options.remove ?? []).filter((name) =>
		currentNames.includes(name),
	);
	const toAdd = (options.add ?? []).filter(
		(name) => !currentNames.includes(name),
	);

	for (const labelToRemove of toRemove) {
		await removeLabel(ctx, labelToRemove);
	}

	if (toAdd.length > 0) {
		await ctx.octokit.rest.issues.addLabels({
			issue_number: ctx.issueNumber,
			labels: toAdd,
			owner: ctx.owner,
			repo: ctx.repo,
		});
	}
}

export async function fetchIssueContext(ctx: IssueContext) {
	const { octokit, issueNumber, owner, repo } = ctx;
	const { data: issue } = await octokit.rest.issues.get({
		issue_number: issueNumber,
		owner,
		repo,
	});

	const comments = await octokit.paginate(octokit.rest.issues.listComments, {
		issue_number: issueNumber,
		owner,
		repo,
	});

	const issueBodyText = issue.body ?? "";
	let conversation = `User Context (Issue Body):\n${issueBodyText}\n\n`;
	let latestUserComment = "";

	for (const comment of comments) {
		const commentBody = comment.body ?? "";
		const isBot =
			comment.user?.type === "Bot" || commentBody.includes(BOT_COMMENT_MARKER);

		if (isBot) {
			continue;
		}

		latestUserComment = commentBody;
		conversation += `User: ${commentBody}\n\n`;
	}

	return { comments, conversation, issue, latestUserComment };
}

export async function postBotComment(ctx: IssueContext, body: string) {
	await ctx.octokit.rest.issues.createComment({
		body: `${BOT_COMMENT_MARKER}\n${body}`,
		issue_number: ctx.issueNumber,
		owner: ctx.owner,
		repo: ctx.repo,
	});
}

export function formatGeminiError(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === "string") {
		return error;
	}
	try {
		return JSON.stringify(error);
	} catch {
		return "Unknown error occurred.";
	}
}

export async function postIssueErrorComment(
	ctx: IssueContext,
	agentName: string,
	error: unknown,
) {
	const formattedDetails = formatGeminiError(error);
	const commentBody = `⚠️ **${agentName} Error:** An error occurred while executing this workflow step.\n\n**Details:**\n\`\`\`\n${formattedDetails}\n\`\`\``;

	try {
		await postBotComment(ctx, commentBody);
	} catch (commentError) {
		console.error(`Failed to post ${agentName} error comment:`, commentError);
	}
}
