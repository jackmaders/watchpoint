import { defaultBunSpawnRunner } from "../github/client";
import type { ProcessRunner } from "../github/types";
import type { AgentType } from "../types";
import type { AgentRunner, AgentRunOptions, AgentRunResult } from "./types";

export interface DefaultAgentRunnerOptions {
	readonly agent?: AgentType;
	readonly model?: string;
	readonly processRunner?: ProcessRunner;
}

export class DefaultAgentRunner implements AgentRunner {
	private readonly agent: AgentType;
	private readonly model?: string;
	private readonly processRunner: ProcessRunner;

	constructor(options: DefaultAgentRunnerOptions = {}) {
		this.agent = options.agent ?? "agy";
		this.model = options.model;
		this.processRunner = options.processRunner ?? defaultBunSpawnRunner;
	}

	async run(options: AgentRunOptions): Promise<AgentRunResult> {
		if (options.signal?.aborted) {
			throw new Error("Agent run aborted");
		}

		const cmd = this.buildCommand(options.prompt);
		const cwd = options.worktreePath;

		const result = await this.processRunner(cmd, {
			cwd,
			env: {
				...process.env,
				AGY_NON_INTERACTIVE: "1",
			},
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

	private buildCommand(prompt: string): string[] {
		const cmd: string[] = [this.agent, "-p", prompt];
		if (this.model) {
			cmd.push("--model", this.model);
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
