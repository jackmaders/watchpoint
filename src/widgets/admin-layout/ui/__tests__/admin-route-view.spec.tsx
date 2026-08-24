import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("../access-denied-page");
vi.mock("../admin-layout");

import { AccessDeniedPage } from "../access-denied-page";
import { AdminLayout } from "../admin-layout";
import { AdminRouteView } from "../admin-route-view";

describe("AdminRouteView", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(AccessDeniedPage).mockReturnValue(
			<div data-testid="mock-access-denied">Access Denied</div>,
		);
		vi.mocked(AdminLayout).mockImplementation(({ children }) => (
			<div data-testid="mock-admin-layout">{children}</div>
		));
	});

	it("renders AccessDeniedPage when unauthorized is true", () => {
		// Arrange & Act
		render(<AdminRouteView unauthorized={true} user={null} />);

		// Assert
		expect(screen.getByTestId("mock-access-denied")).toBeDefined();
	});

	it("renders AdminLayout when unauthorized is false", () => {
		// Arrange
		const mockUser = {
			email: "admin@example.com",
			id: "usr_admin",
			name: "Admin User",
			role: "ADMIN" as const,
		};

		// Act
		render(<AdminRouteView unauthorized={false} user={mockUser} />);

		// Assert
		expect(screen.getByTestId("mock-admin-layout")).toBeDefined();
	});
});
