import { describe, expect, it, vi } from "vitest";
import {
	defaultExit,
	defaultProcessOff,
	defaultProcessOn,
	defaultSignalLogger,
	setupGracefulShutdown,
} from "../signal-handler";

describe("setupGracefulShutdown", () => {
	it("handles first SIGINT by setting isShuttingDown and aborting signal", async () => {
		// Arrange
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		let shutdownCallbackCalled = false;
		const onGracefulShutdown = async () => {
			shutdownCallbackCalled = true;
		};
		const registered = new Map<NodeJS.Signals, (...args: unknown[]) => void>();
		const processOn = (
			event: NodeJS.Signals,
			handler: (...args: unknown[]) => void,
		) => {
			registered.set(event, handler);
		};
		const processOff = (
			event: NodeJS.Signals,
			_handler: (...args: unknown[]) => void,
		) => {
			registered.delete(event);
		};

		const controller = setupGracefulShutdown({
			logger,
			onGracefulShutdown,
			processOff,
			processOn,
		});

		// Act
		expect(controller.isShuttingDown()).toBe(false);
		await controller.handleSignal("SIGINT");

		// Assert
		expect(controller.isShuttingDown()).toBe(true);
		expect(controller.abortController.signal.aborted).toBe(true);
		expect(shutdownCallbackCalled).toBe(true);
		expect(logs.some((l) => l.includes("Graceful shutdown initiated"))).toBe(
			true,
		);
	});

	it("handles first SIGTERM similarly", async () => {
		// Arrange
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const registered = new Map<NodeJS.Signals, (...args: unknown[]) => void>();
		const processOn = (
			event: NodeJS.Signals,
			handler: (...args: unknown[]) => void,
		) => {
			registered.set(event, handler);
		};

		const controller = setupGracefulShutdown({
			logger,
			processOn,
		});

		// Act
		await controller.handleSignal("SIGTERM");

		// Assert
		expect(controller.isShuttingDown()).toBe(true);
		expect(controller.abortController.signal.aborted).toBe(true);
	});

	it("catches and logs error if onGracefulShutdown throws", async () => {
		// Arrange
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const onGracefulShutdown = async () => {
			throw new Error("Cleanup disk failure");
		};
		const processOn = vi.fn();

		const controller = setupGracefulShutdown({
			logger,
			onGracefulShutdown,
			processOn,
		});

		// Act
		await controller.handleSignal("SIGINT");

		// Assert
		expect(
			logs.some((l) =>
				l.includes("Error during shutdown cleanup: Cleanup disk failure"),
			),
		).toBe(true);
	});

	it("handles non-Error thrown from onGracefulShutdown", async () => {
		// Arrange
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const onGracefulShutdown = async () => {
			throw "string failure";
		};
		const processOn = vi.fn();

		const controller = setupGracefulShutdown({
			logger,
			onGracefulShutdown,
			processOn,
		});

		// Act
		await controller.handleSignal("SIGINT");

		// Assert
		expect(
			logs.some((l) =>
				l.includes("Error during shutdown cleanup: string failure"),
			),
		).toBe(true);
	});

	it("triggers immediate exit(130) on 2nd SIGINT during shutdown", async () => {
		// Arrange
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		let exitCode: number | null = null;
		const exit = (code: number) => {
			exitCode = code;
		};
		const processOn = vi.fn();

		const controller = setupGracefulShutdown({
			exit,
			logger,
			processOn,
		});

		// Act - 1st signal
		await controller.handleSignal("SIGINT");
		// Act - 2nd signal
		await controller.handleSignal("SIGINT");

		// Assert
		expect(exitCode).toBe(130);
		expect(logs.some((l) => l.includes("Emergency shutdown requested"))).toBe(
			true,
		);
	});

	it("ignores 2nd SIGTERM during shutdown without calling exit", async () => {
		// Arrange
		let exitCode: number | null = null;
		const exit = (code: number) => {
			exitCode = code;
		};
		const processOn = vi.fn();

		const controller = setupGracefulShutdown({
			exit,
			processOn,
		});

		// Act - 1st signal
		await controller.handleSignal("SIGINT");
		// Act - 2nd signal SIGTERM
		await controller.handleSignal("SIGTERM");

		// Assert
		expect(exitCode).toBeNull();
	});

	it("cleanup unregisters all event listeners", () => {
		// Arrange
		const registered = new Map<NodeJS.Signals, (...args: unknown[]) => void>();
		const processOn = (
			event: NodeJS.Signals,
			handler: (...args: unknown[]) => void,
		) => {
			registered.set(event, handler);
		};
		const processOff = (
			event: NodeJS.Signals,
			_handler: (...args: unknown[]) => void,
		) => {
			registered.delete(event);
		};

		const controller = setupGracefulShutdown({
			processOff,
			processOn,
		});

		// Act
		expect(registered.size).toBe(2);
		controller.cleanup();

		// Assert
		expect(registered.size).toBe(0);
	});

	it("triggers registered listener from processOn", async () => {
		// Arrange
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const listeners = new Map<NodeJS.Signals, (...args: unknown[]) => void>();
		const processOn = (
			event: NodeJS.Signals,
			handler: (...args: unknown[]) => void,
		) => {
			listeners.set(event, handler);
		};
		const controller = setupGracefulShutdown({
			logger,
			processOn,
		});

		// Act
		const sigintListener = listeners.get("SIGINT");
		expect(sigintListener).toBeDefined();
		sigintListener?.();

		// Assert
		expect(controller.isShuttingDown()).toBe(true);
	});
});

describe("default helper functions", () => {
	it("defaultSignalLogger writes to console.log", () => {
		// Arrange
		let logged = "";
		const originalLog = console.log;
		console.log = (msg: string) => {
			logged = msg;
		};

		// Act
		try {
			defaultSignalLogger("hello");
		} finally {
			console.log = originalLog;
		}

		// Assert
		expect(logged).toBe("hello");
	});

	it("defaultProcessOn and defaultProcessOff wrap process.on and process.off", () => {
		// Arrange
		const handler = () => {};
		let onCalled = false;
		let offCalled = false;
		const originalOn = process.on;
		const originalOff = process.off;
		process.on = ((event: string) => {
			if (event === "SIGINT") onCalled = true;
			return process;
		}) as unknown as typeof process.on;
		process.off = ((event: string) => {
			if (event === "SIGINT") offCalled = true;
			return process;
		}) as unknown as typeof process.off;

		// Act
		try {
			defaultProcessOn("SIGINT", handler);
			defaultProcessOff("SIGINT", handler);
		} finally {
			process.on = originalOn;
			process.off = originalOff;
		}

		// Assert
		expect(onCalled).toBe(true);
		expect(offCalled).toBe(true);
	});

	it("defaultExit calls process.exit", () => {
		// Arrange
		let exitCode: number | undefined;
		const originalExit = process.exit;
		process.exit = ((code: number) => {
			exitCode = code;
		}) as unknown as typeof process.exit;

		// Act
		try {
			defaultExit(130);
		} finally {
			process.exit = originalExit;
		}

		// Assert
		expect(exitCode).toBe(130);
	});
});
