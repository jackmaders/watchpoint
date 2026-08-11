import { join } from "node:path";
import { runIfMain } from "./entrypoint";
import {
	type IssueContext,
	isBotComment,
	issueContextFromEnv,
	postBotComment,
	postIssueErrorComment,
} from "./github";
import { MODELS } from "./models";
import {
	type ProseRunOptions,
	type RunAgentResult,
	runAgent,
} from "./run-agent";
import { OUTPUTS } from "./schemas";

const PING_PROMPT_FILE = join(import.meta.dirname, "prompts", "ping.md");

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			/** Optional here to merge with `tickets.ts`'s declaration, where it's genuinely absent on a label-triggered run. Always set on the `issue_comment` trigger that fires this script. */
			COMMENT_BODY?: string;
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

/** Re-exported for this module's own tests — `isBotComment` now lives in `github.ts` since `tickets.ts`'s `/approve` gate needs it too. */
export { isBotComment };

/** Ping's product is text posted verbatim, so it runs the prose form of `runAgent`. */
type ProseRunner = (
	options: ProseRunOptions,
) => Promise<RunAgentResult<string>>;

export async function dispatchPing(
	ctx: IssueContext,
	commentBody: string,
	runner: ProseRunner = runAgent,
): Promise<void> {
	if (isBotComment(commentBody) || !matchesPingCommand(commentBody)) {
		return;
	}

	try {
		const result = await runner({
			model: MODELS.ping,
			output: OUTPUTS.ping,
			promptArgs: {},
			promptFile: PING_PROMPT_FILE,
		});

		await postBotComment(ctx, result.output);
	} catch (error) {
		await postIssueErrorComment(ctx, "Dispatch", error);
	}
}

export async function run(): Promise<void> {
	await dispatchPing(issueContextFromEnv(), process.env.COMMENT_BODY ?? "");
}

runIfMain(import.meta.main, run);
