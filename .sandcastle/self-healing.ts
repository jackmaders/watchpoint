import type { VerificationCheckResult, VerificationResult } from "./types";

export interface CommandExecOutput {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export async function runVerificationChecks(
	executor: (cmd: string) => Promise<CommandExecOutput>,
): Promise<VerificationResult> {
	const commands = [
		{ cmd: "bun run check:all", name: "check:all" },
		{ cmd: "bun run test:unit", name: "test:unit" },
	];

	const checks: VerificationCheckResult[] = [];

	for (const { name, cmd } of commands) {
		const result = await executor(cmd);
		const success = result.exitCode === 0;
		const output = (result.stderr || result.stdout).trim();

		checks.push({
			name,
			output,
			success,
		});

		if (!success) {
			return {
				aggregatedError: `Verification failed at step '${name}':\n${output}`,
				checks,
				success: false,
			};
		}
	}

	return {
		checks,
		success: true,
	};
}

export function buildSelfHealingPrompt(options: {
	originalPrompt: string;
	failureOutput: string;
	attempt: number;
	maxAttempts: number;
}): string {
	return `The previous code changes failed automated verification checks (attempt ${options.attempt} of ${options.maxAttempts}):\n\n\`\`\`\n${options.failureOutput}\n\`\`\`\n\nOriginal task: ${options.originalPrompt}\n\nPlease inspect the errors above and modify the codebase so that 'bun run check:all' and 'bun run test:unit' pass completely. Ensure all coding standards, types, and unit tests are satisfied.`;
}

export async function executeSelfHealingLoop(options: {
	initialPrompt: string;
	maxRetries: number;
	runIteration: (prompt: string, attempt: number) => Promise<void>;
	verify: () => Promise<VerificationResult>;
	onProgress?: (message: string) => void;
}): Promise<{
	success: boolean;
	attempts: number;
	lastVerification: VerificationResult;
}> {
	let currentPrompt = options.initialPrompt;
	let attempt = 0;
	let lastVerification: VerificationResult = {
		checks: [],
		success: false,
	};

	while (attempt < options.maxRetries) {
		attempt++;
		options.onProgress?.(
			`Starting execution iteration ${attempt}/${options.maxRetries}...`,
		);
		await options.runIteration(currentPrompt, attempt);

		options.onProgress?.(
			`Running verification checks for iteration ${attempt}...`,
		);
		lastVerification = await options.verify();

		if (lastVerification.success) {
			options.onProgress?.(`Verification succeeded on iteration ${attempt}.`);
			return {
				attempts: attempt,
				lastVerification,
				success: true,
			};
		}

		options.onProgress?.(
			`Verification failed on iteration ${attempt}: ${lastVerification.aggregatedError || "Unknown failure"}`,
		);

		if (attempt < options.maxRetries) {
			currentPrompt = buildSelfHealingPrompt({
				attempt,
				failureOutput:
					lastVerification.aggregatedError ||
					"Verification checks failed with non-zero exit code.",
				maxAttempts: options.maxRetries,
				originalPrompt: options.initialPrompt,
			});
		}
	}

	return {
		attempts: attempt,
		lastVerification,
		success: false,
	};
}
