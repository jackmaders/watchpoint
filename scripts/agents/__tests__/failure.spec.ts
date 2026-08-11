import { describe, expect, it } from "vitest";
import { classifyExit, StageError } from "../failure";

describe("classifyExit", () => {
	it("classifies exit 42 as bad-input", () => {
		// Arrange
		const exitCode = 42;

		// Act
		const result = classifyExit(exitCode, "");

		// Assert
		expect(result).toBe("bad-input");
	});

	it("classifies exit 53 as turn-limit", () => {
		// Arrange
		const exitCode = 53;

		// Act
		const result = classifyExit(exitCode, "");

		// Assert
		expect(result).toBe("turn-limit");
	});

	it("classifies exit 1 with rate-limit text on stderr as quota", () => {
		// Arrange
		const stderr = "Error: rate limit exceeded, try again tomorrow";

		// Act
		const result = classifyExit(1, stderr);

		// Assert
		expect(result).toBe("quota");
	});

	it("classifies exit 1 with no rate-limit text as unclassified", () => {
		// Arrange
		const stderr = "network timeout";

		// Act
		const result = classifyExit(1, stderr);

		// Assert
		expect(result).toBe("unclassified");
	});

	it("classifies an exit code the spec's table does not name as unclassified", () => {
		// Arrange
		const exitCode = 2;

		// Act
		const result = classifyExit(exitCode, "usage: gemini [options]");

		// Assert
		expect(result).toBe("unclassified");
	});

	it("classifies a signal-shaped exit code as unclassified", () => {
		// Arrange
		const exitCode = 130;

		// Act
		const result = classifyExit(exitCode, "");

		// Assert
		expect(result).toBe("unclassified");
	});
});

describe("StageError", () => {
	it("carries its failure class and message from the throw site", () => {
		// Arrange
		// Act
		const error = new StageError(
			"push-race",
			"Branch advanced during the run.",
		);

		// Assert
		expect(error.failureClass).toBe("push-race");
		expect(error.message).toBe("Branch advanced during the run.");
		expect(error).toBeInstanceOf(Error);
	});
});
