"use client";

import { useId } from "react";
import {
	type InputType,
	inputTypeEnum,
	type ModuleType,
	moduleTypeEnum,
	type scenarios,
	type vods,
} from "@/shared/db";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { FieldDescription, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { MapPinEditor } from "./polymorphic-inputs/map-pin-editor";
import { MultipleChoiceEditor } from "./polymorphic-inputs/multiple-choice-editor";
import { PercentSliderEditor } from "./polymorphic-inputs/percent-slider-editor";
import { TimeSliderEditor } from "./polymorphic-inputs/time-slider-editor";
import { formatTime } from "./scenario-timeline";
import {
	useScenarioFormHandlers,
	useScenarioFormInit,
} from "./use-scenario-form";

export interface ScenarioEditorFormProps {
	disabled?: boolean;
	isSubmitting?: boolean;
	onCancel?: () => void;
	onSave: (payload: {
		explanationText: string;
		id?: string;
		imageUrl?: string | null;
		inputConfig: Record<string, unknown>;
		inputType: InputType;
		moduleType: ModuleType;
		promptText: string;
		timeLimitSeconds?: number | null;
		timestampSeconds: number;
		vodId: string;
	}) => void;
	scenario?: typeof scenarios.$inferSelect | null;
	vod: Pick<typeof vods.$inferSelect, "durationSeconds" | "id">;
}

export function validateScenarioForm(
	promptText: string,
	explanationText: string,
	timestampSeconds: number | string,
	vodDurationSeconds: number,
): string | null {
	if (!promptText.trim()) return "Prompt text is required";
	if (!explanationText.trim()) return "Explanation text is required";
	const ts = Number(timestampSeconds);
	if (Number.isNaN(ts) || ts < 0) {
		return "Timestamp must be a non-negative number of seconds";
	}
	if (vodDurationSeconds && ts > vodDurationSeconds) {
		return `Timestamp (${ts}s) exceeds VOD duration (${vodDurationSeconds}s)`;
	}
	return null;
}

interface ScenarioFormFieldsProps {
	disabled: boolean;
	explanationId: string;
	explanationText: string;
	imageId: string;
	imageUrl: string;
	inputType: InputType;
	inputTypeId: string;
	isSubmitting: boolean;
	moduleType: ModuleType;
	moduleTypeId: string;
	onExplanationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onImageUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onInputTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
	onModuleTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
	onPromptChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onTimeLimitChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onTimestampChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	promptId: string;
	promptText: string;
	timeLimitId: string;
	timeLimitSeconds: number | string;
	timestampId: string;
	timestampSeconds: number | string;
	vodDuration: number;
}

function ScenarioFormFields({
	disabled,
	explanationId,
	explanationText,
	imageId,
	imageUrl,
	inputType,
	inputTypeId,
	isSubmitting,
	moduleType,
	moduleTypeId,
	onExplanationChange,
	onImageUrlChange,
	onInputTypeChange,
	onModuleTypeChange,
	onPromptChange,
	onTimeLimitChange,
	onTimestampChange,
	promptId,
	promptText,
	timeLimitId,
	timeLimitSeconds,
	timestampId,
	timestampSeconds,
	vodDuration,
}: ScenarioFormFieldsProps) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<div className="sm:col-span-2">
				<FieldLabel htmlFor={promptId}>Prompt Text</FieldLabel>
				<Input
					aria-label="Prompt Text"
					className="mt-1"
					disabled={disabled || isSubmitting}
					id={promptId}
					onChange={onPromptChange}
					placeholder="e.g. Which target should you focus first?"
					value={promptText}
				/>
			</div>

			<div className="sm:col-span-2">
				<FieldLabel htmlFor={explanationId}>Explanation Text</FieldLabel>
				<Input
					aria-label="Explanation Text"
					className="mt-1"
					disabled={disabled || isSubmitting}
					id={explanationId}
					onChange={onExplanationChange}
					placeholder="e.g. Ana is isolated and out of cooldowns."
					value={explanationText}
				/>
			</div>

			<div>
				<FieldLabel htmlFor={timestampId}>
					Timestamp (Seconds):{" "}
					<span className="font-mono text-primary font-normal">
						({formatTime(Number(timestampSeconds) || 0)})
					</span>
				</FieldLabel>
				<Input
					aria-label="Timestamp (Seconds)"
					className="mt-1 font-mono"
					disabled={disabled || isSubmitting}
					id={timestampId}
					min={0}
					onChange={onTimestampChange}
					placeholder="0"
					type="number"
					value={timestampSeconds}
				/>
				<FieldDescription className="text-[11px] mt-0.5">
					Point in VOD when this triggers (Max: {vodDuration}s).
				</FieldDescription>
			</div>

			<div>
				<FieldLabel htmlFor={timeLimitId}>
					Time Limit (Seconds, optional)
				</FieldLabel>
				<Input
					aria-label="Time Limit (Seconds, optional)"
					className="mt-1 font-mono"
					disabled={disabled || isSubmitting}
					id={timeLimitId}
					min={1}
					onChange={onTimeLimitChange}
					placeholder="Leave empty for untimed"
					type="number"
					value={timeLimitSeconds}
				/>
			</div>

			<div>
				<FieldLabel htmlFor={moduleTypeId}>Module Type</FieldLabel>
				<select
					aria-label="Module Type"
					className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 text-foreground"
					disabled={disabled || isSubmitting}
					id={moduleTypeId}
					onChange={onModuleTypeChange}
					value={moduleType}
				>
					{moduleTypeEnum.map((m) => (
						<option
							className="bg-popover text-popover-foreground"
							key={m}
							value={m}
						>
							{m}
						</option>
					))}
				</select>
			</div>

			<div>
				<FieldLabel htmlFor={inputTypeId}>Polymorphic Input Type</FieldLabel>
				<select
					aria-label="Polymorphic Input Type"
					className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 text-foreground"
					disabled={disabled || isSubmitting}
					id={inputTypeId}
					onChange={onInputTypeChange}
					value={inputType}
				>
					{inputTypeEnum.map((inp) => (
						<option
							className="bg-popover text-popover-foreground"
							key={inp}
							value={inp}
						>
							{inp}
						</option>
					))}
				</select>
			</div>

			<div className="sm:col-span-2">
				<FieldLabel htmlFor={imageId}>
					Visual Aid Image URL (Optional)
				</FieldLabel>
				<Input
					aria-label="Visual Aid Image URL"
					className="mt-1"
					disabled={disabled || isSubmitting}
					id={imageId}
					onChange={onImageUrlChange}
					placeholder="https://..."
					value={imageUrl}
				/>
			</div>
		</div>
	);
}

