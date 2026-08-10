/**
 * Every stage script ends with `runIfMain(run)` instead of repeating
 * `if (process.env.NODE_ENV !== "test") run();` inline. Vitest sets
 * `NODE_ENV=test` for every test file, so importing a stage script under
 * test never re-triggers its own entrypoint — but that guard, written
 * inline, is a line no test can ever exercise both branches of (the test
 * that imports the module is, by definition, running with `NODE_ENV=test`).
 * Centralising it here means the guard itself is tested once, rather than
 * leaving an identical, structurally-uncoverable line in every stage script
 * under `scripts/agents/**`.
 */
export function runIfMain(main: () => void | Promise<void>): void {
	if (process.env.NODE_ENV !== "test") {
		main();
	}
}
