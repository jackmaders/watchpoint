import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultExec } from "../exec";

describe("defaultExec", () => {
	// The vitest worker that runs this suite has no `Bun` global at all (Bun's
	// own worker_threads shim doesn't inject one, matching run-agent.spec.ts's
	// "default spawn" note) — a stub is installed on `globalThis` for the
	// duration of each test instead, standing in for the runtime's real
	// `Bun.spawn`.
	const originalBun = globalThis.Bun;

	afterEach(() => {
		globalThis.Bun = originalBun;
	});

	function stubSpawn(options: {
		exitCode?: number;
		stdout?: string;
		stderr?: string;
	}) {
		const bunSpawn = vi.fn().mockReturnValue({
			exited: Promise.resolve(options.exitCode ?? 0),
			stderr: new Response(options.stderr ?? "").body,
			stdout: new Response(options.stdout ?? "").body,
		});
		globalThis.Bun = { ...originalBun, spawn: bunSpawn } as typeof Bun;
		return bunSpawn;
	}

	it("spawns the command with its args and pipes both streams", async () => {
		// Arrange
		const bunSpawn = stubSpawn({ stdout: "abc123\n" });

		// Act
		await defaultExec("git", ["rev-parse", "HEAD"]);

		// Assert
		expect(bunSpawn).toHaveBeenCalledWith(["git", "rev-parse", "HEAD"], {
			stderr: "pipe",
			stdout: "pipe",
		});
	});

	it("resolves stdout, stderr, and the exit code together", async () => {
		// Arrange
		stubSpawn({ exitCode: 1, stderr: "fatal: not a git repository\n" });

		// Act
		const result = await defaultExec("git", ["status"]);

		// Assert
		expect(result).toEqual({
			exitCode: 1,
			stderr: "fatal: not a git repository\n",
			stdout: "",
		});
	});
});
