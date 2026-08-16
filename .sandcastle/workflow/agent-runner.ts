import {
	type AgentRuntimeOptions,
	resolveAgentRuntime,
} from "../agent-runtime";
import { validateCodexConfiguration } from "../codex-config";
import { defaultBunSpawnRunner } from "../github/client";
import type { ProcessRunner } from "../github/types";
import type { AgentType, AuthMountsConfig, SandboxType } from "../types";
import type { AgentRunner, AgentRunOptions, AgentRunResult } from "./types";

export interface DefaultAgentRunnerOptions extends AgentRuntimeOptions {
	readonly processRunner?: ProcessRunner;
}

function validateAgentCredentials(
	agent: AgentType,
	env: Record<string, string | undefined>,
): void {
	if (agent === "codex") {
		validateCodexConfiguration(env);
	}
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
	private readonly processRunner: ProcessRunner;
	private readonly authMountsConfig: AuthMountsConfig;

	constructor(options: DefaultAgentRunnerOptions = {}) {
		const runtime = resolveAgentRuntime(options);
		this.agent = runtime.agent;
		this.model = runtime.model;
		this.sandbox = runtime.sandbox;
		this.imageName = runtime.imageName;
		this.dangerouslySkipPermissions = runtime.dangerouslySkipPermissions;
		this.authMountsConfig = runtime.authMountsConfig;
		this.processRunner = options.processRunner ?? defaultBunSpawnRunner;
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
			validateAgentCredentials(this.agent, this.authMountsConfig.env);
			executionCmd = buildDockerRunCommand({
				agentCmd,
				authMounts: this.authMountsConfig,
				imageName: this.imageName,
				worktreePath: options.worktreePath ?? "",
			});
			executionEnv = process.env;
		} else {
			validateAgentCredentials(this.agent, this.authMountsConfig.env);
			executionCmd = agentCmd;
			executionEnv = {
				...process.env,
				...this.authMountsConfig.env,
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
			routedModel: extractRoutedModel(result.stdout),
			stdout: result.stdout,
		};
	}

	private buildAgentCommand(prompt: string): string[] {
		if (this.agent === "codex") {
			const cmd: string[] = ["codex", "exec", prompt];
			cmd.push("--model", this.model as string);
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

export function extractRoutedModel(output?: string): string | undefined {
	if (!output) {
		return undefined;
	}

	for (const line of output.split("\n")) {
		try {
			const event = JSON.parse(line) as unknown;
			const model = findModelValue(event);
			if (model) {
				return model;
			}
		} catch {
			// Provider output is best-effort telemetry; invalid lines are harmless.
		}
	}

	return undefined;
}

function findModelValue(value: unknown): string | undefined {
	if (!value || typeof value !== "object") {
		return undefined;
	}

	for (const [key, nested] of Object.entries(value)) {
		if (
			(key === "model" || key === "model_name" || key === "routed_model") &&
			typeof nested === "string" &&
			nested.length > 0
		) {
			return nested;
		}
		const nestedModel = findModelValue(nested);
		if (nestedModel) {
			return nestedModel;
		}
	}

	return undefined;
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
