import { type ChangeEvent, useCallback } from "react";
import type {
	ModuleType,
	PlaythroughStatus,
	PublishedVodItem,
} from "@/shared/db";

export const MODULE_LABEL_MAP: Record<ModuleType, string> = {
	COOLDOWN: "Cooldown",
	SPATIAL: "Spatial",
	STRATEGY: "Strategy",
	TACTICS: "Tactics",
	ULTIMATE: "Ultimate",
};

export const ALL_MODULES: { key: ModuleType; label: string }[] = [
	{ key: "STRATEGY", label: MODULE_LABEL_MAP.STRATEGY },
	{ key: "TACTICS", label: MODULE_LABEL_MAP.TACTICS },
	{ key: "ULTIMATE", label: MODULE_LABEL_MAP.ULTIMATE },
	{ key: "COOLDOWN", label: MODULE_LABEL_MAP.COOLDOWN },
	{ key: "SPATIAL", label: MODULE_LABEL_MAP.SPATIAL },
];

export interface HistoryFilterBarProps {
	currentStatus: PlaythroughStatus;
	onModuleToggle: (module: ModuleType) => void;
	onStatusChange: (status: PlaythroughStatus) => void;
	onVodChange: (vodId: string) => void;
	selectedModules: readonly ModuleType[];
	selectedVodId: string;
	vods: readonly PublishedVodItem[];
}

export function HistoryFilterBar({
	currentStatus,
	onModuleToggle,
	onStatusChange,
	onVodChange,
	selectedModules,
	selectedVodId,
	vods,
}: HistoryFilterBarProps) {
	const handleCompleted = useCallback(
		() => onStatusChange("COMPLETED"),
		[onStatusChange],
	);
	const handleInProgress = useCallback(
		() => onStatusChange("IN_PROGRESS"),
		[onStatusChange],
	);
	const handleSelectChange = useCallback(
		(e: ChangeEvent<HTMLSelectElement>) => onVodChange(e.target.value),
		[onVodChange],
	);

	return (
		<div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
			<div
				aria-label="Playthrough status"
				className="flex items-center gap-1 rounded-md border border-border bg-muted/50 p-1"
				role="tablist"
			>
				<button
					aria-selected={currentStatus === "COMPLETED"}
					className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
						currentStatus === "COMPLETED"
							? "bg-background text-foreground shadow-sm"
							: "text-muted-foreground hover:text-foreground"
					}`}
					onClick={handleCompleted}
					role="tab"
					type="button"
				>
					Completed
				</button>
				<button
					aria-selected={currentStatus === "IN_PROGRESS"}
					className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
						currentStatus === "IN_PROGRESS"
							? "bg-background text-foreground shadow-sm"
							: "text-muted-foreground hover:text-foreground"
					}`}
					onClick={handleInProgress}
					role="tab"
					type="button"
				>
					In Progress
				</button>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<select
					aria-label="Filter by VOD"
					className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					onChange={handleSelectChange}
					value={selectedVodId}
				>
					<option value="">All VODs</option>
					{vods.map((vod) => (
						<option key={vod.id} value={vod.id}>
							{vod.title} ({vod.mapName})
						</option>
					))}
				</select>

				<div className="flex flex-wrap items-center gap-1.5">
					{ALL_MODULES.map((m) => (
						<ModuleFilterButton
							active={selectedModules.includes(m.key)}
							definition={m}
							key={m.key}
							onToggle={onModuleToggle}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

function ModuleFilterButton({
	active,
	definition,
	onToggle,
}: {
	active: boolean;
	definition: { key: ModuleType; label: string };
	onToggle: (key: ModuleType) => void;
}) {
	const handleClick = useCallback(
		() => onToggle(definition.key),
		[definition.key, onToggle],
	);

	return (
		<button
			aria-label={`Toggle ${definition.label}`}
			className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
				active
					? "border-primary bg-primary text-primary-foreground"
					: "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
			}`}
			onClick={handleClick}
			type="button"
		>
			{definition.label}
		</button>
	);
}
