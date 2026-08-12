import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function workflow(name: string): string {
	return readFileSync(
		`${import.meta.dirname}/../../../.github/workflows/${name}`,
		"utf-8",
	);
}

describe("Wayfinder workflow contracts", () => {
	it("runs charting from the wayfinder:needed issue label", () => {
		// Arrange
		const contents = workflow("agent-wayfinder.yml");

		// Act
		const contract = contents;

		// Assert
		expect(contract).toContain("name: Agent Wayfinder");
		expect(contract).toContain("github.event.label.name == 'wayfinder:needed'");
		expect(contract).toContain("bun scripts/agents/wayfinder.ts");
		expect(contract).toContain("issues: write");
	});

	it("runs AFK research from the research:needed issue label", () => {
		// Arrange
		const contents = workflow("agent-research.yml");

		// Act
		const contract = contents;

		// Assert
		expect(contract).toContain("name: Agent Research");
		expect(contract).toContain("github.event.label.name == 'research:needed'");
		expect(contract).toContain("bun scripts/agents/research.ts");
		expect(contract).toContain("contents: write");
		expect(contract).toContain("issues: write");
	});
});
