import {
	defaultCodexModel,
	parseCodexProvider,
	resolveCodexProvider,
} from "./codex-config";
import type { AgentType, SandboxType, SandcastleCliArgs } from "./types";

export const VALID_AGENTS: readonly AgentType[] = [
	"agy",
	"gemini",
	"codex",
	"claude",
];

export const VALID_SANDBOXES: readonly SandboxType[] = ["docker", "none"];

export function parseAgent(val: string): AgentType {
	const candidate = val as AgentType;
	if (!VALID_AGENTS.includes(candidate)) {
		throw new Error(
			`Unsupported agent: ${candidate}. Expected one of: ${VALID_AGENTS.join(", ")}`,
		);
	}
	return candidate;
}

export function parseSandbox(val: string): SandboxType {
	const candidate = val as SandboxType;
	if (!VALID_SANDBOXES.includes(candidate)) {
		throw new Error(
			`Unsupported sandbox: ${candidate}. Expected one of: ${VALID_SANDBOXES.join(", ")}`,
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
	codexProvider: ReturnType<typeof resolveCodexProvider>;
	maxAttempts: number;
	dryRun: boolean;
	pr: boolean;
	localOnly: boolean;
	branch?: string;
	help: boolean;
	sandbox: SandboxType;
	imageName?: string;
	dangerouslySkipPermissions: boolean;
}

export function createDefaultCommonCliState(): CommonCliState {
	return {
		agent: "codex",
		codexProvider: resolveCodexProvider(),
		dangerouslySkipPermissions: true,
		dryRun: false,
		help: false,
		imageName: process.env.SANDCASTLE_IMAGE || "sandcastle:watchpoint",
		localOnly: false,
		maxAttempts: 3,
		pr: true,
		sandbox: "docker",
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
	if (arg === "--codex-provider") {
		state.codexProvider = parseCodexProvider(nextVal);
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
	if (arg === "--sandbox") {
		state.sandbox = parseSandbox(nextVal);
		return 1;
	}
	if (arg === "--image" || arg === "--image-name") {
		state.imageName = nextVal;
		return 1;
	}
	return 0;
}

const BOOLEAN_FLAG_ACTIONS: Record<
	string,
	(state: Partial<CommonCliState>) => void
> = {
	"--dangerously-skip-permissions": (s) => {
		s.dangerouslySkipPermissions = true;
	},
	"--docker": (s) => {
		s.sandbox = "docker";
	},
	"--dry-run": (s) => {
		s.dryRun = true;
	},
	"--help": (s) => {
		s.help = true;
	},
	"--local-only": (s) => {
		s.localOnly = true;
		s.pr = false;
	},
	"--no-pr": (s) => {
		s.pr = false;
	},
	"--no-sandbox": (s) => {
		s.sandbox = "none";
	},
	"--no-skip-permissions": (s) => {
		s.dangerouslySkipPermissions = false;
	},
	"--pr": (s) => {
		s.pr = true;
		s.localOnly = false;
	},
	"--skip-permissions": (s) => {
		s.dangerouslySkipPermissions = true;
	},
	"-h": (s) => {
		s.help = true;
	},
};

export function applyCommonBooleanFlag(
	state: Partial<CommonCliState>,
	arg: string,
): boolean {
	const action = BOOLEAN_FLAG_ACTIONS[arg];
	if (action) {
		action(state);
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
		codexProvider: state.codexProvider,
		dangerouslySkipPermissions: state.dangerouslySkipPermissions,
		dryRun: state.dryRun,
		imageName: state.imageName,
		issue: state.issue,
		localOnly: state.localOnly,
		maxRetries: state.maxAttempts,
		model:
			state.model ??
			(state.agent === "codex"
				? defaultCodexModel(state.codexProvider)
				: undefined),
		pr: state.pr,
		prompt: state.prompt,
		sandbox: state.sandbox,
	};
}
