/**
 * The one place agent scripts write to the console. Silent under
 * `NODE_ENV=test` so a genuinely-exercised warning/error branch does not trip
 * `vitest.config.ts`'s `onConsoleLog` hook, which treats any *unrouted*
 * console output as a test failure (CODING_STANDARDS.md — "No console output
 * in tests"). Outside tests this behaves exactly like `console`.
 */
function isTest(): boolean {
	return process.env.NODE_ENV === "test";
}

export const logger = {
	error(...args: unknown[]): void {
		if (isTest()) return;
		console.error(...args);
	},
	log(...args: unknown[]): void {
		if (isTest()) return;
		console.log(...args);
	},
	warn(...args: unknown[]): void {
		if (isTest()) return;
		console.warn(...args);
	},
};
