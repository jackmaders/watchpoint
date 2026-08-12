import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { runIfMain } from "./entrypoint";
import { defaultExec, type ExecFn } from "./exec";
import { buildBranchName, createBranchFromMain, pushBranch } from "./git";
import {
	claimIssue,
	fetchIssueContext,
	type IssueContext,
	issueContextFromEnv,
	LABELS,
	postBotComment,
	transitionState,
} from "./github";
import {
	type ObjectRunOptions,
	type RunAgentResult,
	runAgent,
} from "./run-agent";
import { OUTPUTS, type Research } from "./schemas";
import { runStage } from "./stage";
import { extractWayfinderMapNumber } from "./wiring";

const RESEARCH_PROMPT_FILE = join(
	import.meta.dirname,
	"prompts",
	"research.md",
);
const RESEARCH_SLUG_LENGTH = 60;
const DECISIONS_MARKER = "<!-- wayfinder-decisions -->";

type ResearchRunner = (
	options: ObjectRunOptions<Research>,
) => Promise<RunAgentResult<Research>>;
type WriteArtifact = (path: string, contents: string) => void;

function slugify(value: string): string {
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, RESEARCH_SLUG_LENGTH)
			.replace(/-+$/, "") || "ticket"
	);
}

export function buildResearchBranchName(
	issueNumber: number,
	title: string,
): string {
	return buildBranchName(issueNumber, title).replace(/^agent\//, "research/");
}

export function buildResearchFilePath(
	issueNumber: number,
	title: string,
): string {
	return `research/${issueNumber}-${slugify(title)}.md`;
}

export function buildResearchArtifact(
	title: string,
	research: Research,
): string {
	const sources = research.sources
		.map((source) => `- [${source.title}](${source.url})`)
		.join("\n");
	return `# ${title}\n\n${research.findingsMarkdown}\n\n## Sources\n\n${sources}\n`;
}

export function buildResearchResolutionComment(
	title: string,
	ticketUrl: string,
	research: Research,
	findingsUrl: string,
): string {
	const sources = research.sources
		.map((source) => `- [${source.title}](${source.url})`)
		.join("\n");
	return `🔎 **Research resolved**\n\n[${title}](${ticketUrl})\n\n${research.findingsMarkdown}\n\n[Findings file](${findingsUrl})\n\n## Sources\n\n${sources}`;
}

export function appendWayfinderDecision(
	mapBody: string,
	ticketTitle: string,
	ticketUrl: string,
	findingsUrl: string,
): string {
	const pointerMarker = `<!-- wayfinder-decision: ${ticketUrl} -->`;
	if (mapBody.includes(pointerMarker)) return mapBody;

	const pointer = `${pointerMarker}\n- [${ticketTitle}](${ticketUrl}) — [Research findings](${findingsUrl})`;
	if (mapBody.includes(DECISIONS_MARKER)) {
		return mapBody.replace(DECISIONS_MARKER, `${DECISIONS_MARKER}\n${pointer}`);
	}

	return `${mapBody.trimEnd()}\n\n## Decisions so far\n\n${pointer}\n`;
}

function issueUrl(ctx: IssueContext, issueNumber: number): string {
	return `https://github.com/${ctx.owner}/${ctx.repo}/issues/${issueNumber}`;
}

function findingsUrl(
	ctx: IssueContext,
	branchName: string,
	filePath: string,
): string {
	return `https://github.com/${ctx.owner}/${ctx.repo}/blob/${branchName}/${filePath}`;
}

function writeResearchArtifact(path: string, contents: string): void {
	const absolutePath = join(process.cwd(), path);
	mkdirSync(dirname(absolutePath), { recursive: true });
	writeFileSync(absolutePath, contents, "utf-8");
}

async function runGitOrThrow(exec: ExecFn, args: string[]): Promise<void> {
	const result = await exec("git", args);
	if (result.exitCode !== 0) {
		throw new Error(
			`git ${args.join(" ")} failed:\n${result.stderr || result.stdout}`,
		);
	}
}

async function commitResearchArtifact(
	exec: ExecFn,
	filePath: string,
	title: string,
): Promise<void> {
	await runGitOrThrow(exec, ["add", "--", filePath]);
	await runGitOrThrow(exec, [
		"commit",
		"-m",
		`docs(research): 🔎 capture ${title}`,
	]);
}

async function fetchMapIssue(
	ctx: IssueContext,
	mapNumber: number,
): Promise<{ body: string; number: number; title: string; url: string }> {
	const { data: map } = await ctx.octokit.rest.issues.get({
		issue_number: mapNumber,
		owner: ctx.owner,
		repo: ctx.repo,
	});
	return {
		body: map.body ?? "",
		number: map.number,
		title: map.title,
		url: map.html_url ?? issueUrl(ctx, map.number),
	};
}

/** Resolves one AFK research ticket, with assignment as the first mutation. */
export async function runResearchTicket(
	ctx: IssueContext,
	runner: ResearchRunner = runAgent,
	exec: ExecFn = defaultExec,
	writeArtifact: WriteArtifact = writeResearchArtifact,
): Promise<void> {
	const { conversation, issue } = await fetchIssueContext(ctx);
	await claimIssue(ctx);

	await runStage(
		ctx,
		issue.labels,
		{
			removeOnEntry: [LABELS.researchNeeded],
			stageName: "Research",
		},
		async (labels) => {
			const mapNumber = extractWayfinderMapNumber(issue.body ?? "");
			if (mapNumber === null) {
				throw new Error(
					"Research ticket does not identify a Wayfinder map in its body.",
				);
			}

			const result = await runner({
				output: OUTPUTS.research,
				promptArgs: { CONVERSATION: conversation },
				promptFile: RESEARCH_PROMPT_FILE,
				skills: ["research"],
			});
			const map = await fetchMapIssue(ctx, mapNumber);
			const branchName = buildResearchBranchName(ctx.issueNumber, issue.title);
			const filePath = buildResearchFilePath(ctx.issueNumber, issue.title);

			await createBranchFromMain(exec, branchName);
			writeArtifact(
				filePath,
				buildResearchArtifact(issue.title, result.output),
			);
			await commitResearchArtifact(exec, filePath, issue.title);
			await pushBranch(exec, branchName);

			const ticketUrl = issue.html_url ?? issueUrl(ctx, ctx.issueNumber);
			const artifactUrl = findingsUrl(ctx, branchName, filePath);
			await postBotComment(
				ctx,
				buildResearchResolutionComment(
					issue.title,
					ticketUrl,
					result.output,
					artifactUrl,
				),
			);
			await ctx.octokit.rest.issues.update({
				issue_number: ctx.issueNumber,
				owner: ctx.owner,
				repo: ctx.repo,
				state: "closed",
				state_reason: "completed",
			});
			await ctx.octokit.rest.issues.update({
				body: appendWayfinderDecision(
					map.body,
					issue.title,
					ticketUrl,
					artifactUrl,
				),
				issue_number: map.number,
				owner: ctx.owner,
				repo: ctx.repo,
			});

			return transitionState(ctx, labels, {});
		},
	);
}

export async function run(): Promise<void> {
	await runResearchTicket(issueContextFromEnv());
}

runIfMain(import.meta.main, run);
