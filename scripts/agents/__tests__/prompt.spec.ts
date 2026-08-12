import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { logger } from "../logger";
import { AGENT_SKILLS, buildPrompt, substitutePromptArgs } from "../prompt";

vi.mock("../logger");

// buildPrompt (template read + {{OUTPUT_SCHEMA}} injection) is exercised
// through `runAgent` in run-agent.spec.ts, against real template files.

describe("substitutePromptArgs", () => {
	it("substitutes every {{KEY}} occurrence from promptArgs", () => {
		// Arrange
		const template = "Hello {{NAME}}, welcome to {{PLACE}}.";

		// Act
		const result = substitutePromptArgs(template, {
			NAME: "Ada",
			PLACE: "Watchpoint",
		});

		// Assert
		expect(result).toBe("Hello Ada, welcome to Watchpoint.");
	});

	it("throws on an unmatched {{KEY}} placeholder", () => {
		// Arrange
		const template = "Hello {{NAME}}.";

		// Act
		const act = () => substitutePromptArgs(template, {});

		// Assert
		expect(act).toThrow(/Unmatched prompt placeholder: \{\{NAME\}\}/);
	});

	it("warns, rather than throwing, on an unused promptArg", () => {
		// Arrange
		const template = "Hello.";

		// Act
		const result = substitutePromptArgs(template, { UNUSED: "value" });

		// Assert
		expect(result).toBe("Hello.");
		expect(logger.warn).toHaveBeenCalledWith("Unused prompt argument: UNUSED");
	});

	it("treats argument values as inert — a value containing {{...}} is never re-scanned", () => {
		// Arrange
		const template = "Payload: {{PAYLOAD}}";

		// Act
		const result = substitutePromptArgs(template, { PAYLOAD: "{{INJECTED}}" });

		// Assert
		expect(result).toBe("Payload: {{INJECTED}}");
	});

	it("treats argument values as inert — backtick-shell syntax stays literal", () => {
		// Arrange
		const template = "Issue text: {{ISSUE_BODY}}";

		// Act
		const result = substitutePromptArgs(template, {
			ISSUE_BODY: "here's a command: `rm -rf /`",
		});

		// Assert
		expect(result).toBe("Issue text: here's a command: `rm -rf /`");
	});
});

describe("buildPrompt", () => {
	it("allows the code-review skill to be injected into a review prompt", () => {
		// Arrange
		const promptFile = join(
			import.meta.dirname,
			"fixtures",
			"prompts",
			"prose.md",
		);

		// Act
		const prompt = buildPrompt(promptFile, {}, undefined, ["code-review"]);

		// Assert
		expect(AGENT_SKILLS).toContain("code-review");
		expect(prompt).toContain("## Standards");
	});

	it("prepends workflow-selected skill instructions before the stage prompt", () => {
		// Arrange
		const promptFile = join(
			import.meta.dirname,
			"fixtures",
			"prompts",
			"prose.md",
		);

		// Act
		const prompt = buildPrompt(promptFile, {}, undefined, ["implement"]);

		// Assert
		expect(prompt).toContain("## Git safety and branch setup");
		expect(prompt).toContain("Reply with a short, friendly pong");
	});
});
