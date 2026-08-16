import { describe, expect, it } from "vitest";
import { resolveAgentRuntime } from "../agent-runtime";

describe("resolveAgentRuntime", () => {
	it("resolves Codex queue defaults and shared Docker configuration", () => {
		// Arrange
		const authMountsConfig = { env: { OPENROUTER_API_KEY: "key" }, mounts: [] };

		// Act
		const runtime = resolveAgentRuntime({ authMountsConfig });

		// Assert
		expect(runtime).toEqual({
			agent: "agy",
			authMountsConfig,
			dangerouslySkipPermissions: true,
			imageName: "sandcastle:watchpoint",
			model: undefined,
			sandbox: "docker",
		});
	});

	it("resolves explicit Codex and Antigravity overrides without provider fallback", () => {
		// Arrange
		const authMountsConfig = { env: {}, mounts: [] };

		// Act
		const codex = resolveAgentRuntime({
			agent: "codex",
			authMountsConfig,
			dangerouslySkipPermissions: false,
			imageName: "sandcastle:test",
			model: "provider/pinned",
			sandbox: "none",
		});
		const agy = resolveAgentRuntime({
			agent: "agy",
			authMountsConfig,
			model: "gemini-pro",
		});

		// Assert
		expect(codex).toMatchObject({
			agent: "codex",
			dangerouslySkipPermissions: false,
			imageName: "sandcastle:test",
			model: "provider/pinned",
			sandbox: "none",
		});
		expect(agy.model).toBe("gemini-pro");
	});

	it("defaults Codex to the OpenRouter free router", () => {
		// Arrange

		// Act
		const runtime = resolveAgentRuntime({
			agent: "codex",
			authMountsConfig: { env: {}, mounts: [] },
		});

		// Assert
		expect(runtime.model).toBe("openrouter/free");
	});
});
