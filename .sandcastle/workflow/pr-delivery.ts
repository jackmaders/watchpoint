import { defaultBunSpawnRunner } from "../github/client";
import type { PullRequestResult } from "../github/types";
import type { DeliverPullRequestOptions } from "./types";

export function formatPrBody(options: {
	readonly issueNumber: number;
	readonly branch: string;
	readonly attempts: number;
}): string {
	return `## Summary

Automated resolution for #${options.issueNumber} via Sandcastle Autonomous Agent.

Closes #${options.issueNumber}

### Execution Details
- **Target Branch**: \`${options.branch}\`
- **Self-healing attempts**: ${options.attempts}
- **Verification**: \`bun run validate\` passed.
`;
}

export async function deliverPullRequest(
	options: DeliverPullRequestOptions,
): Promise<PullRequestResult> {
	const runner = options.gitRunner ?? defaultBunSpawnRunner;

	const pushRes = await runner(
		["git", "push", "-u", "origin", options.branch],
		{ cwd: options.cwd },
	);

	if (pushRes.exitCode !== 0) {
		const errorMsg = pushRes.stderr || pushRes.stdout;
		throw new Error(
			`Failed to push branch '${options.branch}': ${errorMsg.trim()}`,
		);
	}

	const body = formatPrBody({
		attempts: options.attempts,
		branch: options.branch,
		issueNumber: options.issue.number,
	});

	return options.githubClient.createPullRequest({
		base: options.baseBranch ?? "main",
		body,
		head: options.branch,
		labels: ["ready-for-human"],
		title: options.issue.title,
	});
}
