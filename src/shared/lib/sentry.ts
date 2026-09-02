/**
 * Provides centralized error tracking and operational message capture for application observability.
 *
 * Wraps `@sentry/react` primitives to export `captureException` and `captureMessage`, establishing
 * a consistent telemetry seam that insulates domain and UI layers from direct third-party SDK coupling.
 */

import * as Sentry from "@sentry/react";

export function captureException(
	error: unknown,
	captureContext?: Parameters<typeof Sentry.captureException>[1],
): string {
	return Sentry.captureException(error, captureContext);
}

export function captureMessage(
	message: string,
	captureContext?: Parameters<typeof Sentry.captureMessage>[1],
): string {
	return Sentry.captureMessage(message, captureContext);
}
