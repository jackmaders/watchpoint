import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminContentFilters } from "../admin-content-filters";

describe("AdminContentFilters", () => {
	it("renders search input and filter buttons with current values", () => {
		// Arrange
		const onRoleChange = vi.fn();
		const onSearchChange = vi.fn();
		const onStatusChange = vi.fn();

		// Act
		render(
			<AdminContentFilters
				onRoleChange={onRoleChange}
				onSearchChange={onSearchChange}
				onStatusChange={onStatusChange}
				roleFilter="ALL"
				searchQuery=""
				statusFilter="ALL"
			/>,
		);

		// Assert
		expect(
			screen.getByPlaceholderText(/search title, hero, or map…/i),
		).toBeDefined();
		expect(screen.getByRole("button", { name: /^all status$/i })).toBeDefined();
		expect(screen.getByRole("button", { name: /^published$/i })).toBeDefined();
		expect(screen.getByRole("button", { name: /^draft$/i })).toBeDefined();
		expect(screen.getByRole("button", { name: /^all roles$/i })).toBeDefined();
		expect(screen.getByRole("button", { name: /^tank$/i })).toBeDefined();
		expect(screen.getByRole("button", { name: /^damage$/i })).toBeDefined();
		expect(screen.getByRole("button", { name: /^support$/i })).toBeDefined();
	});

	it("triggers onSearchChange when user types in search input", () => {
		// Arrange
		const onRoleChange = vi.fn();
		const onSearchChange = vi.fn();
		const onStatusChange = vi.fn();
		render(
			<AdminContentFilters
				onRoleChange={onRoleChange}
				onSearchChange={onSearchChange}
				onStatusChange={onStatusChange}
				roleFilter="ALL"
				searchQuery=""
				statusFilter="ALL"
			/>,
		);

		// Act
		const input = screen.getByPlaceholderText(/search title, hero, or map…/i);
		fireEvent.change(input, { target: { value: "King's Row" } });

		// Assert
		expect(onSearchChange).toHaveBeenCalledWith("King's Row");
	});

	it("triggers onStatusChange when status buttons are clicked", () => {
		// Arrange
		const onRoleChange = vi.fn();
		const onSearchChange = vi.fn();
		const onStatusChange = vi.fn();
		render(
			<AdminContentFilters
				onRoleChange={onRoleChange}
				onSearchChange={onSearchChange}
				onStatusChange={onStatusChange}
				roleFilter="ALL"
				searchQuery=""
				statusFilter="ALL"
			/>,
		);

		// Act
		fireEvent.click(screen.getByRole("button", { name: /^published$/i }));
		fireEvent.click(screen.getByRole("button", { name: /^draft$/i }));
		fireEvent.click(screen.getByRole("button", { name: /^all status$/i }));

		// Assert
		expect(onStatusChange).toHaveBeenNthCalledWith(1, "PUBLISHED");
		expect(onStatusChange).toHaveBeenNthCalledWith(2, "DRAFT");
		expect(onStatusChange).toHaveBeenNthCalledWith(3, "ALL");
	});

	it("triggers onRoleChange when role buttons are clicked", () => {
		// Arrange
		const onRoleChange = vi.fn();
		const onSearchChange = vi.fn();
		const onStatusChange = vi.fn();
		render(
			<AdminContentFilters
				onRoleChange={onRoleChange}
				onSearchChange={onSearchChange}
				onStatusChange={onStatusChange}
				roleFilter="ALL"
				searchQuery=""
				statusFilter="ALL"
			/>,
		);

		// Act
		fireEvent.click(screen.getByRole("button", { name: /^tank$/i }));
		fireEvent.click(screen.getByRole("button", { name: /^damage$/i }));
		fireEvent.click(screen.getByRole("button", { name: /^support$/i }));
		fireEvent.click(screen.getByRole("button", { name: /^all roles$/i }));

		// Assert
		expect(onRoleChange).toHaveBeenNthCalledWith(1, "TANK");
		expect(onRoleChange).toHaveBeenNthCalledWith(2, "DAMAGE");
		expect(onRoleChange).toHaveBeenNthCalledWith(3, "SUPPORT");
		expect(onRoleChange).toHaveBeenNthCalledWith(4, "ALL");
	});

	it("renders active button variant for damage role filter", () => {
		// Arrange & Act
		render(
			<AdminContentFilters
				onRoleChange={vi.fn()}
				onSearchChange={vi.fn()}
				onStatusChange={vi.fn()}
				roleFilter="DAMAGE"
				searchQuery=""
				statusFilter="DRAFT"
			/>,
		);

		// Assert
		expect(screen.getByRole("button", { name: /^damage$/i })).toBeDefined();
		expect(screen.getByRole("button", { name: /^draft$/i })).toBeDefined();
	});
});
