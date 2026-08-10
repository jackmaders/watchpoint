/**
 * Every stage script ends with `runIfMain(import.meta.main, run)`.
 *
 * `import.meta.main` is the real predicate — "was this file executed, rather
 * than imported?" — so a script imported for its exported helpers never fires
 * its own `main`, whether the importer is a test or another stage script.
 * Passing it in (instead of reading it here) is what keeps this guard testable:
 * `import.meta.main` is fixed for the lifetime of a module, so a function that
 * read it directly could never be exercised both ways.
 */
export function runIfMain(
	isMain: boolean,
	main: () => void | Promise<void>,
): void {
	if (isMain) {
		main();
	}
}
