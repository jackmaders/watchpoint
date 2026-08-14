import {
	type IssueContext,
	LABELS,
	postBotComment,
	transitionState,
} from "../github";

export const TRUSTED_AUTHOR_ASSOCIATIONS = [
	"OWNER",
	"MEMBER",
	"COLLABORATOR",
] as const;

export type TrustedAuthorAssociation =
	(typeof TRUSTED_AUTHOR_ASSOCIATIONS)[number];

type IssueLabels = Parameters<typeof transitionState>[1];

/** Returns true if the PR author association is OWNER, MEMBER, or COLLABORATOR. */
export function isTrustedAuthor(
	authorAssociation: string | null | undefined,
): boolean {
	return (
		typeof authorAssociation === "string" &&
		(TRUSTED_AUTHOR_ASSOCIATIONS as readonly string[]).includes(
			authorAssociation,
		)
	);
}

/** Transitions a PR from an untrusted author to review:escalated with an explanatory comment. */
export async function escalateUntrustedPr(
	ctx: IssueContext,
	labels: IssueLabels,
	reason?: string,
): Promise<string[]> {
	const nextLabels = await transitionState(ctx, labels, {
		add: [LABELS.reviewEscalated],
		remove: [LABELS.devNeeded, LABELS.reviewNeeded],
	});
	await postBotComment(
		ctx,
		reason ??
			"🚦 This PR is from an untrusted author, so automated PR mutation is disabled. A human must review it.",
	);
	return nextLabels;
}

/** Transitions an issue/PR to review:escalated with a human escalation reason. */
export async function escalateToHuman(
	ctx: IssueContext,
	labels: IssueLabels,
	reason: string,
): Promise<string[]> {
	const nextLabels = await transitionState(ctx, labels, {
		add: [LABELS.reviewEscalated],
		remove: [LABELS.devNeeded, LABELS.reviewNeeded],
	});
	await postBotComment(ctx, `⚠️ **Human review required:** ${reason}`);
	return nextLabels;
}
