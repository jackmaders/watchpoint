#!/usr/bin/env bun
import {
	orchestrateSandcastle,
	parseCliArgs,
	parsePickCliArgs,
	runPickCommand,
} from "../.sandcastle";

async function handlePickSubcommand(): Promise<void> {
	const pickArgs = parsePickCliArgs(process.argv.slice(3));
	const result = await runPickCommand({
		args: pickArgs,
		logger: (msg) => {
			console.log(msg);
		},
	});

	if (result && !result.success) {
		console.error(
			`\n❌ Sandcastle pick execution failed:\n${result.error || "Unknown failure"}`,
		);
		process.exit(1);
	}

	if (result?.success) {
		console.log(
			`\n✨ Sandcastle execution completed successfully!\n- Issue: #${result.issueNumber}\n- Branch: ${result.branch}\n- Attempts: ${result.attempts}${result.prUrl ? `\n- PR: ${result.prUrl}` : ""}`,
		);
	}
}

async function handleDefaultSubcommand(): Promise<void> {
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
}

async function main() {
	try {
		if (process.argv[2] === "pick") {
			await handlePickSubcommand();
			return;
		}

		await handleDefaultSubcommand();
	} catch (err: unknown) {
		const error = err as Error;
		console.error(`\n❌ Error: ${error.message || String(err)}`);
		process.exit(1);
	}
}

if (import.meta.main) {
	main();
}
