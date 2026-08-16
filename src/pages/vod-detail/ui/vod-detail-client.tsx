"use client";

import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { getSessionManifest, ModuleType } from "@/shared/db";
import { buildSessionUrl } from "../model/module-filter";
import {
	calculateModuleCounts,
	filterScenariosByModules,
} from "../model/module-helpers";
import { MODULE_DEFINITIONS } from "../model/modules";
import { ModuleFilterPills } from "./module-filter-pills";

export interface VodDetailClientProps {
	vod: NonNullable<Awaited<ReturnType<typeof getSessionManifest>>>;
}

export function VodDetailClient({ vod }: VodDetailClientProps) {
	const [activeModules, setActiveModules] = useState<ModuleType[]>(() =>
		MODULE_DEFINITIONS.map((def) => def.key),
	);

	const availableCounts = useMemo(
		() => calculateModuleCounts(vod.scenarios),
		[vod.scenarios],
	);

	const matchingScenarioCount = useMemo(
		() => filterScenariosByModules(vod.scenarios, activeModules).length,
		[vod.scenarios, activeModules],
	);

	const startHref = useMemo(
		() => buildSessionUrl(vod.id, activeModules),
		[vod.id, activeModules],
	);

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

				<ModuleFilterPills
					availableCounts={availableCounts}
					onChange={setActiveModules}
					selectedModules={activeModules}
				/>

				<div className="pt-4 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-4">
					<div className="text-xs text-slate-400">
						<span>
							{activeModules.length} module
							{activeModules.length !== 1 ? "s" : ""} selected
						</span>
					</div>

					<Link
						className={`inline-flex items-center justify-center px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${
							activeModules.length > 0
								? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-95 cursor-pointer"
								: "bg-slate-800 text-slate-500 cursor-not-allowed pointer-events-none"
						}`}
						href={startHref}
						to={startHref}
					>
						Start Training Session
					</Link>
				</div>
			</div>
		</div>
	);
}
