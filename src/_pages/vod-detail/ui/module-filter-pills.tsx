"use client";

import { useCallback } from "react";
import type { ModuleType } from "@/shared/db";
import { MODULE_DEFINITIONS, type ModuleDefinition } from "../model/modules";

export interface ModuleFilterPillsProps {
	availableCounts?: Record<ModuleType, number>;
	onChange: (modules: ModuleType[]) => void;
	selectedModules: ModuleType[];
}

interface ModulePillCardProps {
	count?: number;
	isActive: boolean;
	moduleDef: ModuleDefinition;
	onToggle: (key: ModuleType) => void;
}

function ModulePillCard({
	count,
	isActive,
	moduleDef,
	onToggle,
}: ModulePillCardProps) {
	const handleClick = useCallback(() => {
		onToggle(moduleDef.key);
	}, [moduleDef.key, onToggle]);

	return (
		<button
			aria-pressed={isActive}
			className={`flex flex-col justify-between p-5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
				isActive
					? "bg-slate-900 border-indigo-500/60 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/40"
					: "bg-slate-950/40 border-slate-800/60 opacity-60 hover:opacity-100 hover:border-slate-700"
			}`}
			data-testid={`module-filter-${moduleDef.key}`}
			onClick={handleClick}
			type="button"
		>
			<div className="space-y-2">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<span
						className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${moduleDef.color}`}
					>
						{moduleDef.label}
					</span>
					<div className="flex items-center gap-2">
						{count !== undefined && (
							<span className="text-xs text-slate-400 font-medium">
								{count} scenario{count !== 1 ? "s" : ""}
							</span>
						)}
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
				</div>
				<p className="text-xs text-slate-400 leading-relaxed pt-1">
					{moduleDef.description}
				</p>
			</div>
		</button>
	);
}

export function ModuleFilterPills({
	availableCounts,
	onChange,
	selectedModules,
}: ModuleFilterPillsProps) {
	const handleSelectAll = useCallback(() => {
		onChange(MODULE_DEFINITIONS.map((def) => def.key));
	}, [onChange]);

	const handleDeselectAll = useCallback(() => {
		onChange([]);
	}, [onChange]);

	const handleToggle = useCallback(
		(moduleKey: ModuleType) => {
			if (selectedModules.includes(moduleKey)) {
				onChange(selectedModules.filter((k) => k !== moduleKey));
			} else {
				onChange([...selectedModules, moduleKey]);
			}
		},
		[selectedModules, onChange],
	);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<div className="text-xs text-slate-400 font-medium">
					{selectedModules.length === 0 ? (
						<span className="text-amber-400">
							⚠️ Select at least one module to start training
						</span>
					) : (
						<span>
							{selectedModules.length} of {MODULE_DEFINITIONS.length} modules
							active
						</span>
					)}
				</div>

				<div className="flex items-center gap-2">
					<button
						className="px-3 py-1 text-xs font-semibold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
						onClick={handleSelectAll}
						type="button"
					>
						Select All
					</button>
					<button
						className="px-3 py-1 text-xs font-semibold rounded-md bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-300 transition-colors"
						onClick={handleDeselectAll}
						type="button"
					>
						Deselect All
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{MODULE_DEFINITIONS.map((moduleDef) => (
					<ModulePillCard
						count={availableCounts?.[moduleDef.key]}
						isActive={selectedModules.includes(moduleDef.key)}
						key={moduleDef.key}
						moduleDef={moduleDef}
						onToggle={handleToggle}
					/>
				))}
			</div>
		</div>
	);
}
