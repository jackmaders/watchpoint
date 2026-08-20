import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminLayout } from "../admin-layout";

vi.mock("@tanstack/react-router");
vi.mock("@/shared/lib/auth-client");

describe("AdminLayout", () => {
	it("renders admin shell navigation and children for authorized user", () => {
		// Arrange & Act
		render(
			<AdminLayout
				user={{
					email: "admin@example.com",
					id: "1",
					name: "Admin",
					role: "ADMIN",
				}}
			>
				<div data-testid="admin-child">Admin Content</div>
			</AdminLayout>,
		);

		// Assert
		expect(screen.getByText("Watchpoint Admin")).toBeDefined();
		expect(screen.getByRole("link", { name: /users/i })).toBeDefined();
		expect(screen.getByRole("link", { name: /view site/i })).toBeDefined();
		expect(screen.getByTestId("admin-child")).toBeDefined();
		expect(screen.getByText("ADMIN")).toBeDefined();
	});

	it("renders admin shell without AccountControls when user prop is omitted", () => {
		// Arrange & Act
		render(
			<AdminLayout>
				<div data-testid="admin-child-no-user">No User Content</div>
			</AdminLayout>,
		);

		// Assert
		expect(screen.getByText("Watchpoint Admin")).toBeDefined();
		expect(screen.getByTestId("admin-child-no-user")).toBeDefined();
	});
});
