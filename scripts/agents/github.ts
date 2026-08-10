import type * as github from "@actions/github";
import { z } from "zod";
import { logger } from "./logger";

/**
 * The pipeline's label vocabulary as one `as const` object, rather than one
 * loose exported constant per label — `LabelSchema` and `Label` both derive
 * from it, so a label can never be validated against a list that has
 * silently drifted from the values scripts actually apply.
 *
 * This is the *new* pipeline's copy (`scripts/agents/`), not the old
 * `scripts/agent-shared.ts` — that file backs the pre-teardown scripts
 * (`agent-planner.ts`, `agent-itemizer.ts`) that ticket #61 ("Final teardown
 * and label migration") deletes wholesale, and keeps its own separate,
 * un-namespaced vocabulary (`spec-needed`, `dev-needed`, …) until then. This
 * object holds only the `{role}:{status}` labels the *new* pipeline's own
 * scripts actually apply, growing one entry per ticket as each stage script
 * is built — the same incremental-registry shape as `schemas.ts`'s
 * `OUTPUTS`. A label with no TypeScript consumer (every generic `agent:*`
 * state, and every stage's own trigger label) still gets written as a plain
 * string directly in that stage's workflow YAML — `.github/workflows/*.yml`
 * can't import a TS constant, the same reason `agent-dispatch.yml` already
 * hardcodes `<!-- bot-comment -->` rather than importing `BOT_COMMENT_MARKER`.
 */
export const LABELS = {
	agentBlocked: "agent:blocked",
	agentInProgress: "agent:in-progress",
	grillNeeded: "grill:needed",
	needsInfo: "needs-info",
	specNeeded: "spec:needed",
} as const;

export const LabelSchema = z.enum(LABELS);
export type Label = z.infer<typeof LabelSchema>;

export const BOT_COMMENT_MARKER = "<!-- bot-comment -->";

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

export async function removeLabel(ctx: IssueContext, name: string) {
	try {
		await ctx.octokit.rest.issues.removeLabel({
			issue_number: ctx.issueNumber,
			name,
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

export async function removeLabelIfPresent(
	ctx: IssueContext,
	labels: Array<string | { name?: string }>,
	labelToRemove: string,
) {
	const labelNames = extractLabelNames(labels);

	if (labelNames.includes(labelToRemove)) {
		await removeLabel(ctx, labelToRemove);
	}
}

/**
 * Returns the label names that result from the transition, so a caller
 * making several transitions across one run (grill.ts's in-progress →
 * business-state → cleanup sequence) can thread the return value into the
 * next call instead of re-diffing against a snapshot that's gone stale the
 * moment the first mutation lands. Passing the original, now-stale
 * `currentLabels` to a later call would under-count what's actually
 * present — `toRemove`'s `currentNames.includes(name)` check would find a
 * label this same function just added, and skip removing it — the
 * "Call-site signature tracing" failure mode CODING_STANDARDS.md warns
 * about, here between two calls to the *same* function rather than two
 * different ones.
 */
export async function transitionState(
	ctx: IssueContext,
	currentLabels: Array<string | { name?: string }>,
	options: {
		add?: string[];
		remove?: string[];
	},
): Promise<string[]> {
	const currentNames = extractLabelNames(currentLabels);
	const toRemove = (options.remove ?? []).filter((name) =>
		currentNames.includes(name),
	);
	const toAdd = (options.add ?? []).filter(
		(name) => !currentNames.includes(name),
	);

	for (const labelToRemove of toRemove) {
		await removeLabel(ctx, labelToRemove);
	}

	if (toAdd.length > 0) {
		await ctx.octokit.rest.issues.addLabels({
			issue_number: ctx.issueNumber,
			labels: toAdd,
			owner: ctx.owner,
			repo: ctx.repo,
		});
	}

	return currentNames.filter((name) => !toRemove.includes(name)).concat(toAdd);
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
		const isBot =
			comment.user?.type === "Bot" || commentBody.includes(BOT_COMMENT_MARKER);

		if (isBot) {
			continue;
		}

		latestUserComment = commentBody;
		conversation += `User: ${commentBody}\n\n`;
	}

	return { comments, conversation, issue, latestUserComment };
}

export async function postBotComment(ctx: IssueContext, body: string) {
	await ctx.octokit.rest.issues.createComment({
		body: `${BOT_COMMENT_MARKER}\n${body}`,
		issue_number: ctx.issueNumber,
		owner: ctx.owner,
		repo: ctx.repo,
	});
}

/**
 * `GITHUB_SERVER_URL`, `GITHUB_REPOSITORY`, and `GITHUB_RUN_ID` are part of
 * every GitHub Actions job's default environment — no workflow `env:` wiring
 * required — so a failure comment can always link back to the run that
 * produced it. Returns `null` outside Actions (a local run, a test) rather
 * than a broken partial URL.
 */
export function resolveRunUrl(): string | null {
	const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
	if (!GITHUB_SERVER_URL || !GITHUB_REPOSITORY || !GITHUB_RUN_ID) return null;
	return `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
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
	const runUrl = resolveRunUrl();
	const runLine = runUrl ? `\n\n[View run](${runUrl})` : "";
	const commentBody = `⚠️ **${agentName} Error:** An error occurred while executing this workflow step.\n\n**Details:**\n\`\`\`\n${formattedDetails}\n\`\`\`${runLine}`;

	try {
		await postBotComment(ctx, commentBody);
	} catch (commentError) {
		logger.error(`Failed to post ${agentName} error comment:`, commentError);
	}
}
