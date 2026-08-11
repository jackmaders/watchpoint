import type { ExecFn } from "./exec";

/**
 * The git operations `implement.ts` (and, later, `implement-pr.ts`) needs to
 * measure and mutate a branch without ever asking the model to self-report
 * either (spec §5.4, "never ask the model for a fact the workflow can
 * measure"). Every function here is parameterised by an `ExecFn`, the same
 * injected-subprocess shape `run-agent.ts` uses for `spawn` — no real git
 * repository, network access, or subprocess in a test.
 */

const MAX_SLUG_LENGTH = 50;

/** Runs one command, throwing the command and both streams on a non-zero exit rather than a result callers have to re-check. */
async function runOrThrow(
	exec: ExecFn,
	command: string,
	args: string[],
): Promise<string> {
	const result = await exec(command, args);
	if (result.exitCode !== 0) {
		throw new Error(
			`${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`,
		);
	}
	return result.stdout.trim();
}

/**
 * `agent/issue-<n>-<slug>` (ticket #57's acceptance criteria) — lowercased,
 * hyphenated, and bounded so a very long or punctuation-only title can't
 * produce an unusable or ref-name-illegal branch.
 */
export function buildBranchName(issueNumber: number, title: string): string {
	const slug = title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, MAX_SLUG_LENGTH)
		.replace(/-+$/, "");
	return `agent/issue-${issueNumber}-${slug || "ticket"}`;
}

/**
 * Creates `branchName` from `origin/main`'s current tip — never from
 * whatever ref the runner happens to have checked out — and returns that
 * tip's sha, the "run's starting sha" `pushBranch` later pins its
 * `--force-with-lease` to.
 */
export async function createBranchFromMain(
	exec: ExecFn,
	branchName: string,
): Promise<string> {
	await runOrThrow(exec, "git", ["fetch", "origin", "main"]);
	await runOrThrow(exec, "git", ["switch", "-c", branchName, "origin/main"]);
	return runOrThrow(exec, "git", ["rev-parse", "HEAD"]);
}

/** `git rev-list --count` against the branch's own starting sha — measured, never self-reported (spec §5.4). */
export async function countCommits(
	exec: ExecFn,
	baseSha: string,
): Promise<number> {
	const count = await runOrThrow(exec, "git", [
		"rev-list",
		"--count",
		`${baseSha}..HEAD`,
	]);
	return Number.parseInt(count, 10);
}

const RACE_PATTERN = /non-fast-forward|rejected|stale info/i;

/**
 * Pushes with `--force-with-lease` pinned to `branchHeadSha` — the sha
 * `createBranchFromMain` captured before the agent made any commits — so a
 * push that lands on top of a branch something else advanced in the
 * meantime fails loudly instead of silently overwriting it. A failure whose
 * stderr matches the race pattern is re-thrown as a specific, actionable
 * message; any other failure keeps the raw git error.
 */
export async function pushBranch(
	exec: ExecFn,
	branchName: string,
	branchHeadSha: string,
): Promise<void> {
	const lease = `refs/heads/${branchName}:${branchHeadSha}`;
	const result = await exec("git", [
		"push",
		`--force-with-lease=${lease}`,
		"origin",
		branchName,
	]);
	if (result.exitCode === 0) return;

	if (RACE_PATTERN.test(result.stderr)) {
		throw new Error(
			`Branch ${branchName} advanced during the run — re-add dev:needed to retry.\n${result.stderr}`,
		);
	}
	throw new Error(`git push failed:\n${result.stderr || result.stdout}`);
}
