import { DefaultGithubClient } from "../github/client";
import type { AgentType } from "../types";
import { DefaultWatcherClock } from "./heartbeat";
import { setupGracefulShutdown } from "./signal-handler";
import type {
	WatchCliArgs,
	WatchCommandOptions,
	WatcherDaemonOptions,
	WatcherDaemonStats,
} from "./types";
import { WatcherDaemon } from "./watcher-daemon";

const VALID_AGENTS: readonly AgentType[] = ["agy", "gemini", "codex", "claude"];
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";

export function defaultWatchLogger(msg: string): void {
	console.log(msg);
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

function parsePositiveInt(val: string, flagName: string): number {
	const parsed = Number.parseInt(val, 10);
	if (Number.isNaN(parsed) || parsed <= 0) {
		throw new Error(`Invalid ${flagName}: ${val}. Must be a positive integer.`);
	}
	return parsed;
}

interface MutableWatchArgs {
	intervalSeconds: number;
	once: boolean;
	limit?: number;
	agent: AgentType;
	model?: string;
	maxAttempts: number;
	dryRun: boolean;
	pr: boolean;
	localOnly: boolean;
	branch?: string;
	help: boolean;
}

function applyValueFlag(
	state: MutableWatchArgs,
	arg: string,
	nextVal?: string,
): number {
	if (!nextVal) return 0;
	if (arg === "--interval") {
		state.intervalSeconds = parsePositiveInt(nextVal, "interval");
		return 1;
	}
	if (arg === "--limit") {
		state.limit = parsePositiveInt(nextVal, "limit");
		return 1;
	}
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

function applyBooleanFlag(state: MutableWatchArgs, arg: string): void {
	if (arg === "--help" || arg === "-h") {
		state.help = true;
	} else if (arg === "--once") {
		state.once = true;
	} else if (arg === "--dry-run") {
		state.dryRun = true;
	} else if (arg === "--local-only") {
		state.localOnly = true;
		state.pr = false;
	} else if (arg === "--no-pr") {
		state.pr = false;
	} else if (arg === "--pr") {
		state.pr = true;
		state.localOnly = false;
	}
}

export function parseWatchCliArgs(argv: string[]): WatchCliArgs {
	const state: MutableWatchArgs = {
		agent: "agy",
		dryRun: false,
		help: false,
		intervalSeconds: 60,
		localOnly: false,
		maxAttempts: 3,
		once: false,
		pr: true,
	};

	for (let i = 0; i < argv.length; i++) {
		const consumed = applyValueFlag(state, argv[i], argv[i + 1]);
		if (consumed > 0) {
			i += consumed;
		} else {
			applyBooleanFlag(state, argv[i]);
		}
	}

	return state;
}

export function formatWatchHelp(): string {
	return `
${BOLD}${CYAN}Sandcastle Background Watcher Daemon${RESET}
Continuously polls the repository for unblocked ready-for-agent frontier tickets and executes them autonomously in FIFO order.

${BOLD}USAGE:${RESET}
  bun run sandcastle:watch [options]
  bun scripts/sandcastle.ts watch [options]

${BOLD}OPTIONS:${RESET}
  --interval <seconds>  Polling interval in seconds when queue is idle [default: 60]
  --once                Process at most one eligible ticket and exit
  --limit <n>           Process up to n eligible tickets before exiting cleanly
  --agent <name>        Agent provider (agy, gemini, codex, claude) [default: agy]
  --model <name>        Model name override for agent provider
  --max-attempts <n>    Maximum self-healing attempts before failure [default: 3]
  --branch <name>       Target git branch override
  --dry-run             Preview target tickets without executing workflow
  --no-pr               Skip automatic pull request creation
  --local-only          Run locally without remote pushes or PR creation
  --help, -h            Show this help documentation

${BOLD}SIGNALS & SHUTDOWN:${RESET}
  Ctrl+C (SIGINT)       Initiate graceful shutdown (releases claims & cleans workspaces)
  Ctrl+C (2nd time)     Immediate emergency exit (code 130)
`.trim();
}

function resolveDaemonOptions(
	options: WatchCommandOptions,
	args: Partial<WatchCliArgs>,
	signal: AbortSignal | undefined,
	logger: (msg: string) => void,
): WatcherDaemonOptions {
	const githubClient =
		options.githubClient ?? new DefaultGithubClient({ cwd: options.cwd });
	const clock = options.clock ?? new DefaultWatcherClock();
	const output = options.output ?? process.stdout;

	const merged: WatcherDaemonOptions = {
		...options,
		clock,
		githubClient,
		logger,
		output,
		signal,
	};

	return Object.assign(merged, args);
}

export async function runWatchCommand(
	options: WatchCommandOptions = {},
): Promise<WatcherDaemonStats | null> {
	const args = options.args
		? { ...parseWatchCliArgs([]), ...options.args }
		: parseWatchCliArgs(process.argv.slice(2));
	const logger = options.logger ?? defaultWatchLogger;

	if (args.help) {
		logger(formatWatchHelp());
		return null;
	}

	let signal = options.signal;
	let signalControllerCleanup: (() => void) | undefined;

	if (!signal) {
		const signalController = setupGracefulShutdown({ logger });
		signal = signalController.abortController.signal;
		signalControllerCleanup = signalController.cleanup;
	}

	try {
		const daemonOptions = resolveDaemonOptions(options, args, signal, logger);
		const daemon = new WatcherDaemon(daemonOptions);
		return await daemon.run();
	} finally {
		signalControllerCleanup?.();
	}
}
