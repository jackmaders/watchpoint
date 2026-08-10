/**
 * The one place agent scripts write to the console. It exists to be a *seam*,
 * not to add behaviour: because every script logs through this module, a test
 * can `vi.mock("./logger")` and pick up the adjacent `__mocks__` stand-in,
 * which both keeps the run quiet (CODING_STANDARDS.md — "No console output in
 * tests", enforced by `vitest.config.ts`'s `onConsoleLog`) and makes a warning
 * assertable. Production behaviour is exactly `console`.
 */
export const logger = {
	error(...args: unknown[]): void {
		console.error(...args);
	},
	log(...args: unknown[]): void {
		console.log(...args);
	},
	warn(...args: unknown[]): void {
		console.warn(...args);
	},
};
