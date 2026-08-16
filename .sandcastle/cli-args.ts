import type { AgentType, SandcastleCliArgs } from "./types";

export const VALID_AGENTS: readonly AgentType[] = [
	"agy",
	"gemini",
	"codex",
	"claude",
];

export function parseAgent(val: string): AgentType {
	const candidate = val as AgentType;
	if (!VALID_AGENTS.includes(candidate)) {
		throw new Error(
			`Unsupported agent: ${candidate}. Expected one of: ${VALID_AGENTS.join(", ")}`,
		);
	}
	return candidate;
}

export function parsePositiveInt(val: string, flagName: string): number {
	const parsed = Number.parseInt(val, 10);
	if (Number.isNaN(parsed) || parsed <= 0) {
		throw new Error(`Invalid ${flagName}: ${val}. Must be a positive integer.`);
	}
	return parsed;
}

export interface CommonCliState {
	agent: AgentType;
	model?: string;
	maxAttempts: number;
	dryRun: boolean;
	pr: boolean;
	localOnly: boolean;
	branch?: string;
	help: boolean;
}

export function createDefaultCommonCliState(): CommonCliState {
	return {
		agent: "agy",
		dryRun: false,
		help: false,
		localOnly: false,
		maxAttempts: 3,
		pr: true,
	};
}

export function applyCommonValueFlag(
	state: Partial<CommonCliState>,
	arg: string,
	nextVal?: string,
): number {
	if (!nextVal) return 0;
	if (arg === "--agent") {
		state.agent = parseAgent(nextVal);
		return 1;
	}
	if (arg === "--model") {
		state.model = nextVal;
		return 1;
	}
	if (
		arg === "--max-attempts" ||
		arg === "--retries" ||
		arg === "--max-retries"
	) {
		state.maxAttempts = parsePositiveInt(nextVal, "max-attempts");
		return 1;
	}
	if (arg === "--branch") {
		state.branch = nextVal;
		return 1;
	}
	return 0;
}

export function applyCommonBooleanFlag(
	state: Partial<CommonCliState>,
	arg: string,
): boolean {
	if (arg === "--help" || arg === "-h") {
		state.help = true;
		return true;
	}
	if (arg === "--dry-run") {
		state.dryRun = true;
		return true;
	}
	if (arg === "--local-only") {
		state.localOnly = true;
		state.pr = false;
		return true;
	}
	if (arg === "--no-pr") {
		state.pr = false;
		return true;
	}
	if (arg === "--pr") {
		state.pr = true;
		state.localOnly = false;
		return true;
	}
	return false;
}

interface ParseState extends CommonCliState {
	issue?: number;
	prompt?: string;
}

function handleCliCustomFlag(
	state: ParseState,
	arg: string,
	nextVal?: string,
): number {
	if (arg === "--issue" && nextVal) {
		state.issue = parsePositiveInt(nextVal, "issue number");
		return 1;
	}
	if ((arg === "--prompt" || arg === "-p") && nextVal) {
		state.prompt = nextVal;
		return 1;
	}
	return 0;
}

export function parseCliArgs(argv: string[]): SandcastleCliArgs {
	const state: ParseState = {
		...createDefaultCommonCliState(),
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		const nextVal = argv[i + 1];

		const customConsumed = handleCliCustomFlag(state, arg, nextVal);
		if (customConsumed > 0) {
			i += customConsumed;
			continue;
		}

		const consumed = applyCommonValueFlag(state, arg, nextVal);
		if (consumed > 0) {
			i += consumed;
		} else {
			applyCommonBooleanFlag(state, arg);
		}
	}

	if (state.issue === undefined && !state.prompt) {
		throw new Error("Must provide either --issue <number> or --prompt <text>");
	}

	return {
		agent: state.agent,
		branch: state.branch,
		dryRun: state.dryRun,
		issue: state.issue,
		localOnly: state.localOnly,
		maxRetries: state.maxAttempts,
		model: state.model,
		pr: state.pr,
		prompt: state.prompt,
	};
}
