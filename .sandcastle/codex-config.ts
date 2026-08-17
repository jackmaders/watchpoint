export const OPENROUTER_DEFAULT_MODEL = "openrouter/free";
export const OPENAI_CODEX_DEFAULT_MODEL = "gpt-5.3-codex";
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const OPENAI_BASE_URL = "https://api.openai.com/v1";
export const CODEX_CLI_VERSION = "0.147.0";
export const CODEX_PROVIDERS = ["openrouter", "openai"] as const;
export type CodexProvider = (typeof CODEX_PROVIDERS)[number];
export const DEFAULT_CODEX_PROVIDER: CodexProvider = "openrouter";

export function parseCodexProvider(value: string): CodexProvider {
	if (!CODEX_PROVIDERS.includes(value as CodexProvider)) {
		throw new Error(
			`Unsupported Codex provider: ${value}. Expected one of: ${CODEX_PROVIDERS.join(", ")}`,
		);
	}
	return value as CodexProvider;
}

export function resolveCodexProvider(value?: string): CodexProvider {
	return parseCodexProvider(
		value ?? process.env.CODEX_PROVIDER ?? DEFAULT_CODEX_PROVIDER,
	);
}

export function defaultCodexModel(provider: CodexProvider): string {
	return provider === "openai"
		? OPENAI_CODEX_DEFAULT_MODEL
		: OPENROUTER_DEFAULT_MODEL;
}

export function resolveCodexModel(
	provider: CodexProvider,
	model?: string,
): string {
	return model || process.env.CODEX_MODEL || defaultCodexModel(provider);
}

export function validateCodexModel(
	provider: CodexProvider,
	model: string,
): void {
	if (provider === "openai" && model.startsWith("openrouter/")) {
		throw new Error(
			`Codex model ${model} belongs to OpenRouter but CODEX_PROVIDER is openai. Use CODEX_PROVIDER=openrouter or select an OpenAI model such as ${OPENAI_CODEX_DEFAULT_MODEL}.`,
		);
	}
}

/**
 * The config deliberately contains no credential. Codex resolves the key at
 * runtime through the command, so this text is safe to bake into the image or
 * mount into an ephemeral CODEX_HOME.
 */
export function buildCodexConfig(
	model = defaultCodexModel(DEFAULT_CODEX_PROVIDER),
	provider: CodexProvider = DEFAULT_CODEX_PROVIDER,
): string {
	const name = provider === "openai" ? "openai" : "openrouter";
	const baseUrl = provider === "openai" ? OPENAI_BASE_URL : OPENROUTER_BASE_URL;
	const apiKey =
		provider === "openai" ? "OPENAI_API_KEY" : "OPENROUTER_API_KEY";
	return `model_provider = "${name}"
model = "${model}"

[model_providers.${name}]
name = "${name}"
base_url = "${baseUrl}"

[model_providers.${name}.auth]
command = "sh"
args = ["-c", "echo $${apiKey}"]
`;
}

export function validateCodexConfiguration(
	env: Record<string, string | undefined>,
	provider: CodexProvider = DEFAULT_CODEX_PROVIDER,
): void {
	const apiKey =
		provider === "openai" ? "OPENAI_API_KEY" : "OPENROUTER_API_KEY";
	if (!env[apiKey]) {
		throw new Error(
			`Codex/${provider === "openrouter" ? "OpenRouter" : "OpenAI"} requires ${apiKey}. Set it in the runtime environment; it is never stored in Sandcastle configuration.`,
		);
	}
}
