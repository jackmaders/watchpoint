/**
 * The five ways a run can fail (spec §5.3's table). Success is the *absence* of
 * a `FailureClass`, never a member of it: `failure_reason.txt` exists only for
 * a failure, so a class meaning "fine" would tell a workflow the opposite of
 * the truth.
 */
export type FailureClass =
	| "quota"
	| "turn-limit"
	| "bad-input"
	| "bad-output"
	| "skill-miss";

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
