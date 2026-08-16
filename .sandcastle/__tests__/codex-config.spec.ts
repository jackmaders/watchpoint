import { describe, expect, it } from "vitest";
import {
	buildCodexConfig,
	OPENROUTER_DEFAULT_MODEL,
	validateCodexConfiguration,
} from "../codex-config";

describe("Codex/OpenRouter configuration", () => {
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
});
