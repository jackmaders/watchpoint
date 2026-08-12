import { join } from "node:path";
import { runIfMain } from "./entrypoint";
import {
	fetchIssueContext,
	type IssueContext,
	issueContextFromEnv,
	LABELS,
	postBotComment,
	resolvePatOctokit,
	transitionState,
} from "./github";
import {
	type ObjectRunOptions,
	type RunAgentResult,
	runAgent,
} from "./run-agent";
import { OUTPUTS, type WayfinderOutput, type WayfinderPlan } from "./schemas";
import { runStage } from "./stage";
import {
	type WayfinderMapRef,
	type WiredWayfinderTicket,
	wireWayfinderTickets,
} from "./wiring";

const WAYFINDER_PROMPT_FILE = join(
	import.meta.dirname,
	"prompts",
	"wayfinder.md",
);

type WayfinderRunner = (
	options: ObjectRunOptions<WayfinderOutput>,
) => Promise<RunAgentResult<WayfinderOutput>>;

type WayfinderWire = (
	ctx: IssueContext,
	map: WayfinderMapRef,
	tickets: WayfinderPlan["tickets"],
) => Promise<WiredWayfinderTicket[]>;

function issueUrl(ctx: IssueContext, number: number): string {
	return `https://github.com/${ctx.owner}/${ctx.repo}/issues/${number}`;
}

function renderList(items: readonly string[]): string {
	return items.map((item) => `- ${item}`).join("\n");
}

export function buildWayfinderMapTitle(destination: string): string {
	return `Wayfinder — ${destination}`;
}

/** Renders the map index with an intentionally empty, machine-addressable decision section. */
export function buildWayfinderMapBody(plan: WayfinderPlan): string {
	return [
		"## Destination",
		"",
		plan.destination,
		"",
		"## Notes",
		"",
		plan.notes,
		"",
		"## Decisions so far",
		"",
		"<!-- wayfinder-decisions -->",
		"",
		"## Not yet specified",
		"",
		renderList(plan.notYetSpecified),
		"",
		"## Out of scope",
		"",
		renderList(plan.outOfScope),
	].join("\n");
}

/** The final narration names only linked titles; issue numbers never become prose. */
export function buildWayfinderCompletionComment(
	ctx: IssueContext,
	map: WayfinderMapRef,
	wired: readonly WiredWayfinderTicket[],
): string {
	const tickets = wired
		.map(
			(ticket) =>
				`- [${ticket.title}](${issueUrl(ctx, ticket.number)}) — ${ticket.type}`,
		)
		.join("\n");

	return `🧭 **Wayfinder map created**\n\n[${map.title}](${map.url})\n\n${tickets}`;
}

async function createMapIssue(
	ctx: IssueContext,
	plan: WayfinderPlan,
): Promise<WayfinderMapRef> {
	const title = buildWayfinderMapTitle(plan.destination);
	const { data: created } = await ctx.octokit.rest.issues.create({
		body: buildWayfinderMapBody(plan),
		labels: [LABELS.wayfinderMap],
		owner: ctx.owner,
		repo: ctx.repo,
		title,
	});

	return {
		number: created.number,
		title: created.title ?? title,
		url: created.html_url ?? issueUrl(ctx, created.number),
	};
}

/** Applies the AFK action label with the PAT that can trigger agent-research.yml. */
async function labelResearchTickets(
	ctx: IssueContext,
	wired: readonly WiredWayfinderTicket[],
): Promise<void> {
	const researchTickets = wired.filter(
		(ticket) => ticket.type === "research" && ticket.isFrontier,
	);
	if (researchTickets.length === 0) return;

	const patOctokit = resolvePatOctokit();
	if (!patOctokit) {
		const links = researchTickets
			.map((ticket) => `[${ticket.title}](${issueUrl(ctx, ticket.number)})`)
			.join(", ");
		await postBotComment(
			ctx,
			`🚦 The Wayfinder map is wired, but \`AGENT_PAT\` isn't configured, so I can't start AFK research automatically. Please add \`${LABELS.researchNeeded}\` to: ${links}.`,
		);
		return;
	}

	const patCtx: IssueContext = { ...ctx, octokit: patOctokit };
	for (const ticket of researchTickets) {
		await patCtx.octokit.rest.issues.addLabels({
			issue_number: ticket.number,
			labels: [LABELS.researchNeeded],
			owner: patCtx.owner,
			repo: patCtx.repo,
		});
	}
}

/** Runs chart mode: one breadth-first round, or the deterministic map post-step. */
export async function runWayfinderRound(
	ctx: IssueContext,
	runner: WayfinderRunner = runAgent,
	wire: WayfinderWire = wireWayfinderTickets,
): Promise<void> {
	const { conversation, issue } = await fetchIssueContext(ctx);

	await runStage(
		ctx,
		issue.labels,
		{
			removeOnEntry: [
				LABELS.wayfinderNeeded,
				LABELS.grillWaiting,
				LABELS.needsInfo,
			],
			stageName: "Wayfinder",
		},
		async (labels) => {
			const result = await runner({
				output: OUTPUTS.wayfinder,
				promptArgs: { CONVERSATION: conversation },
				promptFile: WAYFINDER_PROMPT_FILE,
				skills: ["wayfinder"],
			});

			if (!result.output.frontierEmpty) {
				await postBotComment(ctx, result.output.roundMarkdown);
				return transitionState(ctx, labels, {
					add: [LABELS.grillWaiting],
				});
			}

			await postBotComment(ctx, result.output.roundMarkdown);
			const map = await createMapIssue(ctx, result.output);
			const wired = await wire(ctx, map, result.output.tickets);
			await postBotComment(
				ctx,
				buildWayfinderCompletionComment(ctx, map, wired),
			);
			await labelResearchTickets(ctx, wired);

			return transitionState(ctx, labels, {
				remove: [LABELS.grillWaiting],
			});
		},
	);
}

export async function run(): Promise<void> {
	await runWayfinderRound(issueContextFromEnv());
}

runIfMain(import.meta.main, run);
