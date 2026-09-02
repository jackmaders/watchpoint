/**
 * Computes and formats performance telemetry for interactive VOD playthrough attempts,
 * quantifying player accuracy percentages and median response latencies.
 *
 * Exports pure computation and formatting utilities including `calculateAccuracy`,
 * `calculateMedianActiveLatency`, `formatAccuracy`, and `formatLatency`, filtering out timed-out
 * attempts and rounding metrics deterministically for UI presentation and data persistence.
 */

export interface AttemptMetricItem {
	isTimedOut: boolean;
	responseTimeMs: number;
}

export function calculateAccuracy(
	totalScenarios: number,
	correctCount: number,
): number {
	if (totalScenarios <= 0) return 0;
	return Math.round((correctCount / totalScenarios) * 1000) / 10;
}

export function calculateMedianActiveLatency(
	attempts: readonly AttemptMetricItem[],
): number | null {
	const activeLatencies = attempts
		.filter((attempt) => !attempt.isTimedOut)
		.map((attempt) => attempt.responseTimeMs)
		.sort((a, b) => a - b);

	if (activeLatencies.length === 0) return null;

	const mid = Math.floor(activeLatencies.length / 2);
	if (activeLatencies.length % 2 !== 0) {
		return activeLatencies[mid] as number;
	}

	const lower = activeLatencies[mid - 1] as number;
	const upper = activeLatencies[mid] as number;
	return Math.round((lower + upper) / 2);
}

export function formatAccuracy(accuracy: number): string {
	const rounded = Math.round(accuracy * 10) / 10;
	return `${rounded}%`;
}

export function formatLatency(latencyMs: number | null): string {
	if (latencyMs === null) return "—";
	return `${latencyMs.toLocaleString()} ms`;
}
