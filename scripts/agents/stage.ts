import {
	type IssueContext,
	LABELS,
	postIssueErrorComment,
	transitionState,
} from "./github";

/**
 * The one shape every pipeline stage's top-level function repeats (spec §5.8):
 * enter with `agent:in-progress` and the stage's own entry-label cleanup, run
 * the stage's real work, and on failure add `agent:blocked`, post the error
 * comment, and rethrow — always removing `agent:in-progress` in a `finally`,
 * whichever way the stage ended. `grill.ts`, `spec.ts`, `tickets.ts` (twice),
 * and `implement.ts` each wrote this out by hand; this is that shape, once.
 *
 * `body` returns the label names in effect after its own work — every stage's
 * body makes further `transitionState` calls of its own (adding
 * `spec:ready`, chaining to the next stage, and so on), and `finally` needs
 * that up-to-date snapshot, not the stale one from before `body` ran, to
 * decide whether `agent:in-progress` is actually still present to remove
 * (CODING_STANDARDS.md, "Call-site signature tracing").
 */
export async function runStage(
	ctx: IssueContext,
	currentLabels: Array<string | { name?: string }>,
	options: {
		/** Named in the posted error comment — "Grill", "Implement", and so on. */
		stageName: string;
		/** Removed on entry, alongside `agent:blocked` — the stage's own trigger label(s). */
		removeOnEntry?: string[];
		/** Runs before `agent:blocked` is applied — a stage's own artifact write on a measured, post-hoc failure. */
		onFailure?: (error: unknown) => void;
	},
	body: (labels: string[]) => Promise<string[]>,
): Promise<void> {
	let labels = await transitionState(ctx, currentLabels, {
		add: [LABELS.agentInProgress],
		remove: [...(options.removeOnEntry ?? []), LABELS.agentBlocked],
	});

	try {
		labels = await body(labels);
	} catch (error) {
		options.onFailure?.(error);
		labels = await transitionState(ctx, labels, {
			add: [LABELS.agentBlocked],
		});
		await postIssueErrorComment(ctx, options.stageName, error);
		throw error;
	} finally {
		await transitionState(ctx, labels, { remove: [LABELS.agentInProgress] });
	}
}
