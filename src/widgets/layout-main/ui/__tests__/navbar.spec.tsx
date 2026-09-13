import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("@/shared/ui/auth-modal");

import { useLocation } from "@tanstack/react-router";
import { AccountControls } from "@/shared/ui/auth-modal";
import { Navbar } from "../navbar";

describe("Navbar", () => {
	it("renders brand logo, home link, and section indicator", () => {
		// Arrange
		vi.mocked(useLocation).mockReturnValue({ pathname: "/vods" } as never);
		vi.mocked(AccountControls).mockReturnValue(
			<div data-testid="mock-account-controls">Account Controls</div>,
		);

		// Act
		render(<Navbar />);

		// Assert
		expect(screen.getByRole("banner")).toBeDefined();
		expect(screen.getByText("Watchpoint")).toBeDefined();
		expect(screen.getByText("VOD Catalog")).toBeDefined();
		expect(screen.getByTestId("mock-account-controls")).toBeDefined();
	});

	it("renders breadcrumbs accurately for nested vod details route", () => {
		// Arrange
		vi.mocked(useLocation).mockReturnValue({
			pathname: "/vods/vod-123",
		} as never);

		// Act
		render(<Navbar />);

		// Assert
		expect(screen.getByText("VOD Details")).toBeDefined();
		expect(screen.getByText("VOD Catalog")).toBeDefined();
	});

	it("renders breadcrumbs accurately for history list route", () => {
		// Arrange
		vi.mocked(useLocation).mockReturnValue({
			pathname: "/history",
		} as never);

		// Act
		render(<Navbar />);

		// Assert
		expect(screen.getByText("Training History")).toBeDefined();
	});

	it("renders breadcrumbs accurately for nested history route", () => {
		// Arrange
		vi.mocked(useLocation).mockReturnValue({
			pathname: "/history/playthrough-123",
		} as never);

		// Act
		render(<Navbar />);

		// Assert
		expect(screen.getByText("Session Breakdown")).toBeDefined();
		expect(screen.getByText("Training History")).toBeDefined();
	});

	it("renders section for root admin route", () => {
		// Arrange
		vi.mocked(useLocation).mockReturnValue({
			pathname: "/admin",
		} as never);

		// Act
		render(<Navbar />);

		// Assert
		expect(screen.getByText("Admin Panel")).toBeDefined();
	});

	it("renders breadcrumbs for admin content route", () => {
		// Arrange
		vi.mocked(useLocation).mockReturnValue({
			pathname: "/admin/content",
		} as never);

		// Act
		render(<Navbar />);

		// Assert
		expect(screen.getByText("Admin")).toBeDefined();
		expect(screen.getByText("Content Management")).toBeDefined();
	});

	it("renders breadcrumbs for admin users route", () => {
		// Arrange
		vi.mocked(useLocation).mockReturnValue({
			pathname: "/admin/users",
		} as never);

		// Act
		render(<Navbar />);

		// Assert
		expect(screen.getByText("Admin")).toBeDefined();
		expect(screen.getByText("User Roles")).toBeDefined();
	});

	it("renders breadcrumbs for admin audit route", () => {
		// Arrange
		vi.mocked(useLocation).mockReturnValue({
			pathname: "/admin/audit",
		} as never);

		// Act
		render(<Navbar />);

		// Assert
		expect(screen.getByText("Admin")).toBeDefined();
		expect(screen.getByText("Audit Logs")).toBeDefined();
	});

	it("renders breadcrumbs for other admin subroutes", () => {
		// Arrange
		vi.mocked(useLocation).mockReturnValue({
			pathname: "/admin/settings",
		} as never);

		// Act
		render(<Navbar />);

		// Assert
		expect(screen.getByText("Admin")).toBeDefined();
		expect(screen.getByText("Admin Dashboard")).toBeDefined();
	});

	it("renders default overview title on root path", () => {
		// Arrange
		vi.mocked(useLocation).mockReturnValue({ pathname: "/" } as never);

		// Act
		render(<Navbar />);

		// Assert
		expect(screen.getByText("Overview")).toBeDefined();
	});

	it("renders fallback title on unknown path", () => {
		// Arrange
		vi.mocked(useLocation).mockReturnValue({
			pathname: "/custom-page",
		} as never);

		// Act
		render(<Navbar />);

		// Assert
		expect(screen.getByText("Dashboard")).toBeDefined();
	});

	it("triggers mobile sidebar toggle when mobile menu button is clicked", () => {
		// Arrange
		const onToggleMobileSidebar = vi.fn();
		render(
			<Navbar
				isMobileSidebarOpen={false}
				onToggleMobileSidebar={onToggleMobileSidebar}
			/>,
		);

		// Act
		const toggleButton = screen.getByRole("button", {
			name: "Open navigation menu",
		});
		fireEvent.click(toggleButton);

		// Assert
		expect(onToggleMobileSidebar).toHaveBeenCalledTimes(1);
	});

	it("renders close label when mobile sidebar is open", () => {
		// Arrange
		render(<Navbar isMobileSidebarOpen={true} />);

		// Act
		const toggleButton = screen.getByRole("button", {
			name: "Close navigation menu",
		});

		// Assert
		expect(toggleButton).toBeDefined();
		expect(toggleButton.getAttribute("aria-expanded")).toBe("true");
	});

	it("triggers desktop sidebar collapse toggle when desktop toggle button is clicked", () => {
		// Arrange
		const onToggleDesktopSidebar = vi.fn();
		render(
			<Navbar
				isDesktopSidebarCollapsed={false}
				onToggleDesktopSidebar={onToggleDesktopSidebar}
			/>,
		);

		// Act
		const desktopToggle = screen.getByRole("button", {
			name: "Collapse sidebar",
		});
		fireEvent.click(desktopToggle);

		// Assert
		expect(onToggleDesktopSidebar).toHaveBeenCalledTimes(1);
	});

	it("renders expand label when desktop sidebar is collapsed", () => {
		// Arrange
		render(<Navbar isDesktopSidebarCollapsed={true} />);

		// Act
		const desktopToggle = screen.getByRole("button", {
			name: "Expand sidebar",
		});

		// Assert
		expect(desktopToggle).toBeDefined();
	});
});