interface PolymorphicInputEditorControlProps {
	disabled: boolean;
	inputConfig: Record<string, unknown>;
	inputType: InputType;
	onChange: (config: Record<string, unknown>) => void;
}

function PolymorphicInputEditorControl({
	disabled,
	inputConfig,
	inputType,
	onChange,
}: PolymorphicInputEditorControlProps) {
	if (inputType === "MULTIPLE_CHOICE") {
		return (
			<MultipleChoiceEditor
				disabled={disabled}
				onChange={onChange}
				value={inputConfig}
			/>
		);
	}
	if (inputType === "PERCENT_SLIDER") {
		return (
			<PercentSliderEditor
				disabled={disabled}
				onChange={onChange}
				value={inputConfig}
			/>
		);
	}
	if (inputType === "TIME_SLIDER") {
		return (
			<TimeSliderEditor
				disabled={disabled}
				onChange={onChange}
				value={inputConfig}
			/>
		);
	}
	return (
		<MapPinEditor disabled={disabled} onChange={onChange} value={inputConfig} />
	);
}

export function ScenarioEditorForm({
	disabled = false,
	isSubmitting = false,
	onCancel,
	onSave,
	scenario,
	vod,
}: ScenarioEditorFormProps) {
	const baseId = useId();
	const promptId = `${baseId}-prompt`;
	const explanationId = `${baseId}-explanation`;
	const timestampId = `${baseId}-timestamp`;
	const timeLimitId = `${baseId}-timelimit`;
	const moduleTypeId = `${baseId}-moduletype`;
	const inputTypeId = `${baseId}-inputtype`;
	const imageId = `${baseId}-image`;

	const state = useScenarioFormInit(scenario);
	const {
		error,
		handleExplanationChange,
		handleImageUrlChange,
		handleInputTypeChange,
		handleModuleTypeChange,
		handlePromptChange,
		handleSubmit,
		handleTimeLimitChange,
		handleTimestampChange,
	} = useScenarioFormHandlers(state, vod, scenario, onSave);

	return (
		<form
			className="rounded-lg border border-border bg-card p-5 space-y-5 shadow-sm"
			onSubmit={handleSubmit}
		>
			<div className="flex items-center justify-between border-b border-border pb-3">
				<div>
					<h3 className="text-base font-semibold text-foreground">
						{scenario ? "Edit Scenario" : "New Interactive Scenario"}
					</h3>
					<p className="text-xs text-muted-foreground">
						Configure interactive prompt and polymorphic input control.
					</p>
				</div>
				{Boolean(scenario) && (
					<span className="font-mono text-xs text-muted-foreground">
						ID: {scenario?.id}
					</span>
				)}
			</div>

			{error ? (
				<Alert aria-live="assertive" variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}

			<ScenarioFormFields
				disabled={disabled}
				explanationId={explanationId}
				explanationText={state.explanationText}
				imageId={imageId}
				imageUrl={state.imageUrl}
				inputType={state.inputType}
				inputTypeId={inputTypeId}
				isSubmitting={isSubmitting}
				moduleType={state.moduleType}
				moduleTypeId={moduleTypeId}
				onExplanationChange={handleExplanationChange}
				onImageUrlChange={handleImageUrlChange}
				onInputTypeChange={handleInputTypeChange}
				onModuleTypeChange={handleModuleTypeChange}
				onPromptChange={handlePromptChange}
				onTimeLimitChange={handleTimeLimitChange}
				onTimestampChange={handleTimestampChange}
				promptId={promptId}
				promptText={state.promptText}
				timeLimitId={timeLimitId}
				timeLimitSeconds={state.timeLimitSeconds}
				timestampId={timestampId}
				timestampSeconds={state.timestampSeconds}
				vodDuration={vod.durationSeconds}
			/>

			<div className="border-t border-border pt-4">
				<PolymorphicInputEditorControl
					disabled={disabled || isSubmitting}
					inputConfig={state.inputConfig}
					inputType={state.inputType}
					onChange={state.setInputConfig}
				/>
			</div>

			<div className="flex items-center justify-end gap-3 border-t border-border pt-4">
				{onCancel ? (
					<Button
						disabled={disabled || isSubmitting}
						onClick={onCancel}
						type="button"
						variant="outline"
					>
						Cancel
					</Button>
				) : null}
				<Button
					disabled={disabled || isSubmitting}
					type="submit"
					variant="default"
				>
					{isSubmitting
						? "Saving…"
						: scenario
							? "Save Changes"
							: "Create Scenario"}
				</Button>
			</div>
		</form>
	);
}
