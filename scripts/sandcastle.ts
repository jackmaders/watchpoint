#!/usr/bin/env bun
import { orchestrateSandcastle, parseCliArgs } from "../.sandcastle";

async function main() {
	try {
		const args = parseCliArgs(process.argv.slice(2));
		const result = await orchestrateSandcastle(
			{ args },
			{
				logger: (msg) => {
					console.log(`[Sandcastle] ${msg}`);
				},
			},
		);

		if (!result.success) {
			console.error(
				`\n❌ Sandcastle orchestration failed after ${result.attempts} attempts:\n${result.error || "Unknown failure"}`,
			);
			process.exit(1);
		}

		console.log(
			`\n✨ Sandcastle orchestration completed successfully!\n- Branch: ${result.branch}\n- Commits: ${result.commits.length}\n- Attempts: ${result.attempts}${result.prUrl ? `\n- PR: ${result.prUrl}` : ""}`,
		);
	} catch (err: unknown) {
		const error = err as Error;
		console.error(`\n❌ Error: ${error.message || String(err)}`);
		process.exit(1);
	}
}

if (import.meta.main) {
	main();
}
