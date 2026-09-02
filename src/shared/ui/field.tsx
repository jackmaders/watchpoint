/**
 * Renders accessible form field wrappers, grouped input layouts, labels, descriptions, and validation error messages.
 *
 * Implements `Field`, `FieldGroup`, `FieldLabel`, `FieldDescription`, and `FieldError` composed with Radix UI `Label`
 * and Tailwind CSS utility classes, standardizing form typography and accessible error messaging.
 */

"use client";
import type * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Label } from "@/shared/ui/label";

function Field({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("group/field flex w-full flex-col gap-3", className)}
			data-slot="field"
			{...props}
		/>
	);
}
function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("flex w-full flex-col gap-7", className)}
			data-slot="field-group"
			{...props}
		/>
	);
}
function FieldLabel({
	className,
	...props
}: React.ComponentProps<typeof Label>) {
	return (
		<Label
			className={cn("flex w-fit gap-2 leading-snug", className)}
			data-slot="field-label"
			{...props}
		/>
	);
}
function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			className={cn("text-sm leading-normal text-muted-foreground", className)}
			data-slot="field-description"
			{...props}
		/>
	);
}
function FieldError({
	className,
	children,
	...props
}: React.ComponentProps<"div">) {
	if (!children) return null;
	return (
		<div
			className={cn("text-sm text-destructive", className)}
			data-slot="field-error"
			role="alert"
			{...props}
		>
			{children}
		</div>
	);
}

export { Field, FieldDescription, FieldError, FieldGroup, FieldLabel };
