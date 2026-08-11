import { defaultExec, type ExecFn } from "./exec";
import type { InlineComment, Review } from "./schemas";

interface DiffState {
	path: string;
	rightLine: number;
}

function updateDiffHeader(line: string, state: DiffState): boolean {
	if (line.startsWith("+++ ")) {
		const path = line.slice(4);
		state.path = path === "/dev/null" ? "" : path.replace(/^b\//, "");
		return true;
	}

	if (line.startsWith("@@ ")) {
		const match = line.match(/^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
		if (match) state.rightLine = Number.parseInt(match[1], 10);
		return true;
	}

	return false;
}

function addDiffLine(
	line: string,
	state: DiffState,
	validLines: Set<string>,
): void {
	if (!state.path || state.rightLine < 1) return;

	if (line.startsWith("+") || line.startsWith(" ")) {
		validLines.add(`${state.path}:${state.rightLine}`);
		state.rightLine += 1;
		return;
	}

	if (!line.startsWith("-")) state.rightLine += 1;
}

/** Returns path/line keys that GitHub can accept on the diff's right side. */
export function parseDiff(diffText: string): Set<string> {
	const validLines = new Set<string>();
	const state: DiffState = { path: "", rightLine: 0 };

	for (const line of diffText.split(/\r?\n/)) {
		if (updateDiffHeader(line, state)) continue;
		addDiffLine(line, state, validLines);
	}

	return validLines;
}

function assertCommandSucceeded(
	command: string,
	args: string[],
	result: { exitCode: number; stderr: string },
): void {
	if (result.exitCode !== 0) {
		throw new Error(
			`${command} ${args.join(" ")} failed: ${result.stderr.trim() || "unknown error"}`,
		);
	}
}

export async function getReviewDiff(
	exec: ExecFn = defaultExec,
): Promise<{ diff: string; validLines: Set<string> }> {
	const fetchArgs = ["fetch", "origin", "main"];
	const fetchResult = await exec("git", fetchArgs);
	assertCommandSucceeded("git", fetchArgs, fetchResult);

	const mergeBaseArgs = ["merge-base", "origin/main", "HEAD"];
	const mergeBaseResult = await exec("git", mergeBaseArgs);
	assertCommandSucceeded("git", mergeBaseArgs, mergeBaseResult);
	const mergeBase = mergeBaseResult.stdout.trim();
	if (!mergeBase) throw new Error("git merge-base failed: empty merge-base");

	const diffArgs = ["diff", mergeBase, "HEAD"];
	const diffResult = await exec("git", diffArgs);
	assertCommandSucceeded("git", diffArgs, diffResult);

	return { diff: diffResult.stdout, validLines: parseDiff(diffResult.stdout) };
}

/** Finds the issue that a generated pull request claims to implement. */
export function parseOriginatingIssueNumber(
	prBody: string | null,
	headRef: string,
): number | null {
	const bodyMatch = prBody?.match(/\b(?:closes|fixes|resolves)\s+#(\d+)\b/i);
	if (bodyMatch) return Number.parseInt(bodyMatch[1], 10);

	const branchMatch = headRef.match(/^agent\/issue-(\d+)-/);
	return branchMatch ? Number.parseInt(branchMatch[1], 10) : null;
}

export interface ReviewPayload {
	body: string;
	comments: Array<Pick<InlineComment, "body" | "line" | "path">>;
	event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT";
}

/** Composes the two axis reports without combining their verdicts or findings. */
export function buildReviewBody(
	standards: Review,
	standardsDropped: number,
	spec: Review,
	specDropped: number,
): string {
	return `## Standards Review

**Verdict:** ${standards.verdict}
${standards.summary}

*Inline comments: ${standards.inlineComments.length} posted, ${standardsDropped} dropped.*

## Spec Review

**Verdict:** ${spec.verdict}
${spec.summary}

*Inline comments: ${spec.inlineComments.length} posted, ${specDropped} dropped.*`;
}

/** Builds the single GitHub review request from both independently-reviewed axes. */
export function buildReviewPayload(
	standards: Review,
	spec: Review,
	comments: readonly InlineComment[],
	_replies: readonly Review["replies"][number][],
): ReviewPayload {
	const changesRequested =
		standards.verdict === "changes-requested" ||
		spec.verdict === "changes-requested";

	return {
		body: "",
		comments: comments.map(({ body, line, path }) => ({ body, line, path })),
		event: changesRequested ? "REQUEST_CHANGES" : "APPROVE",
	};
}
