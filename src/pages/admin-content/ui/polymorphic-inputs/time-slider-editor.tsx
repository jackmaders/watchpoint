"use client";

import { useCallback, useId } from "react";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";

export interface TimeSliderEditorProps {
	disabled?: boolean;
	error?: string | null;
	onChange: (config: Record<string, unknown>) => void;
	value?: Record<string, unknown>;
}

interface TimeBoundsInputsProps {
	disabled: boolean;
	max: number;
	maxInputId: string;
	min: number;
	minInputId: string;
	onMaxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onMinChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onTargetChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	target: number;
	targetInputId: string;
}

function TimeBoundsInputs({
	disabled,
	max,
	maxInputId,
	min,
	minInputId,
	onMaxChange,
	onMinChange,
	onTargetChange,
	target,
	targetInputId,
}: TimeBoundsInputsProps) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border">
			<div>
				<FieldLabel className="text-xs" htmlFor={minInputId}>
					Min Seconds
				</FieldLabel>
				<Input
					aria-label="Min Seconds"
					className="mt-1 font-mono text-sm"
					disabled={disabled}
					id={minInputId}
					onChange={onMinChange}
					step={0.1}
					type="number"
					value={min}
				/>
			</div>

			<div>
				<FieldLabel className="text-xs" htmlFor={maxInputId}>
					Max Seconds
				</FieldLabel>
				<Input
					aria-label="Max Seconds"
					className="mt-1 font-mono text-sm"
					disabled={disabled}
					id={maxInputId}
					onChange={onMaxChange}
					step={0.1}
					type="number"
					value={max}
				/>
			</div>

			<div>
				<FieldLabel className="text-xs" htmlFor={targetInputId}>
					Target Seconds Input
				</FieldLabel>
				<Input
					aria-label="Target Seconds Input"
					className="mt-1 font-mono text-sm"
					disabled={disabled}
					id={targetInputId}
					onChange={onTargetChange}
					step={0.1}
					type="number"
					value={target}
				/>
			</div>
		</div>
	);
}

function useTimeSliderState(
	value: Record<string, unknown>,
	onChange: (config: Record<string, unknown>) => void,
) {
	const min = typeof value.min === "number" ? value.min : 0;
	const max = typeof value.max === "number" ? value.max : 10;
	const step = typeof value.step === "number" ? value.step : 0.1;
	const target = typeof value.target === "number" ? value.target : 3;
	const tolerance = typeof value.tolerance === "number" ? value.tolerance : 0.5;

	const handleFieldChange = useCallback(
		(field: string, numVal: number) => {
			onChange({
				max,
				min,
				step,
				target,
				tolerance,
				...value,
				[field]: numVal,
			});
		},
		[max, min, onChange, step, target, tolerance, value],
	);

	const handleToleranceChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) =>
			handleFieldChange("tolerance", Number(e.target.value)),
		[handleFieldChange],
	);

	const handleTargetChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) =>
			handleFieldChange("target", Number(e.target.value)),
		[handleFieldChange],
	);

	const handleMinChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) =>
			handleFieldChange("min", Number(e.target.value)),
		[handleFieldChange],
	);

	const handleMaxChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) =>
			handleFieldChange("max", Number(e.target.value)),
		[handleFieldChange],
	);

	return {
		handleMaxChange,
		handleMinChange,
		handleTargetChange,
		handleToleranceChange,
		max,
		min,
		step,
		target,
		tolerance,
	};
}

export function TimeSliderEditor({
	disabled = false,
	error,
	onChange,
	value = {},
}: TimeSliderEditorProps) {
	const baseId = useId();
	const targetSliderId = `${baseId}-target-slider`;
	const toleranceInputId = `${baseId}-tolerance-input`;
	const minInputId = `${baseId}-min-input`;
	const maxInputId = `${baseId}-max-input`;
	const targetInputId = `${baseId}-target-input`;

	const {
		handleMaxChange,
		handleMinChange,
		handleTargetChange,
		handleToleranceChange,
		max,
		min,
		step,
		target,
		tolerance,
	} = useTimeSliderState(value, onChange);

	return (
		<div className="space-y-4">
			<div className="rounded-lg border border-border bg-card p-4 space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<FieldLabel htmlFor={targetSliderId}>
							Target Time:{" "}
							<span className="font-mono text-primary ml-1">{target}s</span>
						</FieldLabel>
						<FieldDescription>
							The correct timing in seconds expected from the player.
						</FieldDescription>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-xs text-muted-foreground">± Tolerance:</span>
						<Input
							aria-label="Tolerance Seconds"
							className="w-20 font-mono text-right"
							disabled={disabled}
							id={toleranceInputId}
							max={10}
							min={0}
							onChange={handleToleranceChange}
							step={0.1}
							type="number"
							value={tolerance}
						/>
						<span className="text-xs text-muted-foreground">s</span>
					</div>
				</div>

				<div className="space-y-2">
					<input
						aria-label="Target Seconds Slider"
						className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
						disabled={disabled}
						id={targetSliderId}
						max={max}
						min={min}
						onChange={handleTargetChange}
						step={step}
						type="range"
						value={target}
					/>
					<div className="flex justify-between text-xs text-muted-foreground font-mono">
						<span>{min}s</span>
						<span className="text-primary font-semibold">
							Target: {target}s (Accepts:{" "}
							{Math.max(min, Number((target - tolerance).toFixed(2)))}s -{" "}
							{Math.min(max, Number((target + tolerance).toFixed(2)))}s)
						</span>
						<span>{max}s</span>
					</div>
				</div>

				<TimeBoundsInputs
					disabled={disabled}
					max={max}
					maxInputId={maxInputId}
					min={min}
					minInputId={minInputId}
					onMaxChange={handleMaxChange}
					onMinChange={handleMinChange}
					onTargetChange={handleTargetChange}
					target={target}
					targetInputId={targetInputId}
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
