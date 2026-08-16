import { describe, expect, it } from "vitest";
import { parseCliArgs } from "../cli-args";

describe("parseCliArgs", () => {
	it("parses minimal prompt argument with defaults", () => {
		// Arrange
		const argv = ["--prompt", "Refactor video player controls"];

		// Act
		const result = parseCliArgs(argv);

		// Assert
		expect(result).toEqual({
			agent: "agy",
			branch: undefined,
			dangerouslySkipPermissions: true,
			dryRun: false,
			imageName: "sandcastle:watchpoint",
			issue: undefined,
			localOnly: false,
			maxRetries: 3,
			model: undefined,
			pr: true,
			prompt: "Refactor video player controls",
			sandbox: "docker",
		});
	});

	it("parses short prompt flag -p", () => {
		// Arrange
		const argv = ["-p", "Fix timeline bug"];

		// Act
		const result = parseCliArgs(argv);

		// Assert
		expect(result.prompt).toBe("Fix timeline bug");
	});

	it("parses issue number argument", () => {
		// Arrange
		const argv = ["--issue", "152"];

		// Act
		const result = parseCliArgs(argv);

		// Assert
		expect(result.issue).toBe(152);
	});

	it("parses agent selection flag", () => {
		// Arrange
		const argvAgy = ["--prompt", "test", "--agent", "agy"];
		const argvGemini = ["--prompt", "test", "--agent", "gemini"];
		const argvCodex = ["--prompt", "test", "--agent", "codex"];
		const argvClaude = ["--prompt", "test", "--agent", "claude"];

		// Act
		const resAgy = parseCliArgs(argvAgy);
		const resGemini = parseCliArgs(argvGemini);
		const resCodex = parseCliArgs(argvCodex);
		const resClaude = parseCliArgs(argvClaude);

		// Assert
		expect(resAgy.agent).toBe("agy");
		expect(resGemini.agent).toBe("gemini");
		expect(resCodex.agent).toBe("codex");
		expect(resClaude.agent).toBe("claude");
	});

	it("throws error for unsupported agent type", () => {
		// Arrange
		const argv = ["--prompt", "test", "--agent", "unsupported-agent"];

		// Act
		const action = () => parseCliArgs(argv);

		// Assert
		expect(action).toThrow(
			"Unsupported agent: unsupported-agent. Expected one of: agy, gemini, codex, claude",
		);
	});

	it("parses max-retries and retries flags", () => {
		// Arrange
		const argv1 = ["--prompt", "test", "--max-retries", "5"];
		const argv2 = ["--prompt", "test", "--retries", "2"];

		// Act
		const res1 = parseCliArgs(argv1);
		const res2 = parseCliArgs(argv2);

		// Assert
		expect(res1.maxRetries).toBe(5);
		expect(res2.maxRetries).toBe(2);
	});

	it("parses local-only flag and disables pr", () => {
		// Arrange
		const argv = ["--issue", "42", "--local-only"];

		// Act
		const result = parseCliArgs(argv);

		// Assert
		expect(result.localOnly).toBe(true);
		expect(result.pr).toBe(false);
	});

	it("parses explicit --no-pr flag", () => {
		// Arrange
		const argv = ["--issue", "42", "--no-pr"];

		// Act
		const result = parseCliArgs(argv);

		// Assert
		expect(result.pr).toBe(false);
	});

	it("parses explicit --pr flag", () => {
		// Arrange
		const argv = ["--issue", "42", "--pr"];

		// Act
		const result = parseCliArgs(argv);

		// Assert
		expect(result.pr).toBe(true);
	});

	it("parses dry-run flag and ignores unrecognized flags", () => {
		// Arrange
		const argv = ["--prompt", "test", "--dry-run", "--custom-unrecognized"];

		// Act
		const result = parseCliArgs(argv);

		// Assert
		expect(result.dryRun).toBe(true);
	});

	it("parses custom branch and model flags", () => {
		// Arrange
		const argv = [
			"--prompt",
			"test",
			"--branch",
			"feat/custom-branch",
			"--model",
			"gemini-2.5-pro",
		];

		// Act
		const result = parseCliArgs(argv);

		// Assert
		expect(result.branch).toBe("feat/custom-branch");
		expect(result.model).toBe("gemini-2.5-pro");
	});

	it("throws error if neither issue nor prompt is specified", () => {
		// Arrange
		const argv = ["--agent", "agy"];

		// Act
		const action = () => parseCliArgs(argv);

		// Assert
		expect(action).toThrow(
			"Must provide either --issue <number> or --prompt <text>",
		);
	});

	it("parses sandbox flags including --sandbox none and --no-sandbox", () => {
		// Arrange
		const argv1 = ["--prompt", "test", "--sandbox", "none"];
		const argv2 = ["--prompt", "test", "--no-sandbox"];
		const argv3 = ["--prompt", "test", "--docker"];

		// Act
		const res1 = parseCliArgs(argv1);
		const res2 = parseCliArgs(argv2);
		const res3 = parseCliArgs(argv3);

		// Assert
		expect(res1.sandbox).toBe("none");
		expect(res2.sandbox).toBe("none");
		expect(res3.sandbox).toBe("docker");
	});

	it("throws error for unsupported sandbox type", () => {
		// Arrange
		const argv = ["--prompt", "test", "--sandbox", "invalid-sandbox"];

		// Act
		const action = () => parseCliArgs(argv);

		// Assert
		expect(action).toThrow(
			"Unsupported sandbox: invalid-sandbox. Expected one of: docker, none",
		);
	});

	it("parses custom image name and permissions flags", () => {
		// Arrange
		const argvNoSkip = [
			"--prompt",
			"test",
			"--image",
			"custom:image",
			"--no-skip-permissions",
		];
		const argvDanger = ["--prompt", "test", "--dangerously-skip-permissions"];
		const argvSkip = ["--prompt", "test", "--skip-permissions"];

		// Act
		const resultNoSkip = parseCliArgs(argvNoSkip);
		const resultDanger = parseCliArgs(argvDanger);
		const resultSkip = parseCliArgs(argvSkip);

		// Assert
		expect(resultNoSkip.imageName).toBe("custom:image");
		expect(resultNoSkip.dangerouslySkipPermissions).toBe(false);
		expect(resultDanger.dangerouslySkipPermissions).toBe(true);
		expect(resultSkip.dangerouslySkipPermissions).toBe(true);
	});
});
