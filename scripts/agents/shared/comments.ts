import type { IssueContext } from "../github";
import { logger } from "../logger";

export type FeedbackSourceKind = "comment" | "inline" | "review";

export interface FeedbackSource {
	kind: FeedbackSourceKind;
	rawId: string;
	replyTargetId: string;
}

export interface ReviewFeedbackContext {
	conversation: string;
	sources: Map<string, FeedbackSource>;
}

export function normalizeCommentId(
	kind: FeedbackSourceKind,
	id: string | number,
): string {
	return `${kind}:${id}`;
}

/** Fetches every PR feedback surface and keeps the source needed for a safe reply. */
export async function fetchReviewFeedback(
	ctx: IssueContext,
): Promise<ReviewFeedbackContext> {
	const request = {
		owner: ctx.owner,
		pull_number: ctx.issueNumber,
		repo: ctx.repo,
	};
	const [comments, reviews, inlineComments] = await Promise.all([
		ctx.octokit.paginate(ctx.octokit.rest.issues.listComments, {
			issue_number: ctx.issueNumber,
			owner: ctx.owner,
			repo: ctx.repo,
		}),
		ctx.octokit.paginate(ctx.octokit.rest.pulls.listReviews, request),
		ctx.octokit.paginate(ctx.octokit.rest.pulls.listReviewComments, request),
	]);

	const sources = new Map<string, FeedbackSource>();
	const sections = [
		"Top-level PR comments:",
		comments.length === 0
			? "No top-level PR comments."
			: comments
					.map((comment) => {
						const sourceId = normalizeCommentId("comment", comment.id);
						sources.set(sourceId, {
							kind: "comment",
							rawId: String(comment.id),
							replyTargetId: String(comment.id),
						});
						return `- [${sourceId}] @${comment.user?.login ?? "unknown"}: ${comment.body ?? ""}`;
					})
					.join("\n"),
		"PR review bodies:",
		reviews.length === 0
			? "No PR review bodies."
			: reviews
					.map((review) => {
						const sourceId = normalizeCommentId("review", review.id);
						sources.set(sourceId, {
							kind: "review",
							rawId: String(review.id),
							replyTargetId: String(review.id),
						});
						return `- [${sourceId}] @${review.user?.login ?? "unknown"} (${review.state ?? "unknown"}): ${review.body ?? ""}`;
					})
					.join("\n"),
		"Inline PR review comments:",
		inlineComments.length === 0
			? "No inline PR review comments."
			: inlineComments
					.map((comment) => {
						const sourceId = normalizeCommentId("inline", comment.id);
						sources.set(sourceId, {
							kind: "inline",
							rawId: String(comment.id),
							replyTargetId: String(comment.in_reply_to_id ?? comment.id),
						});
						return `- [${sourceId}] @${comment.user?.login ?? "unknown"} at **${comment.path ?? "?"}:${comment.line ?? "?"}**: ${comment.body ?? ""}`;
					})
					.join("\n"),
	];

	return {
		conversation:
			sources.size === 0 ? "No existing PR feedback." : sections.join("\n\n"),
		sources,
	};
}

/** Fetches existing inline review comments on the PR formatted as a thread list. */
export async function fetchReviewThreads(ctx: IssueContext): Promise<string> {
	try {
		const { data: comments = [] } =
			await ctx.octokit.rest.pulls.listReviewComments({
				owner: ctx.owner,
				pull_number: ctx.issueNumber,
				repo: ctx.repo,
			});

		if (comments.length === 0) return "No existing review threads.";
		return comments
			.map(
				(comment) =>
					`- **${comment.path ?? "?"}:${comment.line ?? "?"}** (${comment.user?.login ?? "unknown"}): ${comment.body ?? ""}`,
			)
			.join("\n");
	} catch (error) {
		logger.warn("Failed to fetch review threads:", error);
		return "Could not fetch existing review threads.";
	}
}
