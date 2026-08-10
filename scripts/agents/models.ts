/**
 * The single place a model is named (spec §5.1). Every stage script reads its
 * entry from here instead of naming a CLI or model itself, so routing a stage
 * to a different model — or a different CLI entirely — is a one-line diff.
 *
 * `model` is always a Gemini CLI *alias* (`flash`, `pro`), never a concrete
 * dated version string, so the pipeline does not need editing when Google
 * revs a model.
 */
export type Cli = "gemini" | "claude";

export interface ModelConfig {
	cli: Cli;
	model: string;
}

export const MODELS = {
	ping: { cli: "gemini", model: "flash" },
} as const satisfies Record<string, ModelConfig>;

export type Stage = keyof typeof MODELS;
