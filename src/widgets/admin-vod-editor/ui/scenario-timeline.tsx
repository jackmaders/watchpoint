"use client";

import {
	ArrowDown,
	ArrowUp,
	CheckSquare,
	Clock,
	Compass,
	Eye,
	Flame,
	MapPin,
	Percent,
	Plus,
	SlidersHorizontal,
	Sparkles,
	Timer,
	Trash2,
} from "lucide-react";
import { useCallback } from "react";
import type { InputType, ModuleType, scenarios } from "@/shared/db";
import { Button } from "@/shared/ui/button";

export interface ScenarioTimelineProps {
	disabled?: boolean;
	onAddScenario: () => void;
	onDeleteScenario: (scenarioId: string) => void;
	onMoveScenario: (scenarioId: string, direction: "up" | "down") => void;
	onSelectScenario: (scenario: typeof scenarios.$inferSelect) => void;
	scenarios: Array<typeof scenarios.$inferSelect>;
	selectedScenarioId: string | null;
}

export function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function getModuleTypeBadge(moduleType: ModuleType) {
	switch (moduleType) {
		case "STRATEGY":
			return {
				className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
				icon: Compass,
				label: "STRATEGY",
			};
		case "TACTICS":
			return {
				className: "bg-red-500/10 text-red-400 border-red-500/20",
				icon: Flame,
				label: "TACTICS",
			};
		case "ULTIMATE":
			return {
				className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
				icon: Sparkles,
				label: "ULTIMATE",
			};
		case "COOLDOWN":
			return {
				className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
				icon: Clock,
				label: "COOLDOWN",
			};
		case "SPATIAL":
			return {
				className: "bg-purple-500/10 text-purple-400 border-purple-500/20",
				icon: Eye,
				label: "SPATIAL",
			};
	}
}

export function getInputTypeBadge(inputType: InputType) {
	switch (inputType) {
		case "MULTIPLE_CHOICE":
			return {
				className: "bg-slate-500/10 text-slate-300 border-slate-500/20",
				icon: CheckSquare,
				label: "Multiple Choice",
			};
		case "PERCENT_SLIDER":
			return {
				className: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
				icon: Percent,
				label: "Percent Slider",
			};
		case "TIME_SLIDER":
			return {
				className: "bg-amber-500/10 text-amber-300 border-amber-500/20",
				icon: SlidersHorizontal,
				label: "Time Slider",
			};
		case "MAP_PIN_2D":
			return {
				className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
				icon: MapPin,
				label: "2D Map Pin",
			};
	}
}

interface ScenarioTimelineItemProps {
	disabled: boolean;
	isFirst: boolean;
	isLast: boolean;
	isSelected: boolean;
	onDelete: (id: string) => void;
	onMove: (id: string, direction: "up" | "down") => void;
	onSelect: (scenario: typeof scenarios.$inferSelect) => void;
	scenario: typeof scenarios.$inferSelect;
}

