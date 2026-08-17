import { describe, expect, it } from "vitest";
import {
	buildCodexConfig,
	CODEX_CLI_VERSION,
	OPENAI_CODEX_DEFAULT_MODEL,
	OPENROUTER_DEFAULT_MODEL,
	parseCodexProvider,
	resolveCodexModel,
	validateCodexConfiguration,
} from "../codex-config";

describe("Codex/OpenRouter configuration", () => {
	it("publishes the pinned Codex CLI version used by the sandbox image", () => {
		// Arrange

		// Act
		const version = CODEX_CLI_VERSION;

		// Assert
		expect(version).toBe("0.147.0");
	});
	it("generates only the minimal provider configuration without a secret", () => {
		// Arrange
		const model = "openrouter/free";

		// Act
		const config = buildCodexConfig(model);

		// Assert
		expect(config).toContain(`model = "${model}"`);
		expect(config).toContain("https://openrouter.ai/api/v1");
		expect(config).toContain("OPENROUTER_API_KEY");
		expect(config).not.toContain("router-secret");
		expect(config).not.toContain("OPENAI_API_KEY");
	});

	it("uses the free router as the config default", () => {
		// Arrange

		// Act
		const config = buildCodexConfig();

		// Assert
		expect(config).toContain(`model = "${OPENROUTER_DEFAULT_MODEL}"`);
	});

	it("reports missing credentials clearly", () => {
		// Arrange

		// Act
		const action = () => validateCodexConfiguration({});

		// Assert
		expect(action).toThrow("Codex/OpenRouter requires OPENROUTER_API_KEY");
	});

	it("accepts a runtime credential", () => {
		// Arrange
		const env = { OPENROUTER_API_KEY: "runtime-only-secret" };

		// Act
		const action = () => validateCodexConfiguration(env);

		// Assert
		expect(action).not.toThrow();
	});

	it("generates native OpenAI Codex configuration", () => {
		const config = buildCodexConfig(OPENAI_CODEX_DEFAULT_MODEL, "openai");

		expect(config).toContain('model_provider = "openai"');
		expect(config).toContain("https://api.openai.com/v1");
		expect(config).toContain("OPENAI_API_KEY");
		expect(config).toContain("[model_providers.openai.auth]");
		expect(config).not.toContain("OPENROUTER_API_KEY");
	});

	it("validates native OpenAI credentials", () => {
		expect(() => validateCodexConfiguration({}, "openai")).toThrow(
			"Codex/OpenAI requires OPENAI_API_KEY",
		);
		expect(() =>
			validateCodexConfiguration(
				{ OPENAI_API_KEY: "runtime-only-secret" },
				"openai",
			),
		).not.toThrow();
	});

	it("rejects unknown providers", () => {
		expect(() => parseCodexProvider("custom")).toThrow(
			"Unsupported Codex provider: custom",
		);
	});

	it("treats an empty configured model as unset", () => {
		const previous = process.env.CODEX_MODEL;
		process.env.CODEX_MODEL = "";
		try {
			expect(resolveCodexModel("openrouter")).toBe(OPENROUTER_DEFAULT_MODEL);
		} finally {
			if (previous === undefined) delete process.env.CODEX_MODEL;
			else process.env.CODEX_MODEL = previous;
		}
	});
});
