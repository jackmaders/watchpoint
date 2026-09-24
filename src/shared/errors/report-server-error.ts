// biome-ignore-all lint/style/useNamingConvention: Log field names follow the observability schema
// biome-ignore-all lint/suspicious/noConsole: Cloudflare Workers exports console logs to PostHog

import { ServerFunctionError } from "./server-function-error";

export function reportServerError(raw: unknown, operation: string): void {
	try {
		const expected = raw instanceof ServerFunctionError;
		const error = raw instanceof Error ? raw : new Error(String(raw));
		const details = {
			event: "server_function.error",
			operation,
			expected,
			error_type: error.name,
			error_message: error.message,
			error_stack: error.stack,
			...(expected ? { status: raw.status } : {}),
		};

		if (expected) {
			console.warn(details);
		} else {
			console.error(details);
		}
	} catch {
		// Observability must never alter server-function behavior.
	}
}
