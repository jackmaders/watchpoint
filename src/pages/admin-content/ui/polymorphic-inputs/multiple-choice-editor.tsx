"use client";

import { Plus, Trash2 } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/shared/ui/button";
import { Field, FieldError, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";

export interface MultipleChoiceOption {
	explanation?: string;
	id: string;
	is_correct: boolean;
	text: string;
}

export interface MultipleChoiceEditorProps {
	disabled?: boolean;
	error?: string | null;
	onChange: (config: Record<string, unknown>) => void;
	value?: Record<string, unknown>;
}

function parseOptionItem(opt: unknown, index: number): MultipleChoiceOption {
	if (typeof opt === "object" && opt !== null) {
		const item = opt as Record<string, unknown>;
		const option: MultipleChoiceOption = {
			id: typeof item.id === "string" ? item.id : `opt_${index + 1}`,
			is_correct: item.is_correct === true,
			text: typeof item.text === "string" ? item.text : "",
		};
		if (typeof item.explanation === "string" && item.explanation.length > 0) {
			option.explanation = item.explanation;
		}
		return option;
	}
	return {
		id: `opt_${index + 1}`,
		is_correct: index === 0,
		text: String(opt ?? ""),
	};
}

function parseOptions(value?: Record<string, unknown>): MultipleChoiceOption[] {
	if (value && Array.isArray(value.options) && value.options.length > 0) {
		return value.options.map(parseOptionItem);
	}
	return [
		{ id: "opt_1", is_correct: true, text: "" },
		{ id: "opt_2", is_correct: false, text: "" },
	];
}

interface MultipleChoiceOptionRowProps {
	disabled: boolean;
	index: number;
	isOnlyTwo: boolean;
	onExplanationChange: (id: string, explanation: string) => void;
	onRemove: (id: string) => void;
	onSetCorrect: (id: string) => void;
	onTextChange: (id: string, text: string) => void;
	option: MultipleChoiceOption;
}

function MultipleChoiceOptionRow({
	disabled,
	index,
	isOnlyTwo,
	onExplanationChange,
	onRemove,
	onSetCorrect,
	onTextChange,
	option,
}: MultipleChoiceOptionRowProps) {
	const handleRadioChange = useCallback(() => {
		onSetCorrect(option.id);
	}, [onSetCorrect, option.id]);

	const handleTextChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			onTextChange(option.id, e.target.value);
		},
		[onTextChange, option.id],
	);

	const handleExplanationChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			onExplanationChange(option.id, e.target.value);
		},
		[onExplanationChange, option.id],
	);

	const handleRemoveClick = useCallback(() => {
		onRemove(option.id);
	}, [onRemove, option.id]);

	return (
		<div
			className={`rounded-md border p-3 transition-colors ${
				option.is_correct
					? "border-primary/50 bg-primary/5"
					: "border-border bg-card"
			}`}
		>
			<div className="flex items-center gap-3">
				<label className="flex items-center gap-2 cursor-pointer select-none">
					<input
						aria-label={`Mark Option ${index + 1} as Correct`}
						checked={option.is_correct}
						className="h-4 w-4 text-primary focus:ring-primary"
						disabled={disabled}
						name="correct-option-radio"
						onChange={handleRadioChange}
						type="radio"
					/>
					<span className="text-xs font-semibold text-muted-foreground uppercase">
						Option {index + 1}
					</span>
				</label>

				<div className="flex-1">
					<Input
						aria-label={`Option ${index + 1} Text`}
						disabled={disabled}
						onChange={handleTextChange}
						placeholder={`Enter option ${index + 1} text…`}
						value={option.text}
					/>
				</div>

				<Button
					aria-label={`Remove Option ${index + 1}`}
					disabled={disabled || isOnlyTwo}
					onClick={handleRemoveClick}
					size="icon"
					type="button"
					variant="ghost"
				>
					<Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
				</Button>
			</div>

			<div className="mt-2 pl-6">
				<Input
					aria-label={`Option ${index + 1} Feedback / Explanation (optional)`}
					className="text-xs h-8 text-muted-foreground"
					disabled={disabled}
					onChange={handleExplanationChange}
					placeholder="Optional explanation / feedback for this choice…"
					value={option.explanation ?? ""}
				/>
			</div>
		</div>
	);
}

export function MultipleChoiceEditor({
	disabled = false,
	error,
	onChange,
	value,
}: MultipleChoiceEditorProps) {
	const options = parseOptions(value);

	const handleOptionTextChange = useCallback(
		(id: string, text: string) => {
			const updated = options.map((opt) =>
				opt.id === id ? { ...opt, text } : opt,
			);
			onChange({ ...value, options: updated });
		},
		[onChange, options, value],
	);

	const handleExplanationChange = useCallback(
		(id: string, explanation: string) => {
			const updated = options.map((opt) => {
				if (opt.id !== id) return opt;
				if (!explanation.trim()) {
					const { explanation: _, ...rest } = opt;
					return rest;
				}
				return { ...opt, explanation };
			});
			onChange({ ...value, options: updated });
		},
		[onChange, options, value],
	);

	const handleSetCorrect = useCallback(
		(id: string) => {
			const updated = options.map((opt) => ({
				...opt,
				is_correct: opt.id === id,
			}));
			onChange({ ...value, options: updated });
		},
		[onChange, options, value],
	);

	const handleAddOption = useCallback(() => {
		const newId = crypto.randomUUID();
		const updated = [
			...options,
			{
				id: newId,
				is_correct: false,
				text: "",
			},
		];
		onChange({ ...value, options: updated });
	}, [onChange, options, value]);

	const handleRemoveOption = useCallback(
		(id: string) => {
			const remaining = options.filter((opt) => opt.id !== id);
			const hasCorrect = remaining.some((opt) => opt.is_correct);
			const updated = hasCorrect
				? remaining
				: remaining.map((opt, idx) =>
						idx === 0 ? { ...opt, is_correct: true } : opt,
					);
			onChange({ ...value, options: updated });
		},
		[onChange, options, value],
	);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<FieldLabel>Multiple Choice Options</FieldLabel>
				<Button
					disabled={disabled}
					onClick={handleAddOption}
					size="sm"
					type="button"
					variant="outline"
				>
					<Plus className="mr-1 h-3.5 w-3.5" />
					Add Option
				</Button>
			</div>

			<div className="space-y-3">
				{options.map((option, index) => (
					<MultipleChoiceOptionRow
						disabled={disabled}
						index={index}
						isOnlyTwo={options.length <= 2}
						key={option.id}
						onExplanationChange={handleExplanationChange}
						onRemove={handleRemoveOption}
						onSetCorrect={handleSetCorrect}
						onTextChange={handleOptionTextChange}
						option={option}
					/>
				))}
			</div>

			{error ? (
				<Field>
					<FieldError>{error}</FieldError>
				</Field>
			) : null}
		</div>
	);
}
