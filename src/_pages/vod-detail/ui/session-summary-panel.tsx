"use client";

import { useEffect, useRef } from "react";
import { MODULE_MAP } from "@/entities/scenario";
import type { ModuleType } from "@/shared/db";
import type { SessionSummaryReport } from "../model/summary";

export interface SessionSummaryPanelProps {
	onExit: () => void;
	onRetry: () => void;
	summary: SessionSummaryReport;
}

interface RankThreshold {
	badgeClass: string;
	label: string;
	minAccuracy: number;
}

const RANK_THRESHOLDS: RankThreshold[] = [
	{
		badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/30",
		label: "Grandmaster",
		minAccuracy: 90,
	},
	{
		badgeClass: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
		label: "Master",
		minAccuracy: 75,
	},
	{
		badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
		label: "Diamond",
		minAccuracy: 60,
	},
	{
		badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
		label: "Platinum",
		minAccuracy: 40,
	},
];

const DEFAULT_RANK: RankThreshold = {
	badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/30",
	label: "Needs Practice",
	minAccuracy: 0,
};

function getRankBadge(accuracyPercentage: number): RankThreshold {
	return (
		RANK_THRESHOLDS.find(
			(threshold) => accuracyPercentage >= threshold.minAccuracy,
		) ?? DEFAULT_RANK
	);
}

export function SessionSummaryPanel({
	onExit,
	onRetry,
	summary,
}: SessionSummaryPanelProps) {
	const containerRef = useRef<HTMLElement | null>(null);
	const rank = getRankBadge(summary.accuracyPercentage);

	useEffect(() => {
		containerRef.current?.focus();
	}, []);

	const attemptedModules = (
		Object.entries(summary.moduleBreakdown) as [
			ModuleType,
			SessionSummaryReport["moduleBreakdown"][ModuleType],
		][]
	).filter(([, stats]) => stats.total > 0);

	return (
		<section
			aria-label="Session Performance Summary"
			aria-live="polite"
			className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 backdrop-blur-md shadow-2xl space-y-8 max-w-3xl mx-auto text-slate-100 outline-none"
			data-testid="session-summary-panel"
			ref={containerRef}
			tabIndex={-1}
		>
			<header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<span className="text-xs font-bold tracking-widest text-indigo-400 uppercase">
							Session Complete
						</span>
						<span
							className={`text-xs font-extrabold px-2.5 py-0.5 rounded-md border ${rank.badgeClass}`}
						>
							{rank.label}
						</span>
					</div>
					<h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
						Performance Summary
					</h2>
				</div>
			</header>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div
					className="p-5 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between space-y-2"
					data-testid="summary-accuracy"
				>
					<span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
						Overall Accuracy
					</span>
					<div className="flex items-baseline gap-2">
						<span className="text-4xl font-extrabold text-white font-mono">
							{summary.accuracyPercentage}%
						</span>
						<span className="text-xs text-slate-400 font-medium">
							{summary.correctCount} / {summary.totalScenarios} Correct
						</span>
					</div>
				</div>

				<div
					className="p-5 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between space-y-2"
					data-testid="summary-latency"
				>
					<span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
						Avg Response Latency
					</span>
					<div className="flex items-baseline gap-2">
						<span className="text-4xl font-extrabold text-white font-mono">
							{summary.averageLatencyMs} ms
						</span>
					</div>
				</div>
			</div>

			<div className="space-y-4">
				<h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
					Module Breakdown
				</h3>

				{attemptedModules.length === 0 ? (
					<div className="p-6 text-center text-sm text-slate-500 rounded-xl border border-slate-800/60 bg-slate-950/30">
						No scenario breakdown available
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{attemptedModules.map(([moduleKey, stats]) => {
							const moduleDef = MODULE_MAP[moduleKey];

							return (
								<div
									className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 flex flex-col justify-between space-y-3"
									data-testid={`module-summary-${moduleKey}`}
									key={moduleKey}
								>
									<div className="flex items-center justify-between">
										<span
											className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${moduleDef.badge}`}
										>
											{moduleDef.label}
										</span>
										<span className="text-xs font-mono font-semibold text-slate-300">
											{`${stats.correct} / ${stats.total} (${stats.accuracyPercentage}%)`}
										</span>
									</div>
									<div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-900">
										<span>Response speed:</span>
										<span className="font-mono text-slate-300">
											{stats.averageLatencyMs} ms avg
										</span>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			<footer className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-end gap-3">
				<button
					className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-colors cursor-pointer"
					data-testid="exit-session-button"
					onClick={onExit}
					type="button"
				>
					Return to VOD
				</button>
				<button
					className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
					data-testid="retry-session-button"
					onClick={onRetry}
					type="button"
				>
					Retry Training Session
				</button>
			</footer>
		</section>
	);
}
