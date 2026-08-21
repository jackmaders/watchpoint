"use client";

import { MapPin } from "lucide-react";
import { useCallback, useId, useRef } from "react";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";

export interface MapPinEditorProps {
	disabled?: boolean;
	error?: string | null;
	onChange: (config: Record<string, unknown>) => void;
	value?: Record<string, unknown>;
}

interface MapPinCanvasProps {
	disabled: boolean;
	onSurfaceClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
	surfaceRef: React.RefObject<HTMLButtonElement | null>;
	targetX: number;
	targetY: number;
	toleranceRadius: number;
}

function MapPinCanvas({
	disabled,
	onSurfaceClick,
	surfaceRef,
	targetX,
	targetY,
	toleranceRadius,
}: MapPinCanvasProps) {
	return (
		<div className="space-y-2">
			<button
				aria-label="Interactive map pin surface"
				className={`relative w-full aspect-video rounded-md border-2 border-dashed border-border bg-muted/40 overflow-hidden cursor-crosshair select-none text-left p-0 ${
					disabled
						? "pointer-events-none opacity-60"
						: "hover:border-primary/50"
				}`}
				disabled={disabled}
				onClick={onSurfaceClick}
				ref={surfaceRef}
				type="button"
			>
				<div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none opacity-20 divide-x divide-y divide-foreground" />
				<div className="absolute left-1/2 top-0 bottom-0 w-px bg-foreground/15 pointer-events-none" />
				<div className="absolute top-1/2 left-0 right-0 h-px bg-foreground/15 pointer-events-none" />
				<div
					className="absolute rounded-full border border-primary/40 bg-primary/10 pointer-events-none transition-all -translate-x-1/2 -translate-y-1/2"
					style={{
						height: `${toleranceRadius * 2}%`,
						left: `${targetX}%`,
						top: `${targetY}%`,
						width: `${toleranceRadius * 2}%`,
					}}
				/>
				<div
					className="absolute pointer-events-none -translate-x-1/2 -translate-y-full text-primary drop-shadow-md transition-all"
					style={{ left: `${targetX}%`, top: `${targetY}%` }}
				>
					<MapPin className="h-6 w-6 fill-primary text-primary-foreground" />
				</div>
				<div className="absolute bottom-2 left-2 rounded bg-background/80 px-2 py-1 text-[10px] font-mono text-muted-foreground backdrop-blur">
					Click map to reposition pin ({targetX}%, {targetY}%)
				</div>
			</button>
		</div>
	);
}

interface MapPinInputsProps {
	disabled: boolean;
	mapAssetInputId: string;
	mapName: string;
	mapXInputId: string;
	mapYInputId: string;
	onMapNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onXChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onYChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	targetX: number;
	targetY: number;
}

function MapPinInputs({
	disabled,
	mapAssetInputId,
	mapName,
	mapXInputId,
	mapYInputId,
	onMapNameChange,
	onXChange,
	onYChange,
	targetX,
	targetY,
}: MapPinInputsProps) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border">
			<div>
				<FieldLabel className="text-xs" htmlFor={mapAssetInputId}>
					Map Asset Reference
				</FieldLabel>
				<Input
					aria-label="Map Asset Reference"
					className="mt-1 text-sm"
					disabled={disabled}
					id={mapAssetInputId}
					onChange={onMapNameChange}
					placeholder="e.g. King's Row, Circuit Royal"
					value={mapName}
				/>
			</div>

			<div>
				<FieldLabel className="text-xs" htmlFor={mapXInputId}>
					Target X Coordinate (%)
				</FieldLabel>
				<Input
					aria-label="Target X Coordinate (%)"
					className="mt-1 font-mono text-sm"
					disabled={disabled}
					id={mapXInputId}
					max={100}
					min={0}
					onChange={onXChange}
					type="number"
					value={targetX}
				/>
			</div>

			<div>
				<FieldLabel className="text-xs" htmlFor={mapYInputId}>
					Target Y Coordinate (%)
				</FieldLabel>
				<Input
					aria-label="Target Y Coordinate (%)"
					className="mt-1 font-mono text-sm"
					disabled={disabled}
					id={mapYInputId}
					max={100}
					min={0}
					onChange={onYChange}
					type="number"
					value={targetY}
				/>
			</div>
		</div>
	);
}

