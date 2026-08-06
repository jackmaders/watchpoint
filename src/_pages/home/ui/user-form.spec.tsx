import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formatError, UserForm } from "./user-form";

describe("formatError helper", () => {
	it("returns string input directly", () => {
		expect(formatError("Direct error")).toBe("Direct error");
	});

	it("extracts message from error object", () => {
		expect(formatError({ message: "Object error" })).toBe("Object error");
	});
});

describe("UserForm feature component", () => {
	it("renders inputs and submit button", () => {
		render(<UserForm onSubmit={vi.fn()} />);
		expect(screen.getByPlaceholderText("Name")).toBeDefined();
		expect(screen.getByPlaceholderText("Email")).toBeDefined();
		expect(screen.getByRole("button", { name: "Submit" })).toBeDefined();
	});

	it("shows validation error for invalid inputs and submits valid form", async () => {
		const handleSubmit = vi.fn();
		render(<UserForm onSubmit={handleSubmit} />);

		const nameInput = screen.getByPlaceholderText("Name");
		const emailInput = screen.getByPlaceholderText("Email");
		const submitButton = screen.getByRole("button", { name: "Submit" });

		await act(async () => {
			fireEvent.change(nameInput, { target: { value: "a" } });
			fireEvent.change(emailInput, { target: { value: "invalid-email" } });
		});

		expect(
			screen.getByText("Name must be at least 2 characters"),
		).toBeDefined();
		expect(screen.getByText("Invalid email address")).toBeDefined();

		await act(async () => {
			fireEvent.change(nameInput, { target: { value: "John" } });
			fireEvent.change(emailInput, { target: { value: "john@example.com" } });
			fireEvent.click(submitButton);
		});

		expect(handleSubmit).toHaveBeenCalledWith({
			email: "john@example.com",
			name: "John",
		});
	});
});
