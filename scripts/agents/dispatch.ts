import * as github from "@actions/github";
import {
	BOT_COMMENT_MARKER,
	type IssueContext,
	postBotComment,
	postIssueErrorComment,
} from "./github";
import { MODELS } from "./models";
import { runAgent } from "./run-agent";

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			GITHUB_TOKEN: string;
			ISSUE_NUMBER: string;
			COMMENT_BODY: string;
		}
	}
}

/**
 * Anchored to the start of a line, never `String.includes` — the F6 bug in
 * the current planner, where a command mentioned mid-sentence fired the
 * agent unintentionally.
 */
export const PING_COMMAND_REGEX = /^\/ping\b/m;

export function matchesPingCommand(commentBody: string): boolean {
	return PING_COMMAND_REGEX.test(commentBody);
}

/**
 * The PAT used to chain workflows makes every agent comment look
 * human-authored (`user.type` is never `"Bot"`), so every reader must filter
 * on the marker instead or a bot reply could be mistaken for a new command
 * (spec §5.8).
 */
export function isBotComment(commentBody: string): boolean {
	return commentBody.includes(BOT_COMMENT_MARKER);
}

type RunAgentFn = typeof runAgent;

export async function dispatchPing(
	ctx: IssueContext,
	commentBody: string,
	run: RunAgentFn = runAgent,
): Promise<void> {
	if (isBotComment(commentBody) || !matchesPingCommand(commentBody)) {
		return;
	}

	const { cli, model } = MODELS.ping;

	try {
		const result = await run({
			cli,
			model,
			prompt: "Reply with a short, friendly pong to confirm you're online.",
		});

		await postBotComment(ctx, result.text);
	} catch (error) {
		await postIssueErrorComment(ctx, "Dispatch", error);
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

	await dispatchPing(ctx, process.env.COMMENT_BODY);
}

if (process.env.NODE_ENV !== "test") {
	run();
}
