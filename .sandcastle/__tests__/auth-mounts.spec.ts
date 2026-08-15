import { describe, expect, it } from "vitest";
import { resolveAuthMounts } from "../auth-mounts";

describe("resolveAuthMounts", () => {
	it("mounts gemini auth directory and detects agy binary in home directory when present", () => {
		// Arrange
		const homeDir = "/home/testuser";
		const env = {
			GEMINI_API_KEY: "gemini-secret-123",
			GITHUB_TOKEN: "gh-token-789",
			OPENAI_API_KEY: "openai-secret-456",
		};
		const existsSync = (path: string) => {
			return (
				path === "/home/testuser/.gemini" ||
				path === "/home/testuser/.gitconfig" ||
				path === "/home/testuser/.local/bin/agy"
			);
		};

		// Act
		const result = resolveAuthMounts({
			env,
			existsSync,
			homeDir,
		});

		// Assert
		expect(result.mounts).toEqual([
			{
				hostPath: "/home/testuser/.gemini",
				readonly: false,
				sandboxPath: "/home/agent/.gemini",
			},
			{
				hostPath: "/home/testuser/.local/bin/agy",
				readonly: true,
				sandboxPath: "/home/agent/.local/bin/agy",
			},
			{
				hostPath: "/home/testuser/.gitconfig",
				readonly: true,
				sandboxPath: "/home/agent/.gitconfig",
			},
		]);
		expect(result.env.GEMINI_API_KEY).toBe("gemini-secret-123");
		expect(result.env.OPENAI_API_KEY).toBe("openai-secret-456");
		expect(result.env.GITHUB_TOKEN).toBe("gh-token-789");
		expect(result.env.HOME).toBe("/home/agent");
	});

	it("uses custom agyPath when explicitly provided and valid", () => {
		// Arrange
		const homeDir = "/home/testuser";
		const customAgy = "/opt/custom/agy";
		const existsSync = (path: string) => path === customAgy;

		// Act
		const result = resolveAuthMounts({
			agyPath: customAgy,
			existsSync,
			homeDir,
		});

		// Assert
		expect(result.mounts).toEqual([
			{
				hostPath: "/opt/custom/agy",
				readonly: true,
				sandboxPath: "/home/agent/.local/bin/agy",
			},
		]);
	});

	it("detects system agy at /usr/local/bin/agy when not in home directory", () => {
		// Arrange
		const homeDir = "/home/testuser";
		const existsSync = (path: string) => path === "/usr/local/bin/agy";

		// Act
		const result = resolveAuthMounts({
			existsSync,
			homeDir,
		});

		// Assert
		expect(result.mounts).toEqual([
			{
				hostPath: "/usr/local/bin/agy",
				readonly: true,
				sandboxPath: "/home/agent/.local/bin/agy",
			},
		]);
	});

	it("omits missing directories and missing binaries gracefully", () => {
		// Arrange
		const homeDir = "/home/emptyuser";
		const env = {};
		const existsSync = () => false;

		// Act
		const result = resolveAuthMounts({
			agyPath: undefined,
			env,
			existsSync,
			homeDir,
		});

		// Assert
		expect(result.mounts).toEqual([]);
		expect(result.env.HOME).toBe("/home/agent");
	});

	it("forwards ANTHROPIC_API_KEY and GH_TOKEN when present", () => {
		// Arrange
		const homeDir = "/home/claudeuser";
		const env = {
			ANTHROPIC_API_KEY: "anthropic-key-abc",
			GH_TOKEN: "github-token-def",
		};
		const existsSync = (path: string) => path === "/home/claudeuser/.gemini";

		// Act
		const result = resolveAuthMounts({
			env,
			existsSync,
			homeDir,
		});

		// Assert
		expect(result.env.ANTHROPIC_API_KEY).toBe("anthropic-key-abc");
		expect(result.env.GH_TOKEN).toBe("github-token-def");
		expect(result.mounts).toHaveLength(1);
	});

	it("executes resolveAuthMounts with default environment parameters", () => {
		// Arrange
		const options = {};

		// Act
		const result = resolveAuthMounts(options);

		// Assert
		expect(result.env.HOME).toBe("/home/agent");
		expect(Array.isArray(result.mounts)).toBe(true);
	});
});
