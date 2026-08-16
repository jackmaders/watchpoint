import type { AgentRunner, AgentRunOptions, AgentRunResult } from "./types";

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
