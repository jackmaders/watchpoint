import { join } from "node:path";
import { runIfMain } from "./entrypoint";
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
import { MODELS } from "./models";
import {
	type ObjectRunOptions,
	type RunAgentResult,
	runAgent,
} from "./run-agent";
import { type GrillRound, OUTPUTS } from "./schemas";
import { runStage } from "./stage";

const GRILL_PROMPT_FILE = join(import.meta.dirname, "prompts", "grill.md");

/** Grill's product is `GrillRoundSchema`, so it runs the object form of `runAgent`. */
type GrillRunner = (
	options: ObjectRunOptions<GrillRound>,
) => Promise<RunAgentResult<GrillRound>>;

/**
 * `transitionState`'s label-array parameter, matching what `fetchIssueContext`
 * hands back on `issue.labels` — named here so `chainToSpec`'s signature
 * doesn't have to spell out octokit's own label-response shape.
 */
type IssueLabels = Parameters<typeof transitionState>[1];

/**
 * Adding `spec:needed` must fire `agent-spec.yml`, which a label applied with
 * the default `GITHUB_TOKEN` cannot do (spec §5.8) — so this either
 * authenticates as `AGENT_PAT` and performs the transition, or leaves the
 * labels alone entirely and asks the maintainer to do it by hand. Applying
 * the label anyway with the wrong token would leave `spec:needed` sitting on
 * the issue with nothing ever picking it up, which is harder to notice than
 * a label that was never applied.
 *
 * Returns the resulting label names either way, so `runStage`'s `finally`
 * still has an accurate snapshot to remove `agent:in-progress` from, whether
 * or not the chain actually ran.
 */
async function chainToSpec(
	ctx: IssueContext,
	currentLabels: IssueLabels,
): Promise<string[]> {
	const patOctokit = resolvePatOctokit();
	if (!patOctokit) {
		await postBotComment(
			ctx,
			`🚦 The grilling frontier is empty, but \`AGENT_PAT\` isn't configured, so I can't chain to the spec stage automatically. Please add the \`${LABELS.specNeeded}\` label yourself to continue.`,
		);
		return extractLabelNames(currentLabels);
	}

	const chainCtx: IssueContext = { ...ctx, octokit: patOctokit };
	return transitionState(chainCtx, currentLabels, {
		add: [LABELS.specNeeded],
		remove: [LABELS.needsInfo],
	});
}

/**
 * Runs one round of the asynchronous grill loop (spec §5.8, design doc §3.6
 * Stage 2): fetch the conversation so far, run the `grilling` skill, post
 * the round, and either wait for the next human reply or chain to `spec`.
 *
 * A failed run does not swallow its error the way `dispatchPing` does —
 * grilling manages real pipeline state, so `runStage` applies `agent:blocked`
 * and rethrows, leaving the workflow step itself red as well as the label.
 */
export async function runGrillRound(
	ctx: IssueContext,
	runner: GrillRunner = runAgent,
): Promise<void> {
	const { conversation, issue } = await fetchIssueContext(ctx);

	await runStage(
		ctx,
		issue.labels,
		{ removeOnEntry: [LABELS.grillNeeded], stageName: "Grill" },
		async (labels) => {
			const result = await runner({
				expectSkill: "grilling",
				model: MODELS.grill,
				output: OUTPUTS.grill,
				promptArgs: { CONVERSATION: conversation },
				promptFile: GRILL_PROMPT_FILE,
			});

			await postBotComment(ctx, result.output.roundMarkdown);

			return result.output.frontierEmpty
				? await chainToSpec(ctx, labels)
				: await transitionState(ctx, labels, { add: [LABELS.needsInfo] });
		},
	);
}

export async function run(): Promise<void> {
	await runGrillRound(issueContextFromEnv());
}

runIfMain(import.meta.main, run);
