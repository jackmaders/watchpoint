import { runIfMain } from "./entrypoint";
import {
	type IssueContext,
	issueContextFromEnv,
	LABELS,
	postBotComment,
	resolvePatOctokit,
} from "./github";
import { parseOriginatingIssueNumber } from "./review";

export interface FrontierChildIssue {
	number: number;
	state: string;
	assignees?: readonly unknown[] | null;
	issue_dependencies_summary?: {
		blocked_by: number;
	} | null;
}

export interface FrontierDecision {
	frontier: FrontierChildIssue[];
	parentComplete: boolean;
}

export function decideFrontier(
	children: readonly FrontierChildIssue[],
	newlyUnblockedChildNumbers: ReadonlySet<number>,
): FrontierDecision {
	const openChildren = children.filter((child) => child.state === "open");
	const frontier = openChildren.filter(
		(child) =>
			newlyUnblockedChildNumbers.has(child.number) &&
			child.issue_dependencies_summary?.blocked_by === 0 &&
			(child.assignees?.length ?? 0) === 0,
	);

	return { frontier, parentComplete: openChildren.length === 0 };
}

export function parseParentIssueNumber(
	body: string | null | undefined,
): number | null {
	const match = body?.match(/\bPart of\s+#(\d+)\b/i);
	return match ? Number.parseInt(match[1], 10) : null;
}

export async function runFrontier(
	ctx: IssueContext,
	pullRequestNumber = ctx.issueNumber,
): Promise<FrontierDecision> {
	const { octokit, owner, repo } = ctx;
	const { data: pullRequest } = await octokit.rest.pulls.get({
		owner,
		pull_number: pullRequestNumber,
		repo,
	});
	const ticketNumber = parseOriginatingIssueNumber(
		pullRequest.body,
		pullRequest.head.ref,
	);
	if (ticketNumber === null) {
		return { frontier: [], parentComplete: false };
	}

	const { data: ticket } = await octokit.rest.issues.get({
		issue_number: ticketNumber,
		owner,
		repo,
	});
	const parentNumber = parseParentIssueNumber(ticket.body);
	if (parentNumber === null) {
		return { frontier: [], parentComplete: false };
	}

	const newlyUnblockedChildren = await octokit.paginate(
		octokit.rest.issues.listDependenciesBlocking,
		{
			issue_number: ticketNumber,
			owner,
			repo,
		},
	);
	const newlyUnblockedChildNumbers = new Set(
		newlyUnblockedChildren.map((child) => child.number),
	);

	const children = await octokit.paginate(octokit.rest.issues.listSubIssues, {
		issue_number: parentNumber,
		owner,
		repo,
	});
	const decision = decideFrontier(children, newlyUnblockedChildNumbers);

	if (decision.parentComplete) {
		await postBotComment(
			{ ...ctx, issueNumber: parentNumber },
			"🏁 **Frontier complete**\n\nAll child tickets for this parent are closed.",
		);
		await octokit.rest.issues.update({
			issue_number: parentNumber,
			owner,
			repo,
			state: "closed",
			state_reason: "completed",
		});
		return decision;
	}

	if (decision.frontier.length === 0) return decision;

	const patOctokit = resolvePatOctokit();
	if (!patOctokit) {
		await postBotComment(
			{ ...ctx, issueNumber: ticketNumber },
			`🚦 The merge unblocked tickets, but \`AGENT_PAT\` isn't configured, so I can't label them automatically. Please add \`${LABELS.devNeeded}\` to: ${decision.frontier.map((child) => `#${child.number}`).join(", ")}.`,
		);
		return decision;
	}

	for (const child of decision.frontier) {
		await patOctokit.rest.issues.addLabels({
			issue_number: child.number,
			labels: [LABELS.devNeeded],
			owner,
			repo,
		});
	}

	return decision;
}

export async function run(): Promise<void> {
	const ctx = issueContextFromEnv();
	await runFrontier(ctx);
}

runIfMain(import.meta.main, run);
