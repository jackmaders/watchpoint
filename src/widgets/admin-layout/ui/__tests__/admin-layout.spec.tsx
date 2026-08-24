import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("@/shared/ui/auth-modal");

import { AccountControls } from "@/shared/ui/auth-modal";
import { AdminLayout } from "../admin-layout";

describe("AdminLayout", () => {
	it("renders admin navigation and children", () => {
		// Arrange
		vi.mocked(AccountControls).mockReturnValue(
			<div data-testid="mock-account-controls">Controls</div>,
		);

		// Act
		render(
			<AdminLayout
				user={{ email: "admin@example.com", id: "1", role: "ADMIN" }}
			>
				<div data-testid="child-content">Child Content</div>
			</AdminLayout>,
		);

		// Assert
		expect(screen.getByText("Watchpoint Admin")).toBeDefined();
		expect(screen.getByText("Content")).toBeDefined();
		expect(screen.getByText("Users")).toBeDefined();
		expect(screen.getByText("Audit Log")).toBeDefined();
		expect(screen.getByTestId("child-content")).toBeDefined();
		expect(screen.getByTestId("mock-account-controls")).toBeDefined();
	});

	it("renders without user account controls if user is null", () => {
		// Act
		render(
			<AdminLayout user={null}>
				<div data-testid="child-content">Child Content</div>
			</AdminLayout>,
		);

		// Assert
		expect(screen.queryByTestId("mock-account-controls")).toBeNull();
	});
});
