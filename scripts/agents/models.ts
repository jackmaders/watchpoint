/**
 * Configuration shared by every Codex-backed agent invocation.
 *
 * The Codex CLI's model is normally selected with its `model` configuration
 * setting or `-m/--model` argument. This pipeline accepts the environment
 * aliases below so workflow configuration remains explicit and easy to audit.
 */

export const CODEX_CLI = "codex" as const;

export const PROVIDERS = ["anthropic", "google", "openai", "oss"] as const;
export type Provider = (typeof PROVIDERS)[number];

/** Supported model identifiers, grouped by the provider that serves them. */
export const ALLOWED_MODELS = {
	anthropic: [
		"claude-opus-5",
		"claude-fable-5",
		"claude-sonnet-5",
		"claude-haiku-4.5",
	],
	google: ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.1-pro"],
	openai: [
		"gpt-5.6-sol",
		"gpt-5.6-terra",
		"gpt-5.6-luna",
		"gpt-5.6",
		"gpt-5.4",
		"gpt-5.4-mini",
	],
	oss: ["gpt-oss-120b", "gpt-oss-20b", "qwen3-coder-30b"],
} as const satisfies Record<Provider, readonly string[]>;

/** Alias that describes the registry in provider-oriented terms. */
export const MODELS_BY_PROVIDER = ALLOWED_MODELS;

export type ModelForProvider<P extends Provider> =
	(typeof ALLOWED_MODELS)[P][number];
export type Model = {
	[P in Provider]: ModelForProvider<P>;
}[Provider];

/** A model/provider pair whose model is valid for its selected provider. */
export type ModelConfig = {
	[P in Provider]: { model: ModelForProvider<P>; provider: P };
}[Provider];

/** Conservative defaults used when no workflow-level configuration is set. */
export const FALLBACK_MODEL: ModelForProvider<"openai"> = "gpt-5.6-luna";
export const FALLBACK_PROVIDER: Provider = "openai";

/** Provider-specific API key names, including the OpenAI-compatible OSS route. */
export const API_KEY_ENV_VARS = {
	anthropic: "ANTHROPIC_API_KEY",
	google: "GEMINI_API_KEY",
	openai: "OPENAI_API_KEY",
	oss: "OPENAI_API_KEY",
} as const satisfies Record<Provider, string>;

export const PROVIDER_API_KEYS = API_KEY_ENV_VARS;

export const GLOBAL_API_KEY_ENV_VARS = [
	"AGENT_API_KEY",
	"LLM_API_KEY",
] as const;

type Environment = Record<string, string | undefined>;

function firstConfigured(
	environment: Environment,
	names: readonly string[],
): string | undefined {
	for (const name of names) {
		const value = environment[name];
		if (value?.trim()) return value;
	}
	return undefined;
}

function isProvider(value: string): value is Provider {
	return PROVIDERS.includes(value as Provider);
}

function allModels(): readonly string[] {
	return PROVIDERS.flatMap((provider) => ALLOWED_MODELS[provider]);
}

function isModelForProvider(
	provider: Provider,
	model: string,
): model is ModelForProvider<Provider> {
	return (ALLOWED_MODELS[provider] as readonly string[]).includes(model);
}

function invalidProvider(provider: unknown): Error {
	return new Error(
		`Invalid provider "${String(provider)}". Supported providers: ${PROVIDERS.join(", ")}.`,
	);
}

function invalidModel(model: unknown): Error {
	return new Error(
		`Invalid model "${String(model)}". Supported models: ${allModels().join(", ")}.`,
	);
}

/** Runtime validation for explicit configuration objects supplied by callers. */
export function validateModelConfig(config: ModelConfig): ModelConfig {
	if (!isProvider(config.provider)) {
		throw invalidProvider(config.provider);
	}

	if (typeof config.model !== "string" || !allModels().includes(config.model)) {
		throw invalidModel(config.model);
	}

	if (!isModelForProvider(config.provider, config.model)) {
		throw new Error(
			`Invalid model "${config.model}" for provider "${config.provider}".`,
		);
	}

	return config;
}

/**
 * Resolve the active model/provider at invocation time.
 *
 * `AGENT_*` names are the workflow-specific overrides. `MODEL` and `PROVIDER`
 * mirror the short names used by Codex-style configuration, and remain useful
 * for local shell execution.
 */
export function resolveModelConfig(
	environment: Environment = process.env,
): ModelConfig {
	const providerValue =
		firstConfigured(environment, ["AGENT_PROVIDER", "PROVIDER"]) ??
		FALLBACK_PROVIDER;
	if (!isProvider(providerValue)) {
		throw invalidProvider(providerValue);
	}

	const modelValue =
		firstConfigured(environment, ["AGENT_MODEL", "MODEL"]) ?? FALLBACK_MODEL;
	if (!allModels().includes(modelValue)) {
		throw invalidModel(modelValue);
	}
	if (!isModelForProvider(providerValue, modelValue)) {
		throw new Error(
			`Invalid model "${modelValue}" for provider "${providerValue}".`,
		);
	}

	return {
		model: modelValue as ModelForProvider<typeof providerValue>,
		provider: providerValue,
	} as ModelConfig;
}

/** Backward-compatible name for callers that already use the old resolver. */
export const getModelConfig = resolveModelConfig;

export function getApiKeyEnvVar(provider: Provider): string {
	if (!isProvider(provider)) {
		throw invalidProvider(provider);
	}
	return API_KEY_ENV_VARS[provider];
}

/** Resolve the provider-specific key, then the global project fallbacks. */
export function resolveApiKey(
	provider: Provider,
	environment: Environment = process.env,
): string | undefined {
	return firstConfigured(environment, [
		getApiKeyEnvVar(provider),
		...GLOBAL_API_KEY_ENV_VARS,
	]);
}

/**
 * Preserve non-credential process configuration while giving Codex exactly one
 * provider-native API key. This makes the generic fallback names real without
 * leaking unrelated provider credentials into the agent subprocess.
 */
export function createProviderEnvironment(
	provider: Provider,
	apiKey: string,
	environment: Environment = process.env,
): Environment {
	const scoped = { ...environment };
	for (const name of new Set([
		...Object.values(API_KEY_ENV_VARS),
		...GLOBAL_API_KEY_ENV_VARS,
	])) {
		delete scoped[name];
	}
	scoped[getApiKeyEnvVar(provider)] = apiKey;
	return scoped;
}

/** Backward-compatible short name for provider key lookup. */
export const getApiKey = resolveApiKey;

export function missingApiKeyMessage(provider: Provider): string {
	const primary = getApiKeyEnvVar(provider);
	return `Missing API key for provider "${provider}". Set ${primary}, ${GLOBAL_API_KEY_ENV_VARS[0]}, or ${GLOBAL_API_KEY_ENV_VARS[1]}.`;
}
