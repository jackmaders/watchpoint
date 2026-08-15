import type { AgentType, SandcastleCliArgs } from "./types";

const VALID_AGENTS: readonly AgentType[] = ["agy", "gemini", "codex", "claude"];

interface ParseState {
	issue?: number;
	prompt?: string;
	agent: AgentType;
	model?: string;
	maxRetries: number;
	pr: boolean;
	localOnly: boolean;
	dryRun: boolean;
	branch?: string;
}

function parseIssue(val: string): number {
	const parsed = Number.parseInt(val, 10);
	if (Number.isNaN(parsed) || parsed <= 0) {
		throw new Error(
			`Invalid issue number: ${val}. Must be a positive integer.`,
		);
	}
	return parsed;
}

function parseAgent(val: string): AgentType {
	const candidate = val as AgentType;
	if (!VALID_AGENTS.includes(candidate)) {
		throw new Error(
			`Unsupported agent: ${candidate}. Expected one of: ${VALID_AGENTS.join(", ")}`,
		);
	}
	return candidate;
}

function handleValueFlag(
	state: ParseState,
	arg: string,
	nextVal: string,
): boolean {
	if (arg === "--issue") {
		state.issue = parseIssue(nextVal);
		return true;
	}
	if (arg === "--prompt" || arg === "-p") {
		state.prompt = nextVal;
		return true;
	}
	if (arg === "--agent") {
		state.agent = parseAgent(nextVal);
		return true;
	}
	if (arg === "--model") {
		state.model = nextVal;
		return true;
	}
	if (arg === "--max-retries" || arg === "--retries") {
		state.maxRetries = Number.parseInt(nextVal, 10);
		return true;
	}
	if (arg === "--branch") {
		state.branch = nextVal;
		return true;
	}
	return false;
}

function handleBooleanFlag(state: ParseState, arg: string): void {
	if (arg === "--local-only") {
		state.localOnly = true;
		state.pr = false;
	} else if (arg === "--no-pr") {
		state.pr = false;
	} else if (arg === "--pr") {
		state.pr = true;
	} else if (arg === "--dry-run") {
		state.dryRun = true;
	}
}

export function parseCliArgs(argv: string[]): SandcastleCliArgs {
	const state: ParseState = {
		agent: "agy",
		dryRun: false,
		localOnly: false,
		maxRetries: 3,
		pr: true,
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		const hasNext = i + 1 < argv.length;
		if (hasNext && handleValueFlag(state, arg, argv[i + 1])) {
			i++;
		} else {
			handleBooleanFlag(state, arg);
		}
	}

	if (state.issue === undefined && !state.prompt) {
		throw new Error("Must provide either --issue <number> or --prompt <text>");
	}

	return state;
}
