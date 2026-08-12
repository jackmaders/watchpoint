import { readFileSync } from "node:fs";
import { join } from "node:path";
import { logger } from "./logger";

const PLACEHOLDER_PATTERN = /\{\{([A-Za-z0-9_]+)\}\}/g;
const SKILLS_DIRECTORY = join(
	import.meta.dirname,
	"..",
	"..",
	".agents",
	"skills",
);

/** Skills the workflow can inject from this repository's vendored copy. */
export const AGENT_SKILLS = [
	"code-review",
	"grilling",
	"implement",
	"research",
	"tdd",
	"to-spec",
	"to-tickets",
	"wayfinder",
] as const;

export type AgentSkill = (typeof AGENT_SKILLS)[number];

/**
 * `{{KEY}}` substitution from `promptArgs`. An unmatched `{{KEY}}` is an
 * error; an unused argument is a warning (spec §5.3, step 1). Uses a single
 * `String.replace` pass, so a value containing `{{OTHER}}` or backtick-shell
 * syntax is never re-scanned or expanded — argument values are inert, which
 * is what makes it safe to pass arbitrary issue text through.
 */
export function substitutePromptArgs(
	template: string,
	promptArgs: Record<string, string>,
): string {
	const unusedKeys = new Set(Object.keys(promptArgs));

	const substituted = template.replace(
		PLACEHOLDER_PATTERN,
		(_match, key: string) => {
			const value = promptArgs[key];
			if (value === undefined) {
				throw new Error(`Unmatched prompt placeholder: {{${key}}}`);
			}
			unusedKeys.delete(key);
			return value;
		},
	);

	for (const key of unusedKeys) {
		logger.warn(`Unused prompt argument: ${key}`);
	}

	return substituted;
}

/**
 * Reads a stage's prompt template and fills it in. `outputSchema` — present
 * only for a stage that expects structured output — arrives as
 * `{{OUTPUT_SCHEMA}}`, so the contract in the prompt and the contract the
 * validator enforces are the same object (spec §5.4), never restated in prose.
 */
export function buildPrompt(
	promptFile: string,
	promptArgs: Record<string, string>,
	outputSchema?: string,
	skills: readonly AgentSkill[] = [],
): string {
	const args =
		outputSchema === undefined
			? promptArgs
			: { ...promptArgs, OUTPUT_SCHEMA: outputSchema };
	const stagePrompt = substitutePromptArgs(
		readFileSync(promptFile, "utf-8"),
		args,
	);
	if (skills.length === 0) return stagePrompt;

	const skillContext = skills
		.map((skill) => {
			const instructions = readFileSync(
				join(SKILLS_DIRECTORY, skill, "SKILL.md"),
				"utf-8",
			);
			return `## Workflow-invoked skill: ${skill}\n\n${instructions}`;
		})
		.join("\n\n");

	return [
		"The workflow has already invoked the trusted repository skills below. Follow them, but the stage contract that follows takes precedence whenever instructions conflict.",
		skillContext,
		"## Stage contract",
		stagePrompt,
	].join("\n\n");
}
