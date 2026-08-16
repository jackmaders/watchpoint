import {
	applyCommonBooleanFlag,
	applyCommonValueFlag,
	createDefaultCommonCliState,
	parsePositiveInt,
} from "../cli-args";
import { DefaultGithubClient } from "../github/client";
import { DefaultWatcherClock } from "./heartbeat";
import { setupGracefulShutdown } from "./signal-handler";
import type {
	WatchCliArgs,
	WatchCommandOptions,
	WatcherDaemonOptions,
	WatcherDaemonStats,
} from "./types";
import { WatcherDaemon } from "./watcher-daemon";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";

export function defaultWatchLogger(msg: string): void {
	console.log(msg);
}

interface MutableWatchArgs extends WatchCliArgs {
	intervalSeconds: number;
	once: boolean;
	limit?: number;
}

function handleWatchCustomFlag(
	state: MutableWatchArgs,
	arg: string,
	nextVal?: string,
): number {
	if (arg === "--interval" && nextVal) {
		state.intervalSeconds = parsePositiveInt(nextVal, "interval");
		return 1;
	}
	if (arg === "--limit" && nextVal) {
		state.limit = parsePositiveInt(nextVal, "limit");
		return 1;
	}
	if (arg === "--once") {
		state.once = true;
		return 0;
	}
	return -1;
}

export function parseWatchCliArgs(argv: string[]): WatchCliArgs {
	const common = createDefaultCommonCliState();
	const state: MutableWatchArgs = {
		...common,
		intervalSeconds: 60,
		once: false,
	};

	const startIndex = argv[0] === "watch" ? 1 : 0;

	for (let i = startIndex; i < argv.length; i++) {
		const arg = argv[i];
		const nextVal = argv[i + 1];

		const custom = handleWatchCustomFlag(state, arg, nextVal);
		if (custom > 0) {
			i += custom;
			continue;
		}
		if (custom === 0) {
			continue;
		}

		const consumed = applyCommonValueFlag(state, arg, nextVal);
		if (consumed > 0) {
			i += consumed;
		} else {
			applyCommonBooleanFlag(state, arg);
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
  --sandbox <name>      Sandbox execution provider (docker, none) [default: docker]
  --image <name>        Docker image override [default: sandcastle:watchpoint]
  --no-sandbox          Run agent directly on host without Docker container isolation
	--agent <name>        Agent provider (agy, gemini, codex, claude) [default: codex]
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
