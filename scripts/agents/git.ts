import type { ExecFn } from "./exec";
import { StageError } from "./failure";

/**
 * The git operations `implement.ts` (and, later, `implement-pr.ts`) needs to
 * measure and mutate a branch without ever asking the model to self-report
 * either (spec §5.4, "never ask the model for a fact the workflow can
 * measure"). Every function here is parameterised by an `ExecFn`, the same
 * injected-subprocess shape `run-agent.ts` uses for `spawn` — no real git
 * repository, network access, or subprocess in a test.
 *
 * Which is also this module's standing hazard: a stubbed `exec` will happily
 * report success for a command real git would reject, so a test here proves the
 * argument list is what we meant to send, never that git accepts it. Anything
 * that turns on git's own semantics belongs in a comment citing the manual, and
 * every argument list below is deliberately plain for that reason.
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
 * Creates `branchName` from `origin/main`'s current tip — never from whatever
 * ref the runner happens to have checked out — and returns that tip's sha, the
 * base `countCommits` measures the run's commits against. The sha, rather than
 * the `origin/main` ref itself: the agent runs with the whole repository at its
 * disposal, so a `git fetch` of its own during the run could move that ref and
 * silently undercount.
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

const REJECTED_PATTERN = /non-fast-forward|rejected|stale info|fetch first/i;

/**
 * Pushes the run's branch, plainly and without force of any kind. The branch
 * was created from `origin/main` moments ago in this same run, so the only way
 * the remote ref can already exist is a previous run of this same ticket that
 * got further than this one — and a plain push already refuses that as a
 * non-fast-forward, which is exactly the outcome wanted. There is nothing here
 * a lease could protect that the absence of `--force` doesn't.
 *
 * (It cannot be a lease pinned to the branch's starting sha, which is what
 * this originally did: `--force-with-lease=<ref>:<expect>` requires the remote
 * ref to *currently equal* `<expect>`, and only an empty `<expect>` means "must
 * not exist" — see git-push(1). On the first push of a new branch the remote
 * ref doesn't exist, so a lease naming `origin/main`'s tip is never satisfied
 * and every first push is rejected as `stale info`.)
 *
 * A rejection is thrown as a `push-race` `StageError` — classified here, at
 * the throw site, where the evidence is; any other failure keeps the raw git
 * error and stays unclassified.
 */
export async function pushBranch(
	exec: ExecFn,
	branchName: string,
): Promise<void> {
	const result = await exec("git", ["push", "origin", branchName]);
	if (result.exitCode === 0) return;

	if (REJECTED_PATTERN.test(result.stderr)) {
		throw new StageError(
			"push-race",
			`Branch ${branchName} already exists on the remote with commits this run doesn't have — a previous run of this ticket got further. Close or delete that branch, then re-add dev:needed to retry.\n${result.stderr}`,
		);
	}
	throw new Error(`git push failed:\n${result.stderr || result.stdout}`);
}
