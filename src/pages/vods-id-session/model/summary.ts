/**
 * Aggregator and metric calculator for completed training session summary reports.
 *
 * Implements `calculateSessionSummary` to compute aggregate accuracy percentages, average response latency,
 * and per-learning-module statistics across all recorded attempts.
 */
import { MODULE_DEFINITIONS } from "@/entities/vod";
import type { ModuleType } from "@/shared/db";

export interface SessionAttempt {
	isCorrect: boolean;
	isTimedOut?: boolean;
	moduleType: ModuleType;
	responseTimeMs: number;
	scenarioId: string;
}

export interface ModuleSummaryReport {
	accuracyPercentage: number;
	averageLatencyMs: number;
	correct: number;
	total: number;
}

export interface SessionSummaryReport {
	accuracyPercentage: number;
	averageLatencyMs: number;
	correctCount: number;
	moduleBreakdown: Record<ModuleType, ModuleSummaryReport>;
	totalScenarios: number;
}

interface MutableStats {
	correct: number;
	total: number;
	totalLatencyMs: number;
}

function calculateRateAndLatency(stats: MutableStats): {
	accuracyPercentage: number;
	averageLatencyMs: number;
} {
	if (stats.total === 0) {
		return { accuracyPercentage: 0, averageLatencyMs: 0 };
	}
	return {
		accuracyPercentage: Math.round((stats.correct / stats.total) * 100),
		averageLatencyMs: Math.round(stats.totalLatencyMs / stats.total),
	};
}

function createInitialModuleStats(): Record<ModuleType, MutableStats> {
	const stats = {} as Record<ModuleType, MutableStats>;
	for (const def of MODULE_DEFINITIONS) {
		stats[def.key] = { correct: 0, total: 0, totalLatencyMs: 0 };
	}
	return stats;
}

export function calculateSessionSummary(
	attempts: SessionAttempt[],
): SessionSummaryReport {
	const totalScenarios = attempts.length;
	const moduleStats = createInitialModuleStats();
	let overallCorrect = 0;
	let overallLatencyMs = 0;

	for (const attempt of attempts) {
		if (attempt.isCorrect) {
			overallCorrect += 1;
		}
		overallLatencyMs += attempt.responseTimeMs;

		const target = moduleStats[attempt.moduleType];
		target.total += 1;
		if (attempt.isCorrect) {
			target.correct += 1;
		}
		target.totalLatencyMs += attempt.responseTimeMs;
	}

	const overallMetrics = calculateRateAndLatency({
		correct: overallCorrect,
		total: totalScenarios,
		totalLatencyMs: overallLatencyMs,
	});

	const moduleBreakdown = {} as Record<ModuleType, ModuleSummaryReport>;
	for (const def of MODULE_DEFINITIONS) {
		const stats = moduleStats[def.key];
		const metrics = calculateRateAndLatency(stats);
		moduleBreakdown[def.key] = {
			accuracyPercentage: metrics.accuracyPercentage,
			averageLatencyMs: metrics.averageLatencyMs,
			correct: stats.correct,
			total: stats.total,
		};
	}

	return {
		accuracyPercentage: overallMetrics.accuracyPercentage,
		averageLatencyMs: overallMetrics.averageLatencyMs,
		correctCount: overallCorrect,
		moduleBreakdown,
		totalScenarios,
	};
}
