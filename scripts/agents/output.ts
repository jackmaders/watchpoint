import type { z } from "zod";

export const DEFAULT_COMPLETION_SIGNAL = "<promise>COMPLETE</promise>";

/** Structured output: a tagged JSON payload, validated against `schema`. */
export interface ObjectOutput<T> {
	kind: "object";
	tag: string;
	schema: z.ZodType<T>;
}

/**
 * §5.3's rule made a type: no stage script may act on a raw string. `prose` is
 * the deliberately conspicuous escape hatch for stages whose entire product is
 * text posted verbatim — a code reviewer skimming a call site for
 * `kind: "prose"` next to a GitHub mutation is looking at a bug (spec §5.4).
 */
export interface ProseOutput {
	kind: "prose";
}

export type OutputSpec<T> = ObjectOutput<T> | ProseOutput;

export type ValidationResult<T> =
	| { success: true; value: T }
	| { success: false; error: string };

/**
 * Stops the run's *text* at the completion signal (spec §5.3, step 5) — text
 * emitted after it is a chatty CLI trailing off, not part of the payload.
 * The signal is still reported on the result so a workflow can tell a clean
 * stop from a process that just ran out of things to say.
 */
export function truncateAtSignal(
	text: string,
	signal: string,
): { text: string; signalSeen: boolean } {
	const index = text.indexOf(signal);
	if (index === -1) return { signalSeen: false, text };
	return { signalSeen: true, text: text.slice(0, index + signal.length) };
}

/**
 * Extracts the payload between `<tag>…</tag>`. Non-greedy so a transcript
 * carrying more than one tagged block still yields the first, intended one.
 */
export function extractTagged(text: string, tag: string): string | null {
	const pattern = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
	const match = text.match(pattern);
	return match ? match[1].trim() : null;
}

/**
 * Tagged-payload extraction, JSON parse, and schema validation (spec §5.3,
 * step 6) as one pure function — the highest seam available below `spawn`, per
 * the repo's no-seams-below-these rule. Prose output never reaches here: it has
 * nothing to validate, so it needs no branch in this function and no cast to
 * pretend its text is a `T`.
 */
export function validateTaggedJson<T>(
	text: string,
	output: ObjectOutput<T>,
): ValidationResult<T> {
	const tagged = extractTagged(text, output.tag);
	if (tagged === null) {
		return {
			error: `No <${output.tag}> tag found in the model's output.`,
			success: false,
		};
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(tagged);
	} catch (error) {
		return {
			error: `Failed to parse JSON inside <${output.tag}>: ${String(error)}`,
			success: false,
		};
	}

	const result = output.schema.safeParse(parsed);
	if (!result.success) {
		return { error: result.error.message, success: false };
	}

	return { success: true, value: result.data };
}
