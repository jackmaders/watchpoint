export interface SignalHandlerOptions {
	readonly logger?: (msg: string) => void;
	readonly onGracefulShutdown?: () => Promise<void> | void;
	readonly exit?: (code: number) => void;
	readonly signals?: readonly NodeJS.Signals[];
	readonly processOn?: (
		event: NodeJS.Signals,
		handler: (...args: unknown[]) => void,
	) => void;
	readonly processOff?: (
		event: NodeJS.Signals,
		handler: (...args: unknown[]) => void,
	) => void;
}

export interface SignalHandlerController {
	readonly abortController: AbortController;
	readonly isShuttingDown: () => boolean;
	readonly cleanup: () => void;
	readonly handleSignal: (signal: NodeJS.Signals) => Promise<void>;
}

export const defaultSignalLogger = (msg: string): void => {
	console.log(msg);
};

export const defaultExit = (code: number): void => {
	process.exit(code);
};

export const defaultProcessOn = (
	event: NodeJS.Signals,
	handler: (...args: unknown[]) => void,
): void => {
	process.on(event, handler);
};

export const defaultProcessOff = (
	event: NodeJS.Signals,
	handler: (...args: unknown[]) => void,
): void => {
	process.off(event, handler);
};

function handleEmergencySignal(
	signal: NodeJS.Signals,
	logger: (msg: string) => void,
	exit: (code: number) => void,
): void {
	if (signal === "SIGINT") {
		logger(
			"\n💥 [Sandcastle Watcher] Emergency shutdown requested. Exiting immediately.",
		);
		exit(130);
	}
}

async function executeGracefulShutdown(
	abortController: AbortController,
	logger: (msg: string) => void,
	onGracefulShutdown?: () => Promise<void> | void,
): Promise<void> {
	abortController.abort();
	logger(
		"\n🛑 [Sandcastle Watcher] Graceful shutdown initiated. Cleaning up active tasks (press Ctrl+C again for emergency exit)...",
	);

	if (onGracefulShutdown) {
		try {
			await onGracefulShutdown();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			logger(`⚠️  [Sandcastle Watcher] Error during shutdown cleanup: ${msg}`);
		}
	}
}

export function setupGracefulShutdown(
	options: SignalHandlerOptions = {},
): SignalHandlerController {
	const logger = options.logger ?? defaultSignalLogger;
	const exit = options.exit ?? defaultExit;
	const processOn = options.processOn ?? defaultProcessOn;
	const processOff = options.processOff ?? defaultProcessOff;
	const signals = options.signals ?? ["SIGINT", "SIGTERM"];

	const abortController = new AbortController();
	let shuttingDown = false;

	const handleSignal = async (signal: NodeJS.Signals): Promise<void> => {
		if (shuttingDown) {
			handleEmergencySignal(signal, logger, exit);
			return;
		}

		shuttingDown = true;
		await executeGracefulShutdown(
			abortController,
			logger,
			options.onGracefulShutdown,
		);
	};

	const listeners = new Map<NodeJS.Signals, (...args: unknown[]) => void>();

	for (const sig of signals) {
		const listener = () => {
			void handleSignal(sig);
		};
		listeners.set(sig, listener);
		processOn(sig, listener);
	}

	const cleanup = () => {
		for (const [sig, listener] of listeners.entries()) {
			processOff(sig, listener);
		}
		listeners.clear();
	};

	return {
		abortController,
		cleanup,
		handleSignal,
		isShuttingDown: () => shuttingDown,
	};
}
