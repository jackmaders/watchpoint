import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("@/shared/lib/auth-client");
vi.mock("@/shared/ui/auth-modal");

import { AppLayout } from "../app-layout";

describe("AppLayout", () => {
	it("renders navbar, persistent sidebar, and child content", () => {
		// Act
		render(
			<AppLayout>
				<div data-testid="test-content">Dashboard Content</div>
			</AppLayout>,
		);

		// Assert
		expect(screen.getByRole("banner")).toBeDefined();
		expect(screen.getByTestId("test-content")).toBeDefined();
		expect(screen.getByText("VOD Catalog")).toBeDefined();
	});

	it("toggles desktop sidebar collapsed state when navbar desktop button is clicked", () => {
		// Arrange
		render(
			<AppLayout>
				<div>Content</div>
			</AppLayout>,
		);

		// Act
		const collapseBtn = screen.getByRole("button", {
			name: "Collapse sidebar",
		});
		fireEvent.click(collapseBtn);

		// Assert
		const expandBtn = screen.getByRole("button", { name: "Expand sidebar" });
		expect(expandBtn).toBeDefined();
	});

	it("opens and closes mobile drawer when mobile hamburger toggle is clicked", () => {
		// Arrange
		render(
			<AppLayout>
				<div>Content</div>
			</AppLayout>,
		);

		// Act - Open
		const openMenuBtn = screen.getByRole("button", {
			name: "Open navigation menu",
		});
		fireEvent.click(openMenuBtn);

		// Assert - Open
		expect(screen.getByRole("dialog")).toBeDefined();

		// Act - Close
		const closeMenuBtn = screen.getByRole("button", {
			name: "Close navigation menu",
		});
		fireEvent.click(closeMenuBtn);

		// Assert - Closed
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("closes mobile drawer when a navigation link inside mobile drawer is clicked", () => {
		// Arrange
		render(
			<AppLayout>
				<div>Content</div>
			</AppLayout>,
		);
		const openMenuBtn = screen.getByRole("button", {
			name: "Open navigation menu",
		});
		fireEvent.click(openMenuBtn);
		const dialog = screen.getByRole("dialog");
		const mobileNavLink = dialog.querySelector(
			'a[href="/vods"]',
		) as HTMLAnchorElement;

		// Act
		fireEvent.click(mobileNavLink);

		// Assert
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("passes registrationEnabled to Navbar", () => {
		// Arrange & Act
		render(
			<AppLayout registrationEnabled={false}>
				<div>Content</div>
			</AppLayout>,
		);

		// Assert
		expect(screen.getByRole("banner")).toBeDefined();
	});
});