function ScenarioTimelineItem({
	disabled,
	isFirst,
	isLast,
	isSelected,
	onDelete,
	onMove,
	onSelect,
	scenario,
}: ScenarioTimelineItemProps) {
	const moduleBadge = getModuleTypeBadge(scenario.moduleType);
	const inputBadge = getInputTypeBadge(scenario.inputType);
	const ModuleIcon = moduleBadge.icon;
	const InputIcon = inputBadge.icon;

	const handleRowClick = useCallback(() => {
		onSelect(scenario);
	}, [onSelect, scenario]);

	const handleMoveUp = useCallback(() => {
		onMove(scenario.id, "up");
	}, [onMove, scenario.id]);

	const handleMoveDown = useCallback(() => {
		onMove(scenario.id, "down");
	}, [onMove, scenario.id]);

	const handleDelete = useCallback(() => {
		onDelete(scenario.id);
	}, [onDelete, scenario.id]);

	return (
		<div
			className={`flex items-center justify-between p-3.5 transition-colors ${
				isSelected
					? "bg-primary/10 border-l-4 border-l-primary"
					: "hover:bg-muted/30"
			}`}
		>
			<div className="flex items-center gap-3 min-w-0 flex-1">
				{/* Reorder Buttons (separate from selection button) */}
				<div className="flex flex-col gap-0.5">
					<Button
						aria-label={`Move ${scenario.promptText} up`}
						className="h-5 w-5 p-0"
						disabled={disabled || isFirst}
						onClick={handleMoveUp}
						size="sm"
						type="button"
						variant="ghost"
					>
						<ArrowUp className="h-3 w-3" />
					</Button>
					<Button
						aria-label={`Move ${scenario.promptText} down`}
						className="h-5 w-5 p-0"
						disabled={disabled || isLast}
						onClick={handleMoveDown}
						size="sm"
						type="button"
						variant="ghost"
					>
						<ArrowDown className="h-3 w-3" />
					</Button>
				</div>

				{/* Selection Click Area */}
				<button
					className="flex items-center gap-3 min-w-0 flex-1 text-left bg-transparent border-0 p-0 cursor-pointer"
					onClick={handleRowClick}
					type="button"
				>
					{/* Timestamp Badge */}
					<div className="flex items-center gap-1 font-mono text-xs font-bold text-foreground bg-muted px-2 py-1 rounded border border-border">
						<Timer className="h-3.5 w-3.5 text-muted-foreground" />
						{formatTime(scenario.timestampSeconds)}
					</div>

					{/* Visual Badges for Module and Input Type */}
					<div className="flex flex-wrap items-center gap-1.5">
						<span
							className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${moduleBadge.className}`}
						>
							<ModuleIcon className="h-3 w-3" />
							{moduleBadge.label}
						</span>
						<span
							className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${inputBadge.className}`}
						>
							<InputIcon className="h-3 w-3" />
							{inputBadge.label}
						</span>
					</div>

					{/* Prompt Snippet */}
					<span className="truncate text-sm font-medium text-foreground ml-1">
						{scenario.promptText}
					</span>
				</button>
			</div>

			{/* Actions */}
			<div className="flex items-center gap-2 ml-3">
				<Button
					aria-label={`Delete scenario ${scenario.promptText}`}
					disabled={disabled}
					onClick={handleDelete}
					size="icon"
					type="button"
					variant="ghost"
				>
					<Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
				</Button>
			</div>
		</div>
	);
}

export function ScenarioTimeline({
	disabled = false,
	onAddScenario,
	onDeleteScenario,
	onMoveScenario,
	onSelectScenario,
	scenarios: scenarioList,
	selectedScenarioId,
}: ScenarioTimelineProps) {
	const sortedScenarios = [...scenarioList].sort(
		(a, b) => a.timestampSeconds - b.timestampSeconds,
	);

	return (
		<div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
			<div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
				<div>
					<h2 className="text-base font-semibold text-foreground">
						Scenario Timeline
					</h2>
					<p className="text-xs text-muted-foreground">
						{sortedScenarios.length}{" "}
						{sortedScenarios.length === 1 ? "scenario" : "scenarios"} ordered
						chronologically
					</p>
				</div>
				<Button
					disabled={disabled}
					onClick={onAddScenario}
					size="sm"
					variant="default"
				>
					<Plus className="mr-1 h-4 w-4" />
					Add Scenario
				</Button>
			</div>

			{sortedScenarios.length === 0 ? (
				<div className="p-8 text-center">
					<p className="text-sm text-muted-foreground">
						No scenarios created yet.
					</p>
					<Button
						className="mt-3"
						disabled={disabled}
						onClick={onAddScenario}
						size="sm"
						variant="outline"
					>
						<Plus className="mr-1 h-3.5 w-3.5" />
						Add First Scenario
					</Button>
				</div>
			) : (
				<div className="divide-y divide-border">
					{sortedScenarios.map((scenario, index) => (
						<ScenarioTimelineItem
							disabled={disabled}
							isFirst={index === 0}
							isLast={index === sortedScenarios.length - 1}
							isSelected={scenario.id === selectedScenarioId}
							key={scenario.id}
							onDelete={onDeleteScenario}
							onMove={onMoveScenario}
							onSelect={onSelectScenario}
							scenario={scenario}
						/>
					))}
				</div>
			)}
		</div>
	);
}
