import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ModuleType } from "@/shared/db";
import { ModuleFilterPills } from "../module-filter-pills";

describe("ModuleFilterPills", () => {
	const allModules: ModuleType[] = [
		"STRATEGY",
		"TACTICS",
		"ULTIMATE",
		"COOLDOWN",
		"SPATIAL",
	];

	it("renders all 5 module pills with active state and count badges", () => {
		// Arrange
		const onChange = vi.fn();
		const availableCounts: Record<ModuleType, number> = {
			COOLDOWN: 1,
			SPATIAL: 2,
			STRATEGY: 3,
			TACTICS: 4,
			ULTIMATE: 5,
		};

		// Act
		render(
			<ModuleFilterPills
				availableCounts={availableCounts}
				onChange={onChange}
				selectedModules={allModules}
			/>,
		);

		// Assert
		expect(screen.getByRole("button", { name: /strategy/i })).toBeDefined();
		expect(screen.getByRole("button", { name: /tactics/i })).toBeDefined();
		expect(
			screen.getByRole("button", { name: /ultimate tracking/i }),
		).toBeDefined();
		expect(
			screen.getByRole("button", { name: /cooldown tracking/i }),
		).toBeDefined();
		expect(
			screen.getByRole("button", { name: /spatial awareness/i }),
		).toBeDefined();

		expect(screen.getByText("3 scenarios")).toBeDefined();
		expect(screen.getByText("4 scenarios")).toBeDefined();
	});

	it("toggles module off when an active module pill is clicked", () => {
		// Arrange
		const onChange = vi.fn();

		// Act
		render(
			<ModuleFilterPills
				onChange={onChange}
				selectedModules={["STRATEGY", "TACTICS"]}
			/>,
		);
		const strategyBtn = screen.getByRole("button", { name: /strategy/i });
		fireEvent.click(strategyBtn);

		// Assert
		expect(onChange).toHaveBeenCalledWith(["TACTICS"]);
	});

	it("toggles module on when an inactive module pill is clicked", () => {
		// Arrange
		const onChange = vi.fn();

		// Act
		render(
			<ModuleFilterPills onChange={onChange} selectedModules={["TACTICS"]} />,
		);
		const strategyBtn = screen.getByRole("button", { name: /strategy/i });
		fireEvent.click(strategyBtn);

		// Assert
		expect(onChange).toHaveBeenCalledWith(["TACTICS", "STRATEGY"]);
	});

	it("selects all modules when 'Select All' is clicked", () => {
		// Arrange
		const onChange = vi.fn();

		// Act
		render(
			<ModuleFilterPills onChange={onChange} selectedModules={["STRATEGY"]} />,
		);
		const selectAllBtn = screen.getByRole("button", { name: /^select all$/i });
		fireEvent.click(selectAllBtn);

		// Assert
		expect(onChange).toHaveBeenCalledWith(allModules);
	});

	it("deselects all modules when 'Deselect All' is clicked", () => {
		// Arrange
		const onChange = vi.fn();

		// Act
		render(
			<ModuleFilterPills onChange={onChange} selectedModules={allModules} />,
		);
		const deselectAllBtn = screen.getByRole("button", {
			name: /^deselect all$/i,
		});
		fireEvent.click(deselectAllBtn);

		// Assert
		expect(onChange).toHaveBeenCalledWith([]);
	});

	it("shows validation warning guard when no modules are selected", () => {
		// Arrange
		const onChange = vi.fn();

		// Act
		render(<ModuleFilterPills onChange={onChange} selectedModules={[]} />);

		// Assert
		expect(
			screen.getByText(/select at least one module to start training/i),
		).toBeDefined();
	});

	it("supports keyboard accessibility with aria-pressed attribute", () => {
		// Arrange
		const onChange = vi.fn();

		// Act
		render(
			<ModuleFilterPills onChange={onChange} selectedModules={["STRATEGY"]} />,
		);
		const strategyBtn = screen.getByRole("button", { name: /strategy/i });
		const tacticsBtn = screen.getByRole("button", { name: /tactics/i });

		// Assert
		expect(strategyBtn.getAttribute("aria-pressed")).toBe("true");
		expect(tacticsBtn.getAttribute("aria-pressed")).toBe("false");
	});
});
