import type { CandidateIssue, MockIssueSpec } from "./types";

export function createMockIssueDAG(
	specs: readonly MockIssueSpec[],
): CandidateIssue[] {
	return specs.map((spec) => {
		const blockedBy =
			typeof spec.blockedBy === "number"
				? spec.blockedBy
				: Array.isArray(spec.blockedBy)
					? spec.blockedBy.length
					: 0;

		return {
			assignees: spec.assignees ?? [],
			body: spec.body ?? "",
			createdAt: spec.createdAt,
			issueDependenciesSummary: {
				blockedBy,
			},
			labels: spec.labels ?? ["ready-for-agent"],
			number: spec.number,
			title: spec.title ?? `Issue #${spec.number}`,
			url: spec.url,
		};
	});
}

function compareCandidateIssues(a: CandidateIssue, b: CandidateIssue): number {
	if (a.createdAt && b.createdAt) {
		const timeDiff =
			new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
		if (timeDiff !== 0) {
			return timeDiff;
		}
	} else if (a.createdAt) {
		return -1;
	} else if (b.createdAt) {
		return 1;
	}
	return a.number - b.number;
}

export function resolveFrontier(
	issues: readonly CandidateIssue[],
): CandidateIssue[] {
	const unblockedAndUnclaimed = issues.filter(
		(issue) =>
			issue.assignees.length === 0 &&
			issue.issueDependenciesSummary.blockedBy === 0,
	);

	return [...unblockedAndUnclaimed].sort(compareCandidateIssues);
}
