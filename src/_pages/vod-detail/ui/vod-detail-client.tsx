"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { getVodById, ModuleType } from "@/shared/db";

export interface VodDetailClientProps {
	vod: NonNullable<Awaited<ReturnType<typeof getVodById>>>;
}

interface ModuleDefinition {
	color: string;
	description: string;
	key: ModuleType;
	label: string;
}

const MODULE_DEFINITIONS: ModuleDefinition[] = [
	{
		color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
		description: "Pre-fight positioning & composition win conditions",
		key: "STRATEGY",
		label: "Strategy",
	},
	{
		color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
		description: "Mid-fight execution & 3s rapid target selection",
		key: "TACTICS",
		label: "Tactics",
	},
	{
		color: "bg-amber-500/20 text-amber-300 border-amber-500/30",
		description: "Enemy ultimate charge range estimation",
		key: "ULTIMATE",
		label: "Ultimate Tracking",
	},
	{
		color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
		description: "Ability availability & cooldown window tracking",
		key: "COOLDOWN",
		label: "Cooldown Tracking",
	},
	{
		color: "bg-purple-500/20 text-purple-300 border-purple-500/30",
		description: "Flank recognition & situational location assessment",
		key: "SPATIAL",
		label: "Spatial Awareness",
	},
];

interface ModuleFilterCardProps {
	isActive: boolean;
	module: ModuleDefinition;
	onToggle: (key: ModuleType) => void;
}

function ModuleFilterCard({
	isActive,
	module,
	onToggle,
}: ModuleFilterCardProps) {
	const handleClick = useCallback(() => {
		onToggle(module.key);
	}, [module.key, onToggle]);

	return (
		<button
			className={`flex flex-col justify-between p-5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
				isActive
					? "bg-slate-900 border-indigo-500/60 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/40"
					: "bg-slate-950/40 border-slate-800/60 opacity-60 hover:opacity-100 hover:border-slate-700"
			}`}
			data-testid={`module-filter-${module.key}`}
			onClick={handleClick}
			type="button"
		>
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<span
						className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${module.color}`}
					>
						{module.label}
					</span>
					<span
						className={`text-xs font-semibold px-2 py-0.5 rounded ${
							isActive
								? "bg-emerald-500/20 text-emerald-300"
								: "bg-slate-800 text-slate-400"
						}`}
					>
						{isActive ? "ACTIVE" : "OFF"}
					</span>
				</div>
				<p className="text-xs text-slate-400 leading-relaxed pt-1">
					{module.description}
				</p>
			</div>
		</button>
	);
}

export function VodDetailClient({ vod }: VodDetailClientProps) {
	const [activeModules, setActiveModules] = useState<ModuleType[]>([
		"STRATEGY",
		"TACTICS",
		"ULTIMATE",
		"COOLDOWN",
		"SPATIAL",
	]);

	const toggleModule = useCallback((moduleKey: ModuleType) => {
		setActiveModules((prev) =>
			prev.includes(moduleKey)
				? prev.filter((m) => m !== moduleKey)
				: [...prev, moduleKey],
		);
	}, []);

	const matchingScenarioCount = useMemo(() => {
		const activeSet = new Set(activeModules);
		return vod.scenarios.filter((sc) => activeSet.has(sc.moduleType)).length;
	}, [vod.scenarios, activeModules]);

	const startHref = useMemo(() => {
		if (activeModules.length === 0) return "#";
		const params = new URLSearchParams();
		params.set("modules", activeModules.join(","));
		return `/vods/${vod.id}/session?${params.toString()}`;
	}, [vod.id, activeModules]);

	return (
		<div className="space-y-8">
			<div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-sm shadow-xl space-y-6">
				<div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800/80 pb-6">
					<div>
						<span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">
							Pre-Session Setup
						</span>
						<h2 className="text-2xl font-bold text-white mt-1">
							Configure Scenario Modules
						</h2>
						<p className="text-slate-400 text-sm mt-1">
							Toggle target skills to customize your interactive training
							timeline.
						</p>
					</div>

					<div className="flex items-center gap-3">
						<span className="text-xs font-medium text-slate-400">
							Active Scenarios:
						</span>
						<span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold text-sm rounded-full">
							{matchingScenarioCount} / {vod.scenarios.length}
						</span>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{MODULE_DEFINITIONS.map((module) => (
						<ModuleFilterCard
							isActive={activeModules.includes(module.key)}
							key={module.key}
							module={module}
							onToggle={toggleModule}
						/>
					))}
				</div>

				<div className="pt-4 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-4">
					<div className="text-xs text-slate-400">
						{activeModules.length === 0 ? (
							<span className="text-amber-400 font-medium">
								⚠️ Select at least one module to start training
							</span>
						) : (
							<span>
								{activeModules.length} module
								{activeModules.length > 1 ? "s" : ""} selected
							</span>
						)}
					</div>

					<Link
						className={`inline-flex items-center justify-center px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${
							activeModules.length > 0
								? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-95 cursor-pointer"
								: "bg-slate-800 text-slate-500 cursor-not-allowed pointer-events-none"
						}`}
						href={startHref}
					>
						Start Training Session
					</Link>
				</div>
			</div>
		</div>
	);
}
