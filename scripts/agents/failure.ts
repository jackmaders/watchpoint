/**
 * The six ways a run can fail (spec §5.3's table). Success is the *absence* of
 * a `FailureClass`, never a member of it: `failure_reason.txt` exists only for
 * a failure, so a class meaning "fine" would tell a workflow the opposite of
 * the truth.
 */
export type FailureClass =
	| "quota"
	| "turn-limit"
	| "bad-input"
	| "bad-output"
	| "skill-miss"
	| "timeout";

/** The subset an exit code on its own is evidence for. */
export type ExitFailure = Extract<
	FailureClass,
	"quota" | "turn-limit" | "bad-input"
>;

const QUOTA_PATTERN = /rate.?limit|quota/i;

/**
 * Total over every exit code: anything the spec's table does not name comes
 * back `"unclassified"` — a genuine CLI or API failure (§5.1) that must fail
 * loudly rather than be filed under the nearest-looking class.
 *
 * Reads `stderr` alone, never the whole transcript. The transcript carries the
 * model's own output, which echoes `promptArgs` back — so classifying on it
 * would let an issue body that merely mentions a rate limit turn an unrelated
 * crash into a `quota` failure.
 */
export function classifyExit(
	exitCode: number,
	stderr: string,
): ExitFailure | "unclassified" {
	if (exitCode === 42) return "bad-input";
	if (exitCode === 53) return "turn-limit";
	if (exitCode === 1 && QUOTA_PATTERN.test(stderr)) return "quota";
	return "unclassified";
}

export class RunAgentError extends Error {
	readonly failureClass: FailureClass;

	constructor(failureClass: FailureClass, message: string) {
		super(message);
		this.name = "RunAgentError";
		this.failureClass = failureClass;
	}
}

/**
 * The ways a *stage* can fail after its model run already succeeded — each one
 * a fact the workflow measured itself (`git rev-list`, `bun run validate`'s
 * exit code, `git push`'s rejection), never self-reported by the model (spec
 * §5.4). Kept as one `as const` for the same reason `schemas.ts` derives every
 * enum from one: a class that exists only as a string literal at a throw site
 * can drift from the list a reader consults, and nothing catches it.
 */
export const STAGE_FAILURES = [
	"no-commits",
	"validate-failed",
	"push-race",
] as const;
export type StageFailure = (typeof STAGE_FAILURES)[number];

/**
 * Carries its classification from the throw site, exactly as `RunAgentError`
 * does. The alternative — a catch-all that re-derives the class by matching
 * substrings of `error.message` — makes every one of those messages a silent
 * API: rewording "no commits were made" in one module would downgrade the
 * failure to `unclassified` in another, with no type error and no failing test.
 */
export class StageError extends Error {
	readonly failureClass: StageFailure;

	constructor(failureClass: StageFailure, message: string) {
		super(message);
		this.name = "StageError";
		this.failureClass = failureClass;
	}
}

/**
 * Every value `failure_reason.txt`'s first line can hold: a failure inside the
 * model run, a failure the stage measured after it, or `"unclassified"` for a
 * rejection with no known shape — the same sentinel `classifyExit` returns
 * when the spec's table doesn't name an exit code. Named once here so
 * `artifacts.ts` states the file's vocabulary in a single type instead of
 * accepting any `string`.
 */
export type WrittenFailure = FailureClass | StageFailure | "unclassified";
