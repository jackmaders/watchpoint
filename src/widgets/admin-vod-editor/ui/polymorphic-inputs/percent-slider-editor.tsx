"use client";

import { useCallback, useId } from "react";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";

export interface PercentSliderEditorProps {
	disabled?: boolean;
	error?: string | null;
	onChange: (config: Record<string, unknown>) => void;
	value?: Record<string, unknown>;
}

interface PercentBoundsInputsProps {
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

function PercentBoundsInputs({
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
}: PercentBoundsInputsProps) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border">
			<div>
				<FieldLabel className="text-xs" htmlFor={minInputId}>
					Min Percentage
				</FieldLabel>
				<Input
					aria-label="Min Percentage"
					className="mt-1 font-mono text-sm"
					disabled={disabled}
					id={minInputId}
					onChange={onMinChange}
					type="number"
					value={min}
				/>
			</div>

			<div>
				<FieldLabel className="text-xs" htmlFor={maxInputId}>
					Max Percentage
				</FieldLabel>
				<Input
					aria-label="Max Percentage"
					className="mt-1 font-mono text-sm"
					disabled={disabled}
					id={maxInputId}
					onChange={onMaxChange}
					type="number"
					value={max}
				/>
			</div>

			<div>
				<FieldLabel className="text-xs" htmlFor={targetInputId}>
					Target Percentage Input
				</FieldLabel>
				<Input
					aria-label="Target Percentage Input"
					className="mt-1 font-mono text-sm"
					disabled={disabled}
					id={targetInputId}
					onChange={onTargetChange}
					type="number"
					value={target}
				/>
			</div>
		</div>
	);
}

function usePercentSliderState(
	value: Record<string, unknown>,
	onChange: (config: Record<string, unknown>) => void,
) {
	const min = typeof value.min === "number" ? value.min : 0;
	const max = typeof value.max === "number" ? value.max : 100;
	const step = typeof value.step === "number" ? value.step : 1;
	const target = typeof value.target === "number" ? value.target : 50;
	const tolerance = typeof value.tolerance === "number" ? value.tolerance : 5;

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

export function PercentSliderEditor({
	disabled = false,
	error,
	onChange,
	value = {},
}: PercentSliderEditorProps) {
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
	} = usePercentSliderState(value, onChange);

	return (
		<div className="space-y-4">
			<div className="rounded-lg border border-border bg-card p-4 space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<FieldLabel htmlFor={targetSliderId}>
							Target Percentage:{" "}
							<span className="font-mono text-primary ml-1">{target}%</span>
						</FieldLabel>
						<FieldDescription>
							The correct percentage expected from the player.
						</FieldDescription>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-xs text-muted-foreground">± Tolerance:</span>
						<Input
							aria-label="Tolerance Percentage"
							className="w-20 font-mono text-right"
							disabled={disabled}
							id={toleranceInputId}
							max={50}
							min={0}
							onChange={handleToleranceChange}
							step={1}
							type="number"
							value={tolerance}
						/>
						<span className="text-xs text-muted-foreground">%</span>
					</div>
				</div>

				<div className="space-y-2">
					<input
						aria-label="Target Percentage Slider"
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
						<span>{min}%</span>
						<span className="text-primary font-semibold">
							Target: {target}% (Accepts: {Math.max(min, target - tolerance)}% -{" "}
							{Math.min(max, target + tolerance)}%)
						</span>
						<span>{max}%</span>
					</div>
				</div>

				<PercentBoundsInputs
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
