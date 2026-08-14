import {
	type IssueContext,
	postBotComment,
	resolvePatOctokit,
} from "../github";

export interface ChainLabelOptions {
	fallbackMessage: string;
	issueNumber?: number;
	label: string;
}

export interface ChainLabelsOptions {
	fallbackMessage: string;
	issueNumbers: readonly number[];
	label: string;
}

/** Resolves an IssueContext backed by PAT if AGENT_PAT is configured. */
export function resolvePatContext(ctx: IssueContext): {
	context: IssueContext;
	hasPat: boolean;
} {
	const patOctokit = resolvePatOctokit();
	return {
		context: patOctokit ? { ...ctx, octokit: patOctokit } : ctx,
		hasPat: patOctokit !== null,
	};
}

/** Chains workflow execution by adding a label using AGENT_PAT, or posts a human fallback comment. */
export async function chainLabel(
	ctx: IssueContext,
	options: ChainLabelOptions,
): Promise<boolean> {
	const patOctokit = resolvePatOctokit();
	if (!patOctokit) {
		await postBotComment(ctx, options.fallbackMessage);
		return false;
	}

	await patOctokit.rest.issues.addLabels({
		issue_number: options.issueNumber ?? ctx.issueNumber,
		labels: [options.label],
		owner: ctx.owner,
		repo: ctx.repo,
	});
	return true;
}

/** Chains workflow execution by adding a label across multiple issues, or posts a human fallback comment. */
export async function chainLabels(
	ctx: IssueContext,
	options: ChainLabelsOptions,
): Promise<boolean> {
	const patOctokit = resolvePatOctokit();
	if (!patOctokit) {
		await postBotComment(ctx, options.fallbackMessage);
		return false;
	}

	await Promise.all(
		options.issueNumbers.map((issueNumber) =>
			patOctokit.rest.issues.addLabels({
				issue_number: issueNumber,
				labels: [options.label],
				owner: ctx.owner,
				repo: ctx.repo,
			}),
		),
	);
	return true;
}
