import type { ExecFn } from "../exec";
import type { IssueContext } from "../github";
import type { ImplementPrFeedback, Review } from "../schemas";
import type { FeedbackSource } from "./comments";

function assertCommandSucceeded(
	command: string,
	args: string[],
	result: { exitCode: number; stderr: string; stdout?: string },
): void {
	if (result.exitCode !== 0) {
		throw new Error(
			`${command} ${args.join(" ")} failed: ${result.stderr.trim() || result.stdout?.trim() || "unknown error"}`,
		);
	}
}

export function sourceUrl(ctx: IssueContext, source: FeedbackSource): string {
	const pullUrl = `https://github.com/${ctx.owner}/${ctx.repo}/pull/${ctx.issueNumber}`;
	const fragment =
		source.kind === "comment"
			? `issuecomment-${source.rawId}`
			: source.kind === "review"
				? `pullrequestreview-${source.rawId}`
				: `discussion_r${source.rawId}`;
	return `${pullUrl}#${fragment}`;
}

export function formatResponseBody(
	ctx: IssueContext,
	source: FeedbackSource,
	response: string,
): string {
	const label =
		source.kind === "inline"
			? "inline review comment"
			: source.kind === "review"
				? "PR review"
				: "PR comment";
	return `<!-- bot-comment -->\nReplying to [${label} ${source.rawId}](${sourceUrl(ctx, source)}):\n\n${response}`;
}

/** Posts automated responses to each classified feedback item using GitHub CLI. */
export async function postFeedbackResponses(
	feedback: readonly ImplementPrFeedback[],
	sources: ReadonlyMap<string, FeedbackSource>,
	ctx: IssueContext,
	exec: ExecFn,
): Promise<void> {
	for (const item of feedback) {
		const source = sources.get(item.sourceId);
		if (!source) {
			throw new Error(
				`Cannot reply to unknown feedback source id: ${item.sourceId}.`,
			);
		}
		const endpoint =
			source.kind === "inline"
				? `repos/{owner}/{repo}/pulls/comments/${source.replyTargetId}/replies`
				: `repos/{owner}/{repo}/issues/${ctx.issueNumber}/comments`;
		const args = [
			"api",
			"--method",
			"POST",
			endpoint,
			"--field",
			`body=${formatResponseBody(ctx, source, item.response)}`,
		];
		const result = await exec("gh", args);
		assertCommandSucceeded("gh", args, result);
	}
}

/** Posts replies to inline review threads. */
export async function postReviewReplies(
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
