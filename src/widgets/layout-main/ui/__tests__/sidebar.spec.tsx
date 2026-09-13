import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("@/shared/lib/auth-client");

import { authClient } from "@/shared/lib/auth-client";
import { Sidebar } from "../sidebar";

describe("Sidebar", () => {
	it("renders public navigation links with accessible labels", () => {
		// Arrange
		vi.mocked(authClient.useSession).mockReturnValue({
			data: null,
			isPending: false,
		} as never);

		// Act
		render(<Sidebar />);

		// Assert
		expect(screen.getByRole("navigation")).toBeDefined();
		expect(screen.getByText("VOD Catalog")).toBeDefined();
		expect(screen.getByText("Training History")).toBeDefined();
		expect(screen.queryByText("Admin Panel")).toBeNull();
	});

	it("renders admin link when authenticated user has ADMIN role", () => {
		// Arrange
		vi.mocked(authClient.useSession).mockReturnValue({
			data: {
				session: { id: "s1" },
				user: { email: "admin@example.com", id: "u1", role: "ADMIN" },
			},
			isPending: false,
		} as never);

		// Act
		render(<Sidebar />);

		// Assert
		expect(screen.getByText("Admin Panel")).toBeDefined();
	});

	it("renders in collapsed mode without text labels on desktop", () => {
		// Arrange
		vi.mocked(authClient.useSession).mockReturnValue({
			data: null,
			isPending: false,
		} as never);

		// Act
		render(<Sidebar isCollapsed={true} />);

		// Assert
		const catalogLink = screen.getByRole("link", { name: "VOD Catalog" });
		expect(catalogLink).toBeDefined();
		expect(catalogLink.getAttribute("title")).toBe("VOD Catalog");
	});

	it("calls onNavClick callback when link is clicked", () => {
		// Arrange
		vi.mocked(authClient.useSession).mockReturnValue({
			data: null,
			isPending: false,
		} as never);
		const onNavClick = vi.fn();
		render(<Sidebar onNavClick={onNavClick} />);

		// Act
		const link = screen.getByText("VOD Catalog");
		fireEvent.click(link);

		// Assert
		expect(onNavClick).toHaveBeenCalledTimes(1);
	});
});
