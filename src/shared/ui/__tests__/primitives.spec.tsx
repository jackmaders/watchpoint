/**
 * Component test suite verifying rendering, accessibility attributes, and variant styling across shared UI primitives.
 *
 * Validates `Alert`, `Dialog`, `Field`, `Input`, `Label`, and `Tabs` using React Testing Library,
 * asserting proper DOM structure, ARIA role bindings, and conditional class applications.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { useId } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Alert, AlertDescription, AlertTitle } from "../alert";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
} from "../dialog";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "../field";
import { Input } from "../input";
import { Label } from "../label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs";

describe("auth shadcn primitives", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders alert variants and descriptions", () => {
		// Arrange & Act
		render(
			<Alert variant="destructive">
				<AlertTitle>Invalid credentials</AlertTitle>
				<AlertDescription>Try again.</AlertDescription>
			</Alert>,
		);

		// Assert
		expect(screen.getByRole("alert").className).toContain("text-destructive");
		expect(screen.getByText("Try again.")).toBeDefined();
	});

	it("renders labelled fields and input states", () => {
		// Arrange & Act
		render(<PrimitiveFieldExample />);

		// Assert
		expect(screen.getByLabelText("Email").getAttribute("aria-invalid")).toBe(
			"true",
		);
		expect(screen.getByText("Required.")).toBeDefined();
		expect(screen.getByRole("alert").textContent).toContain("Invalid email.");
	});

	it("renders the accessible dialog primitive composition", () => {
		// Arrange & Act
		render(
			<Dialog open>
				<DialogTrigger>Open</DialogTrigger>
				<DialogPortal>
					<DialogOverlay />
				</DialogPortal>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Account</DialogTitle>
						<DialogDescription>Manage account.</DialogDescription>
					</DialogHeader>
					<DialogClose>Close</DialogClose>
				</DialogContent>
			</Dialog>,
		);

		// Assert
		expect(screen.getByRole("dialog").textContent).toContain("Account");
		expect(
			screen.getByRole("dialog").querySelector('[data-slot="dialog-close"]'),
		).toBeDefined();
	});

	it("omits an empty field error", () => {
		// Arrange & Act
		render(<FieldError />);

		// Assert
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("renders controlled tabs and their content", () => {
		// Arrange & Act
		render(
			<Tabs defaultValue="one">
				<TabsList>
					<TabsTrigger value="one">One</TabsTrigger>
					<TabsTrigger value="two">Two</TabsTrigger>
				</TabsList>
				<TabsContent value="one">First panel</TabsContent>
				<TabsContent value="two">Second panel</TabsContent>
			</Tabs>,
		);

		// Assert
		expect(
			screen.getByRole("tab", { name: "One" }).getAttribute("data-state"),
		).toBe("active");
		expect(screen.getByText("First panel")).toBeDefined();
	});

	it("renders a standalone label", () => {
		// Arrange & Act
		render(<StandaloneLabelExample />);

		// Assert
		expect(screen.getByText("Standalone").getAttribute("for")).toMatch(/^_r_/);
	});
});

function PrimitiveFieldExample() {
	const id = useId();
	return (
		<Field>
			<FieldGroup>
				<FieldLabel htmlFor={id}>Email</FieldLabel>
				<Input aria-invalid id={id} />
				<FieldDescription>Required.</FieldDescription>
				<FieldError>Invalid email.</FieldError>
			</FieldGroup>
		</Field>
	);
}

function StandaloneLabelExample() {
	const id = useId();
	return <Label htmlFor={id}>Standalone</Label>;
}
