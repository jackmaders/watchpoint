import { appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { FailureClass } from "./failure";

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

/** Written only on a classified failure (spec §5.3, step 7) — its absence tells a workflow the run was fine. */
export function writeFailureReason(
	dir: string,
	failureClass: FailureClass,
	message: string,
): void {
	writeFileSync(
		join(dir, "failure_reason.txt"),
		`${failureClass}\n${message}\n`,
	);
}

/** Appended on every run, success or failure (spec §5.3, step 8). */
export function appendUsage(dir: string, entry: UsageEntry): void {
	appendFileSync(join(dir, "usage.jsonl"), `${JSON.stringify(entry)}\n`);
}
