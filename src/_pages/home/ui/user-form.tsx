"use client";

import { useForm } from "@tanstack/react-form";
import type React from "react";
import { useCallback } from "react";
import { z } from "zod";

// 1. Define authoritative Zod schema
export const userSchema = z.object({
	email: z.string().email("Invalid email address"),
	name: z.string().min(2, "Name must be at least 2 characters"),
});

// 2. Infer form data type to prevent type drift
export type UserFormData = z.infer<typeof userSchema>;

// 3. Strongly type initial default values
const initialValues: UserFormData = {
	email: "",
	name: "",
};

export function formatError(err: unknown): string {
	if (typeof err === "string") {
		return err;
	}
	return (err as { message: string }).message;
}

function NameInput({
	name,
	value,
	onChange,
	errors,
}: {
	name: string;
	value: string;
	onChange: (val: string) => void;
	errors: unknown[];
}) {
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			onChange(e.target.value);
		},
		[onChange],
	);

	const errorMessage = errors.map(formatError).join(", ");

	return (
		<div>
			<input
				name={name}
				onChange={handleChange}
				placeholder="Name"
				value={value}
			/>
			{errors.length > 0 && <span>{errorMessage}</span>}
		</div>
	);
}

function EmailInput({
	name,
	value,
	onChange,
	errors,
}: {
	name: string;
	value: string;
	onChange: (val: string) => void;
	errors: unknown[];
}) {
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			onChange(e.target.value);
		},
		[onChange],
	);

	const errorMessage = errors.map(formatError).join(", ");

	return (
		<div>
			<input
				name={name}
				onChange={handleChange}
				placeholder="Email"
				value={value}
			/>
			{errors.length > 0 && <span>{errorMessage}</span>}
		</div>
	);
}

export function UserForm({
	onSubmit,
}: {
	onSubmit: (data: UserFormData) => void;
}) {
	const form = useForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }) => {
			onSubmit(value);
		},
		validators: {
			onChange: userSchema,
		},
	});

	const handleSubmitForm = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			e.stopPropagation();
			form.handleSubmit();
		},
		[form],
	);

	return (
		<form onSubmit={handleSubmitForm}>
			<form.Field name="name">
				{(field) => (
					<NameInput
						errors={field.state.meta.errors}
						name={field.name}
						onChange={field.handleChange}
						value={field.state.value}
					/>
				)}
			</form.Field>
			<form.Field name="email">
				{(field) => (
					<EmailInput
						errors={field.state.meta.errors}
						name={field.name}
						onChange={field.handleChange}
						value={field.state.value}
					/>
				)}
			</form.Field>
			<button type="submit">Submit</button>
		</form>
	);
}
