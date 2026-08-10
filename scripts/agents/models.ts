import type { Stage } from "./schemas";

/**
 * The single place a model is named (spec §5.1). Every stage script reads its
 * entry from here instead of naming a CLI or model itself, so routing a stage
 * to a different model — or a different CLI entirely — is a one-line diff.
 *
 * `model` is always a Gemini CLI *alias* (`flash`, `pro`), never a concrete
 * dated version string, so the pipeline does not need editing when Google
 * revs a model.
 *
 * Keyed by `Stage` — `schemas.ts`'s `OUTPUTS` registry, not this file, is the
 * source of truth for what stages exist. `Record<Stage, ModelConfig>` makes
 * adding a stage to `OUTPUTS` without a model entry here a compile error,
 * rather than a `MODELS.someNewStage` that is `undefined` at runtime.
 */
export type Cli = "gemini" | "claude";

export interface ModelConfig {
	cli: Cli;
	model: string;
}

export const MODELS = {
	grill: { cli: "gemini", model: "flash" },
	implement: { cli: "gemini", model: "flash" },
	"implement-pr": { cli: "gemini", model: "flash" },
	ping: { cli: "gemini", model: "flash" },
	research: { cli: "gemini", model: "flash" },
	"review-spec": { cli: "gemini", model: "flash" },
	"review-standards": { cli: "gemini", model: "flash" },
	spec: { cli: "gemini", model: "flash" },
	tickets: { cli: "gemini", model: "flash" },
} as const satisfies Record<Stage, ModelConfig>;
