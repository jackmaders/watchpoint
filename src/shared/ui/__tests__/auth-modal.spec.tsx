import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/auth-client");

import { authClient } from "@/shared/lib/auth-client";
import { AccountControls, AuthModal, resolveAuthResult } from "../auth-modal";

const onOpenChange = vi.fn();
const signInEmail = authClient.signIn.email;
const signUpEmail = authClient.signUp.email;
const signOut = authClient.signOut;
const useSession = authClient.useSession;

describe("AuthModal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useSession).mockReturnValue({ data: null } as never);
		vi.mocked(signInEmail).mockResolvedValue({
			data: { user: { id: "user-1" } },
			error: null,
		});
		vi.mocked(signUpEmail).mockResolvedValue({
			data: { user: { id: "user-1" } },
			error: null,
		});
	});

	it("renders the sign-in form and session-expiry message", () => {
		// Arrange & Act
		render(<AuthModal expired onOpenChange={onOpenChange} open />);

		// Assert
		expect(screen.getByRole("dialog")).toBeDefined();
		expect(screen.getByLabelText("Email").getAttribute("type")).toBe("email");
		expect(
			screen.getByText("Your session expired. Sign in again to continue."),
		).toBeDefined();
	});

	it("switches to registration and shows its password guidance", () => {
		// Arrange
		render(<AuthModal onOpenChange={onOpenChange} open />);

		// Act
		fireEvent.mouseDown(screen.getByRole("tab", { name: "Register" }));

		// Assert
		expect(
			screen.getByRole("heading", { name: "Create your player identity" }),
		).toBeDefined();
		expect(screen.getByLabelText("Display name")).toBeDefined();
		expect(screen.getByText("Use at least 8 characters.")).toBeDefined();
	});

	it("explains why registration is unavailable", () => {
		// Arrange & Act
		render(
			<AuthModal
				onOpenChange={onOpenChange}
				open
				registrationEnabled={false}
			/>,
		);

		// Assert
		expect(
			(screen.getByRole("tab", { name: "Register" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
		expect(screen.getByRole("status").textContent).toContain(
			"Registration is currently unavailable",
		);
	});

	it("reports a generic failure for invalid credentials", async () => {
		// Arrange
		vi.mocked(signInEmail).mockResolvedValueOnce({
			data: null,
			error: { message: "bad credentials" },
		});
		vi.mocked(authClient.signIn.email).mockResolvedValueOnce({
			data: null,
			error: { message: "bad credentials" },
		});
		render(<AuthModal onOpenChange={onOpenChange} open />);

		// Act
		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "player@example.com" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "wrong-password" },
		});
		fireEvent.submit(
			screen
				.getByRole("button", { name: "Sign in" })
				.closest("form") as HTMLFormElement,
		);

		// Assert
		await waitFor(() => expect(signInEmail).toHaveBeenCalledTimes(1));
		expect(screen.getByRole("alert").textContent).toContain(
			"Invalid email or password",
		);
	});

	it("submits registration and closes after success", async () => {
		// Arrange
		render(<AuthModal onOpenChange={onOpenChange} open />);
		fireEvent.mouseDown(screen.getByRole("tab", { name: "Register" }));

		// Act
		fireEvent.change(screen.getByLabelText("Display name"), {
			target: { value: "Player One" },
		});
		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "player@example.com" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "correct-password" },
		});
		fireEvent.submit(
			screen
				.getByRole("button", { name: "Create account" })
				.closest("form") as HTMLFormElement,
		);

		// Assert
		await waitFor(() =>
			expect(signUpEmail).toHaveBeenCalledWith({
				email: "player@example.com",
				name: "Player One",
				password: "correct-password",
			}),
		);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("shows a busy state while authentication is pending", async () => {
		// Arrange
		let finish: ((value: unknown) => void) | undefined;
		const pending = new Promise((resolve) => {
			finish = resolve;
		});
		vi.mocked(signInEmail).mockReturnValueOnce(pending as never);
		vi.mocked(authClient.signIn.email).mockReturnValueOnce(pending as never);
		render(<AuthModal onOpenChange={onOpenChange} open />);

		// Act
		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "player@example.com" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "correct-password" },
		});
		fireEvent.submit(
			screen
				.getByRole("button", { name: "Sign in" })
				.closest("form") as HTMLFormElement,
		);

		// Assert
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "Working…" })).toBeDefined(),
		);
		const resolvePending = finish as (value: unknown) => void;
		resolvePending({ data: { user: { id: "user-1" } }, error: null });
	});

	it("renders signed-in account controls and signs out", () => {
		// Arrange
		vi.mocked(useSession).mockReturnValue({
			data: { user: { name: "Player One" } },
		} as never);

		// Act
		render(<AccountControls />);
		fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

		// Assert
		expect(screen.getByText("Player One")).toBeDefined();
		expect(signOut).toHaveBeenCalledTimes(1);
	});

	it("resolves successful and failed auth results", () => {
		// Arrange
		const onError = vi.fn();
		const onSuccess = vi.fn();

		// Act
		resolveAuthResult(new Error("invalid"), onError, onSuccess);
		resolveAuthResult(null, onError, onSuccess);

		// Assert
		expect(onError).toHaveBeenCalledTimes(1);
		expect(onSuccess).toHaveBeenCalledTimes(1);
	});

	it("exposes the public auth client shape used by the controls", () => {
		// Arrange & Act
		const client = authClient;

		// Assert
		expect(client.signIn.email).toBe(signInEmail);
		expect(client.signUp.email).toBe(signUpEmail);
	});
});
