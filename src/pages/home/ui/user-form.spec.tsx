import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authClient } from "@/shared/lib/auth-client";
import { formatError, UserForm } from "./user-form";

vi.mock("@/shared/lib/auth-client");

describe("formatError helper", () => {
	it("formats strings and error-like objects", () => {
		// Arrange
		const error = { message: "Object error" };

		// Act
		const values = [
			formatError("Direct error"),
			formatError(error),
			formatError(null),
		];

		// Assert
		expect(values).toEqual([
			"Direct error",
			"Object error",
			"Unable to complete authentication",
		]);
	});
});

describe("UserForm feature component", () => {
	beforeEach(() => vi.clearAllMocks());

	it("signs in with email and password", async () => {
		// Arrange
		render(<UserForm />);
		fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
			target: { value: "john@example.com" },
		});
		fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), {
			target: { value: "password123" },
		});

		// Act
		await act(async () =>
			fireEvent.click(screen.getByRole("button", { name: "Sign in" })),
		);

		// Assert
		expect(authClient.signIn.email).toHaveBeenCalledWith({
			email: "john@example.com",
			password: "password123",
		});
	});

	it("registers with display name, email, and password", async () => {
		// Arrange
		render(<UserForm />);
		fireEvent.click(screen.getByRole("button", { name: "Create account" }));
		fireEvent.change(screen.getByPlaceholderText("How should we call you?"), {
			target: { value: "John" },
		});
		fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
			target: { value: "john@example.com" },
		});
		fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), {
			target: { value: "password123" },
		});

		// Act
		await act(async () =>
			fireEvent.click(screen.getByRole("button", { name: "Create account" })),
		);
		fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

		// Assert
		expect(authClient.signUp.email).toHaveBeenCalledWith({
			email: "john@example.com",
			name: "John",
			password: "password123",
		});
	});

	it("shows progress while authentication is pending", async () => {
		// Arrange
		let resolve: (value: unknown) => void = () => undefined;
		vi.mocked(authClient.signIn.email).mockReturnValueOnce(
			new Promise((nextResolve) => {
				resolve = nextResolve;
			}) as never,
		);
		render(<UserForm />);
		fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
			target: { value: "john@example.com" },
		});
		fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), {
			target: { value: "password123" },
		});

		// Act
		await act(async () =>
			fireEvent.click(screen.getByRole("button", { name: "Sign in" })),
		);

		// Assert
		expect(screen.getByRole("button", { name: "Working…" })).toBeDefined();
		await act(async () => resolve({ data: {}, error: null }));
	});

	it("shows the current session and signs out the current device", async () => {
		// Arrange
		vi.mocked(authClient.useSession).mockReturnValue({
			data: { user: { name: "John" } },
			isPending: false,
		} as never);
		render(<UserForm />);

		// Act
		await act(async () =>
			fireEvent.click(screen.getByRole("button", { name: "Sign out" })),
		);

		// Assert
		expect(screen.getByText("John")).toBeDefined();
		expect(authClient.signOut).toHaveBeenCalledTimes(1);
	});

	it("handles pending sessions and invalid registration input", async () => {
		// Arrange
		vi.mocked(authClient.useSession).mockReturnValue({
			data: null,
			isPending: true,
		} as never);
		const pending = render(<UserForm />);

		// Act
		expect(screen.getByText("Checking session…")).toBeDefined();
		pending.unmount();
		vi.mocked(authClient.useSession).mockReturnValue({
			data: null,
			isPending: false,
		} as never);
		render(<UserForm />);
		fireEvent.click(screen.getByRole("button", { name: "Create account" }));
		await act(async () =>
			fireEvent.click(screen.getByRole("button", { name: "Create account" })),
		);

		// Assert
		expect(screen.getByRole("alert").textContent).toContain(
			"Name must be at least 2 characters",
		);
	});

	it("shows generic errors for invalid credentials and server failures", async () => {
		// Arrange
		vi.mocked(authClient.signIn.email).mockResolvedValueOnce({
			data: null,
			error: { message: "failed" },
		} as never);
		render(<UserForm />);

		// Act
		fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
			target: { value: "john@example.com" },
		});
		fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), {
			target: { value: "short" },
		});
		await act(async () =>
			fireEvent.click(screen.getByRole("button", { name: "Sign in" })),
		);
		fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
			target: { value: "john@example.com" },
		});
		fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), {
			target: { value: "password123" },
		});
		await act(async () =>
			fireEvent.click(screen.getByRole("button", { name: "Sign in" })),
		);

		// Assert
		expect(screen.getByRole("alert").textContent).toContain(
			"Unable to authenticate with those details",
		);
	});
});
