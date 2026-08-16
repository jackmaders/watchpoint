import { resolveAuthMounts } from "../auth-mounts";
import { defaultBunSpawnRunner } from "../github/client";
import type { ProcessRunner } from "../github/types";
import type { AgentType, AuthMountsConfig, SandboxType } from "../types";
import type { AgentRunner, AgentRunOptions, AgentRunResult } from "./types";

export interface DefaultAgentRunnerOptions {
	readonly agent?: AgentType;
	readonly model?: string;
	readonly sandbox?: SandboxType;
	readonly imageName?: string;
	readonly dangerouslySkipPermissions?: boolean;
	readonly homeDir?: string;
	readonly processRunner?: ProcessRunner;
	readonly authMountsConfig?: AuthMountsConfig;
}

export function buildDockerRunCommand(options: {
	readonly agentCmd: readonly string[];
	readonly authMounts: AuthMountsConfig;
	readonly imageName: string;
	readonly worktreePath: string;
}): string[] {
	const cmd: string[] = ["docker", "run", "--rm", "-i"];
	cmd.push("-v", `${options.worktreePath}:/workspace`);
	cmd.push("-w", "/workspace");

	for (const mount of options.authMounts.mounts) {
		const roFlag = mount.readonly ? ":ro" : "";
		cmd.push("-v", `${mount.hostPath}:${mount.sandboxPath}${roFlag}`);
	}

	for (const [key, value] of Object.entries(options.authMounts.env)) {
		cmd.push("-e", `${key}=${value}`);
	}

	cmd.push(options.imageName);
	cmd.push(...options.agentCmd);
	return cmd;
}

export class DefaultAgentRunner implements AgentRunner {
	private readonly agent: AgentType;
	private readonly model?: string;
	private readonly sandbox: SandboxType;
	private readonly imageName: string;
	private readonly dangerouslySkipPermissions: boolean;
	private readonly homeDir?: string;
	private readonly processRunner: ProcessRunner;
	private readonly authMountsConfig?: AuthMountsConfig;

	constructor(options: DefaultAgentRunnerOptions = {}) {
		this.agent = options.agent ?? "agy";
		this.model = options.model;
		this.sandbox = options.sandbox ?? "docker";
		this.imageName =
			options.imageName ??
			process.env.SANDCASTLE_IMAGE ??
			"sandcastle:watchpoint";
		this.dangerouslySkipPermissions =
			options.dangerouslySkipPermissions ?? this.sandbox === "docker";
		this.homeDir = options.homeDir;
		this.processRunner = options.processRunner ?? defaultBunSpawnRunner;
		this.authMountsConfig = options.authMountsConfig;
	}

	async run(options: AgentRunOptions): Promise<AgentRunResult> {
		if (options.signal?.aborted) {
			throw new Error("Agent run aborted");
		}

		const cwd = options.worktreePath;
		const agentCmd = this.buildAgentCommand(options.prompt);

		let executionCmd: readonly string[];
		let executionEnv: Record<string, string | undefined> | undefined;

		if (this.sandbox === "docker") {
			const authConfig =
				this.authMountsConfig ?? resolveAuthMounts({ homeDir: this.homeDir });
			executionCmd = buildDockerRunCommand({
				agentCmd,
				authMounts: authConfig,
				imageName: this.imageName,
				worktreePath: options.worktreePath ?? "",
			});
			executionEnv = process.env;
		} else {
			executionCmd = agentCmd;
			executionEnv = {
				...process.env,
				AGY_NON_INTERACTIVE: "1",
			};
		}

		const result = await this.processRunner(executionCmd, {
			cwd,
			env: executionEnv,
			signal: options.signal,
		});

		if (result.exitCode !== 0) {
			const errorMsg = result.stderr || result.stdout || "Unknown error";
			throw new Error(
				`Agent '${this.agent}' exited with code ${result.exitCode}: ${errorMsg.trim()}`,
			);
		}

		const logResult = await this.processRunner(
			["git", "log", "--oneline", "main..HEAD"],
			{ cwd },
		);

		const commits = logResult.stdout
			.split("\n")
			.map((l) => l.trim())
			.filter(Boolean)
			.map((line) => ({ sha: line.split(" ")[0] }));

		if (commits.length === 0) {
			throw new Error(
				`Agent '${this.agent}' completed execution but created 0 commits on branch '${options.branch}'`,
			);
		}

		return {
			commits,
			stdout: result.stdout,
		};
	}

	private buildAgentCommand(prompt: string): string[] {
		if (this.agent === "codex") {
			const cmd: string[] = ["codex", "exec", prompt];
			if (this.model) {
				cmd.push("--model", this.model);
			}
			if (this.dangerouslySkipPermissions) {
				cmd.push("--dangerously-bypass-approvals-and-sandbox");
			}
			return cmd;
		}

		const cmd: string[] = [this.agent, "-p", prompt];
		if (this.model) {
			cmd.push("--model", this.model);
		}
		if (this.dangerouslySkipPermissions) {
			cmd.push("--dangerously-skip-permissions");
		}
		return cmd;
	}
}

export class MockAgentRunner implements AgentRunner {
	private readonly runs: AgentRunOptions[] = [];
	private simulatedResult?: AgentRunResult;
	private simulatedFailure?: string;

	setRunResult(result: AgentRunResult): void {
		this.simulatedResult = result;
	}

	simulateFailure(error: string): void {
		this.simulatedFailure = error;
	}

	getRuns(): readonly AgentRunOptions[] {
		return this.runs;
	}

	async run(options: AgentRunOptions): Promise<AgentRunResult> {
		if (options.signal?.aborted) {
			throw new Error("Agent run aborted");
		}

		if (this.simulatedFailure) {
			throw new Error(this.simulatedFailure);
		}

		this.runs.push({ ...options });

		if (this.simulatedResult) {
			return { ...this.simulatedResult };
		}

		return {
			commits: [{ sha: `sha-${this.runs.length}` }],
			stdout: "Simulated agent execution succeeded",
		};
	}
}
