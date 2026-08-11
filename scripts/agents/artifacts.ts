import { appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { WrittenFailure } from "./failure";

export interface UsageEntry {
	cli: string;
	model: string;
	requests: number;
	inputTokens: number;
	outputTokens: number;
}

/**
 * The directory the workflow collects a run's artifacts from, or `null` when
 * there is no workflow — a local invocation, say. Returned rather than checked
 * inside each writer so the "nowhere to write" case is decided once, and out
 * loud, by the caller.
 */
export function resolveArtifactsDir(): string | null {
	return process.env.OUTPUT_DIR ?? null;
}

/**
 * Written only on a classified failure (spec §5.3, step 7) — its absence
 * tells a workflow the run was fine. This is the one place the file's on-disk
 * shape is decided: `run-agent.ts` passes a `FailureClass` for a failure
 * inside the model run, and a stage script passes a `StageFailure` for one of
 * its own post-hoc measured failures, rather than duplicating the path and
 * format. `WrittenFailure`, never a bare `string` — an unrecognised class here
 * means a workflow reads a `failure_reason.txt` it has no branch for, so the
 * set of writable values is worth a compile error.
 */
export function writeFailureReason(
	dir: string,
	reason: WrittenFailure,
	message: string,
): void {
	writeFileSync(join(dir, "failure_reason.txt"), `${reason}\n${message}\n`);
}

/** Appended on every run, success or failure (spec §5.3, step 8). */
export function appendUsage(dir: string, entry: UsageEntry): void {
	appendFileSync(join(dir, "usage.jsonl"), `${JSON.stringify(entry)}\n`);
}
