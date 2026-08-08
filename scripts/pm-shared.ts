import type * as github from "@actions/github";

export const SPEC_READY_LABEL = "spec-ready";
export const READY_FOR_DEV_LABEL = "ready-for-dev";

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

export async function removeLabelIfPresent(
	ctx: IssueContext,
	labels: Array<string | { name?: string }>,
	labelToRemove: string,
) {
	const labelNames = extractLabelNames(labels);

	if (labelNames.includes(labelToRemove)) {
		try {
			await ctx.octokit.rest.issues.removeLabel({
				issue_number: ctx.issueNumber,
				name: labelToRemove,
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
		if (
			commentBody.includes("PM Agent Error") ||
			commentBody.includes("To-Tickets Agent Error") ||
			commentBody.includes("Feature Specification Published!") ||
			commentBody.includes("synthesized our discussion")
		) {
			continue;
		}

		const isBot = comment.user?.type === "Bot";
		const role = isBot ? "Agent" : "User";
		if (!isBot) {
			latestUserComment = commentBody;
		}
		conversation += `${role}: ${commentBody}\n\n`;
	}

	return { comments, conversation, issue, latestUserComment };
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
		await ctx.octokit.rest.issues.createComment({
			body: commentBody,
			issue_number: ctx.issueNumber,
			owner: ctx.owner,
			repo: ctx.repo,
		});
	} catch (commentError) {
		console.error(`Failed to post ${agentName} error comment:`, commentError);
	}
}