function useMapPinState(
	value: Record<string, unknown>,
	onChange: (config: Record<string, unknown>) => void,
	_disabled: boolean,
) {
	const surfaceRef = useRef<HTMLButtonElement>(null);
	const targetX = typeof value.targetX === "number" ? value.targetX : 50;
	const targetY = typeof value.targetY === "number" ? value.targetY : 50;
	const toleranceRadius =
		typeof value.toleranceRadius === "number" ? value.toleranceRadius : 10;
	const mapName = typeof value.mapName === "string" ? value.mapName : "";

	const handleFieldChange = useCallback(
		(field: string, val: unknown) => {
			onChange({
				mapName,
				targetX,
				targetY,
				toleranceRadius,
				...value,
				[field]: val,
			});
		},
		[mapName, onChange, targetX, targetY, toleranceRadius, value],
	);

	const handleToleranceChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) =>
			handleFieldChange("toleranceRadius", Number(e.target.value)),
		[handleFieldChange],
	);
	const handleMapNameChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) =>
			handleFieldChange("mapName", e.target.value),
		[handleFieldChange],
	);
	const handleXChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) =>
			handleFieldChange("targetX", Number(e.target.value)),
		[handleFieldChange],
	);
	const handleYChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) =>
			handleFieldChange("targetY", Number(e.target.value)),
		[handleFieldChange],
	);

	const handleSurfaceClick = useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
			const rect = surfaceRef.current?.getBoundingClientRect();
			if (!rect || rect.width <= 0 || rect.height <= 0) return;
			const clickX = e.clientX - rect.left;
			const clickY = e.clientY - rect.top;
			const percentX = Math.round(
				Math.max(0, Math.min(100, (clickX / rect.width) * 100)),
			);
			const percentY = Math.round(
				Math.max(0, Math.min(100, (clickY / rect.height) * 100)),
			);
			onChange({
				mapName,
				toleranceRadius,
				...value,
				targetX: percentX,
				targetY: percentY,
			});
		},
		[mapName, onChange, toleranceRadius, value],
	);

	return {
		handleMapNameChange,
		handleSurfaceClick,
		handleToleranceChange,
		handleXChange,
		handleYChange,
		mapName,
		surfaceRef,
		targetX,
		targetY,
		toleranceRadius,
	};
}

export function MapPinEditor({
	disabled = false,
	error,
	onChange,
	value = {},
}: MapPinEditorProps) {
	const baseId = useId();
	const toleranceInputId = `${baseId}-tolerance-input`;
	const mapAssetInputId = `${baseId}-map-asset-input`;
	const mapXInputId = `${baseId}-map-x-input`;
	const mapYInputId = `${baseId}-map-y-input`;

	const {
		handleMapNameChange,
		handleSurfaceClick,
		handleToleranceChange,
		handleXChange,
		handleYChange,
		mapName,
		surfaceRef,
		targetX,
		targetY,
		toleranceRadius,
	} = useMapPinState(value, onChange, disabled);

	return (
		<div className="space-y-4">
			<div className="rounded-lg border border-border bg-card p-4 space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
					<div>
						<FieldLabel>
							2D Map Pin Target:{" "}
							<span className="font-mono text-primary ml-1">
								({targetX}%, {targetY}%)
							</span>
						</FieldLabel>
						<FieldDescription>
							Click anywhere on the map surface or enter coordinates manually.
						</FieldDescription>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-xs text-muted-foreground">
							± Tolerance Radius:
						</span>
						<Input
							aria-label="Tolerance Radius (%)"
							className="w-20 font-mono text-right"
							disabled={disabled}
							id={toleranceInputId}
							max={50}
							min={1}
							onChange={handleToleranceChange}
							step={1}
							type="number"
							value={toleranceRadius}
						/>
						<span className="text-xs text-muted-foreground">%</span>
					</div>
				</div>

				<MapPinCanvas
					disabled={disabled}
					onSurfaceClick={handleSurfaceClick}
					surfaceRef={surfaceRef}
					targetX={targetX}
					targetY={targetY}
					toleranceRadius={toleranceRadius}
				/>

				<MapPinInputs
					disabled={disabled}
					mapAssetInputId={mapAssetInputId}
					mapName={mapName}
					mapXInputId={mapXInputId}
					mapYInputId={mapYInputId}
					onMapNameChange={handleMapNameChange}
					onXChange={handleXChange}
					onYChange={handleYChange}
					targetX={targetX}
					targetY={targetY}
				/>
			</div>

			{error ? (
				<Field>
					<FieldError>{error}</FieldError>
				</Field>
			) : null}
		</div>
	);
}
