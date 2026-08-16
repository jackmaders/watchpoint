import { describe, expect, it } from "vitest";
import {
	antigravityAgent,
	createAgentProvider,
	geminiAgent,
} from "../agent-providers";

describe("agent-providers", () => {
	describe("antigravityAgent", () => {
		it("builds print command with dangerously skip permissions by default", () => {
			// Arrange
			const provider = antigravityAgent();

			// Act
			const cmd = provider.buildPrintCommand({
				dangerouslySkipPermissions: true,
				prompt: "Add unit tests",
			});

			// Assert
			expect(cmd.command).toContain("agy");
			expect(cmd.command).toContain("--dangerously-skip-permissions");
			expect(cmd.command).toContain("Add unit tests");
		});

		it("builds print command with model and skip permissions", () => {
			// Arrange
			const provider = antigravityAgent("gemini-2.5-flash");

			// Act
			const cmd = provider.buildPrintCommand({
				dangerouslySkipPermissions: true,
				prompt: "Fix bug",
			});

			// Assert
			expect(cmd.command).toContain("agy");
			expect(cmd.command).toContain("--dangerously-skip-permissions");
			expect(cmd.command).toContain("--model gemini-2.5-flash");
		});

		it("builds print command without skip permissions when flag is false", () => {
			// Arrange
			const provider = antigravityAgent("gemini-2.5-flash");

			// Act
			const cmd = provider.buildPrintCommand({
				dangerouslySkipPermissions: false,
				prompt: "Fix bug",
			});

			// Assert
			expect(cmd.command).toContain("agy");
			expect(cmd.command).not.toContain("--dangerously-skip-permissions");
			expect(cmd.command).toContain("--model gemini-2.5-flash");
		});

		it("builds print command without model and without skip permissions", () => {
			// Arrange
			const provider = antigravityAgent();

			// Act
			const cmd = provider.buildPrintCommand({
				dangerouslySkipPermissions: false,
				prompt: "Fix bug",
			});

			// Assert
			expect(cmd.command).toBe('agy -p "Fix bug"');
		});

		it("builds interactive args", () => {
			// Arrange
			const provider = antigravityAgent();

			// Act
			const args = provider.buildInteractiveArgs?.({
				dangerouslySkipPermissions: true,
				prompt: "Interactive prompt",
			});

			// Assert
			expect(args).toEqual([
				"-p",
				"Interactive prompt",
				"--dangerously-skip-permissions",
			]);
		});

		it("builds interactive args with model", () => {
			// Arrange
			const provider = antigravityAgent("gemini-2.5-pro");

			// Act
			const args = provider.buildInteractiveArgs?.({
				dangerouslySkipPermissions: false,
				prompt: "Interactive prompt",
			});

			// Assert
			expect(args).toEqual([
				"-p",
				"Interactive prompt",
				"--model",
				"gemini-2.5-pro",
			]);
		});

		it("parses text stream lines and json events", () => {
			// Arrange
			const provider = antigravityAgent();
			const plainText = "Running verification...";
			const jsonEvent = JSON.stringify({
				args: "bun test",
				name: "run_command",
				type: "tool_call",
			});
			const jsonResult = JSON.stringify({
				result: "All tests passed",
			});
			const invalidJson = "{ not json }";
			const fallbackJson = JSON.stringify({ foo: "bar" });
			const toolCallNoDetails = JSON.stringify({ type: "tool_call" });

			// Act
			const plainRes = provider.parseStreamLine(plainText);
			const jsonRes = provider.parseStreamLine(jsonEvent);
			const resultRes = provider.parseStreamLine(jsonResult);
			const invalidRes = provider.parseStreamLine(invalidJson);
			const fallbackRes = provider.parseStreamLine(fallbackJson);
			const noDetailsRes = provider.parseStreamLine(toolCallNoDetails);

			// Assert
			expect(plainRes).toEqual([{ text: plainText, type: "text" }]);
			expect(jsonRes).toEqual([
				{
					args: "bun test",
					name: "run_command",
					type: "tool_call",
				},
			]);
			expect(resultRes).toEqual([
				{
					result: "All tests passed",
					type: "result",
				},
			]);
			expect(invalidRes).toEqual([{ text: invalidJson, type: "text" }]);
			expect(fallbackRes).toEqual([{ text: fallbackJson, type: "text" }]);
			expect(noDetailsRes).toEqual([
				{
					args: "",
					name: "unknown",
					type: "tool_call",
				},
			]);
		});
	});

	describe("geminiAgent", () => {
		it("builds print command with gemini CLI", () => {
			// Arrange
			const provider = geminiAgent("gemini-2.5-pro");

			// Act
			const cmd = provider.buildPrintCommand({
				dangerouslySkipPermissions: true,
				prompt: "Review PR",
			});

			// Assert
			expect(cmd.command).toContain("gemini");
			expect(cmd.command).toContain("-p");
			expect(cmd.command).toContain("Review PR");
			expect(cmd.command).toContain("--model gemini-2.5-pro");
		});

		it("builds print command without model", () => {
			// Arrange
			const provider = geminiAgent();

			// Act
			const cmd = provider.buildPrintCommand({
				dangerouslySkipPermissions: false,
				prompt: "Review PR",
			});

			// Assert
			expect(cmd.command).toBe('gemini -p "Review PR"');
		});

		it("builds interactive args for gemini", () => {
			// Arrange
			const provider = geminiAgent();

			// Act
			const args = provider.buildInteractiveArgs?.({
				dangerouslySkipPermissions: false,
				prompt: "Run check",
			});

			// Assert
			expect(args).toEqual(["-p", "Run check"]);
		});

		it("builds interactive args for gemini with model", () => {
			// Arrange
			const provider = geminiAgent("gemini-2.5-flash");

			// Act
			const args = provider.buildInteractiveArgs?.({
				dangerouslySkipPermissions: false,
				prompt: "Run check",
			});

			// Assert
			expect(args).toEqual(["-p", "Run check", "--model", "gemini-2.5-flash"]);
		});

		it("parses stream line for gemini", () => {
			// Arrange
			const provider = geminiAgent();

			// Act
			const events = provider.parseStreamLine("Gemini response");

			// Assert
			expect(events).toEqual([{ text: "Gemini response", type: "text" }]);
		});
	});

	describe("createAgentProvider", () => {
		it("creates agy provider by default", () => {
			// Arrange & Act
			const provider = createAgentProvider("agy");

			// Assert
			expect(provider.name).toBe("antigravity");
		});

		it("creates gemini provider", () => {
			// Arrange & Act
			const provider = createAgentProvider("gemini");

			// Assert
			expect(provider.name).toBe("gemini");
		});

		it("creates codex provider", () => {
			// Arrange & Act
			const provider = createAgentProvider("codex");

			// Assert
			expect(provider.name).toBe("codex");
		});

		it("uses the OpenRouter free router by default", () => {
			// Arrange
			const provider = createAgentProvider("codex");

			// Act
			const command = provider.buildPrintCommand({ prompt: "Run checks" });

			// Assert
			expect(command.command).toContain("openrouter/free");
		});

		it("preserves an explicit Codex model override", () => {
			// Arrange
			const provider = createAgentProvider("codex", "openai/gpt-5");

			// Act
			const command = provider.buildPrintCommand({ prompt: "Run checks" });

			// Assert
			expect(command.command).toContain("openai/gpt-5");
		});

		it("creates claude provider", () => {
			// Arrange & Act
			const provider = createAgentProvider("claude");

			// Assert
			expect(provider.name).toBe("claude-code");
		});
	});
});
