import { join } from "node:path";
import { runIfMain } from "./entrypoint";
import {
	type IssueContext,
	isBotComment,
	issueContextFromEnv,
	postBotComment,
	postIssueErrorComment,
} from "./github";
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
			COMMENT_BODY?: string;
		}
	}
}

export const PING_COMMAND_REGEX = /^\/ping\b/m;

export function matchesPingCommand(commentBody: string): boolean {
	return PING_COMMAND_REGEX.test(commentBody);
}

export { isBotComment };

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
