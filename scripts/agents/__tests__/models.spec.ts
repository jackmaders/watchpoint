import { afterEach, describe, expect, it, vi } from "vitest";
import type { ModelConfig } from "../models";
import {
	ALLOWED_MODELS,
	API_KEY_ENV_VARS,
	createProviderEnvironment,
	FALLBACK_MODEL,
	FALLBACK_PROVIDER,
	GLOBAL_API_KEY_ENV_VARS,
	getApiKey,
	getApiKeyEnvVar,
	getModelConfig,
	PROVIDERS,
	resolveApiKey,
	resolveModelConfig,
	validateModelConfig,
} from "../models";

describe("model and provider resolution", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("uses the Codex-compatible model and provider defaults", () => {
		// Arrange
		vi.stubEnv("AGENT_MODEL", "");
		vi.stubEnv("MODEL", "");
		vi.stubEnv("AGENT_PROVIDER", "");
		vi.stubEnv("PROVIDER", "");

		// Act
		const config = resolveModelConfig();

		// Assert
		expect(config).toEqual({
			model: FALLBACK_MODEL,
			provider: FALLBACK_PROVIDER,
		});
	});

	it("prefers AGENT_MODEL and AGENT_PROVIDER over their Codex-compatible aliases", () => {
		// Arrange
		vi.stubEnv("AGENT_MODEL", "gpt-5.6-terra");
		vi.stubEnv("MODEL", "gpt-5.4-mini");
		vi.stubEnv("AGENT_PROVIDER", "openai");
		vi.stubEnv("PROVIDER", "oss");

		// Act
		const config = getModelConfig();

		// Assert
		expect(config).toEqual({ model: "gpt-5.6-terra", provider: "openai" });
	});

	it("falls back to MODEL and PROVIDER when AGENT aliases are absent", () => {
		// Arrange
		vi.stubEnv("AGENT_MODEL", "");
		vi.stubEnv("MODEL", "claude-sonnet-5");
		vi.stubEnv("AGENT_PROVIDER", "");
		vi.stubEnv("PROVIDER", "anthropic");

		// Act
		const config = resolveModelConfig();

		// Assert
		expect(config).toEqual({ model: "claude-sonnet-5", provider: "anthropic" });
	});

	it("rejects an unknown provider with the invalid value in the error", () => {
		// Arrange
		vi.stubEnv("AGENT_PROVIDER", "mistral");

		// Act
		const act = () => resolveModelConfig();

		// Assert
		expect(act).toThrow(/Invalid provider.*mistral/);
	});

	it("rejects an unknown model with the invalid value in the error", () => {
		// Arrange
		vi.stubEnv("AGENT_MODEL", "gpt-unknown");

		// Act
		const act = () => resolveModelConfig();

		// Assert
		expect(act).toThrow(/Invalid model.*gpt-unknown/);
	});

	it("rejects a model that is registered for a different provider", () => {
		// Arrange
		vi.stubEnv("AGENT_MODEL", "claude-sonnet-5");
		vi.stubEnv("AGENT_PROVIDER", "openai");

		// Act
		const act = () => resolveModelConfig();

		// Assert
		expect(act).toThrow(/model.*claude-sonnet-5.*provider.*openai/i);
	});

	it("exposes typed registries for every supported provider", () => {
		// Arrange
		// Act
		const providers = [...PROVIDERS];

		// Assert
		expect(providers).toEqual(["anthropic", "google", "openai", "oss"]);
		expect(Object.keys(ALLOWED_MODELS)).toEqual(providers);
	});

	it("validates explicit model configuration objects", () => {
		// Arrange
		const invalidProvider = {
			model: "gpt-5.6-luna",
			provider: "mistral",
		} as unknown as ModelConfig;
		const invalidModel = {
			model: "unknown",
			provider: "openai",
		} as unknown as ModelConfig;
		const mismatchedModel = {
			model: "claude-sonnet-5",
			provider: "openai",
		} as unknown as ModelConfig;

		// Act
		const invalidProviderAct = () => validateModelConfig(invalidProvider);
		const invalidModelAct = () => validateModelConfig(invalidModel);
		const mismatchedModelAct = () => validateModelConfig(mismatchedModel);

		// Assert
		expect(invalidProviderAct).toThrow(/Invalid provider.*mistral/);
		expect(invalidModelAct).toThrow(/Invalid model.*unknown/);
		expect(mismatchedModelAct).toThrow(
			/model.*claude-sonnet-5.*provider.*openai/i,
		);
	});
});

describe("provider API key resolution", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it.each([
		["openai", "OPENAI_API_KEY"],
		["anthropic", "ANTHROPIC_API_KEY"],
		["google", "GEMINI_API_KEY"],
		["oss", "OPENAI_API_KEY"],
	] as const)("maps %s to %s", (provider, envName) => {
		// Arrange
		// Act
		const key = API_KEY_ENV_VARS[provider];

		// Assert
		expect(key).toBe(envName);
	});

	it("prefers the provider key over global fallbacks", () => {
		// Arrange
		vi.stubEnv("OPENAI_API_KEY", "provider-key");
		vi.stubEnv("AGENT_API_KEY", "agent-key");
		vi.stubEnv("LLM_API_KEY", "llm-key");

		// Act
		const key = resolveApiKey("openai");

		// Assert
		expect(key).toBe("provider-key");
	});

	it("uses AGENT_API_KEY before LLM_API_KEY as global fallbacks", () => {
		// Arrange
		vi.stubEnv("AGENT_API_KEY", "agent-key");
		vi.stubEnv("LLM_API_KEY", "llm-key");

		// Act
		const key = getApiKey("anthropic");

		// Assert
		expect(key).toBe("agent-key");
	});

	it("maps the selected key to its provider and omits every credential alias", () => {
		// Arrange
		const environment = {
			AGENT_API_KEY: "agent-key",
			ANTHROPIC_API_KEY: "anthropic-key",
			GEMINI_API_KEY: "google-key",
			LLM_API_KEY: "llm-key",
			OPENAI_API_KEY: "openai-key",
			PATH: "/usr/bin",
		};

		// Act
		const scoped = createProviderEnvironment(
			"anthropic",
			"selected-key",
			environment,
		);

		// Assert
		expect(scoped).toEqual({
			ANTHROPIC_API_KEY: "selected-key",
			PATH: "/usr/bin",
		});
	});

	it("returns undefined when no provider or global key is configured", () => {
		// Arrange
		// Act
		const key = resolveApiKey("google");

		// Assert
		expect(key).toBeUndefined();
	});

	it("publishes the global fallback names for human-readable validation errors", () => {
		// Arrange
		// Act
		const names = [...GLOBAL_API_KEY_ENV_VARS];

		// Assert
		expect(names).toEqual(["AGENT_API_KEY", "LLM_API_KEY"]);
	});

	it("rejects an unknown provider during key-name lookup", () => {
		// Arrange
		const provider = "mistral" as never;

		// Act
		const act = () => getApiKeyEnvVar(provider);

		// Assert
		expect(act).toThrow(/Invalid provider.*mistral/);
	});
});
