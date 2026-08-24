import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { scenarios } from "@/shared/db";
import { ScenarioTimeline } from "../scenario-timeline";

describe("ScenarioTimeline", () => {
	const mockScenarios: Array<typeof scenarios.$inferSelect> = [
		{
			explanationText: "Use high ground",
			id: "scen_1",
			imageUrl: null,
			inputConfig: { options: [] },
			inputType: "MULTIPLE_CHOICE",
			moduleType: "STRATEGY",
			promptText: "Positioning choice",
			timeLimitSeconds: 10,
			timestampSeconds: 45,
			vodId: "vod_1",
		},
		{
			explanationText: "Check sleep dart cooldown",
			id: "scen_2",
			imageUrl: null,
			inputConfig: { target: 3 },
			inputType: "TIME_SLIDER",
			moduleType: "COOLDOWN",
			promptText: "Cooldown check",
			timeLimitSeconds: null,
			timestampSeconds: 120,
			vodId: "vod_1",
		},
		{
			explanationText: "Estimate grav charge",
			id: "scen_3",
			imageUrl: null,
			inputConfig: { target: 80 },
			inputType: "PERCENT_SLIDER",
			moduleType: "ULTIMATE",
			promptText: "Zarya ult prediction",
			timeLimitSeconds: null,
			timestampSeconds: 180,
			vodId: "vod_1",
		},
		{
			explanationText: "Engage pulse bomb target",
			id: "scen_4",
			imageUrl: null,
			inputConfig: { target_x: 50, target_y: 50 },
			inputType: "MAP_PIN_2D",
			moduleType: "TACTICS",
			promptText: "Target selection",
			timeLimitSeconds: null,
			timestampSeconds: 240,
			vodId: "vod_1",
		},
		{
			explanationText: "Find sniper line of sight",
			id: "scen_5",
			imageUrl: null,
			inputConfig: {},
			inputType: "MULTIPLE_CHOICE",
			moduleType: "SPATIAL",
			promptText: "Sightline identification",
			timeLimitSeconds: null,
			timestampSeconds: 300,
			vodId: "vod_1",
		},
	];

	it("renders all scenarios in chronological order with module and input type indicators", () => {
		// Arrange
		const onSelect = vi.fn();
		const onAdd = vi.fn();
		const onDelete = vi.fn();
		const onMove = vi.fn();

		// Act
		render(
			<ScenarioTimeline
				onAddScenario={onAdd}
				onDeleteScenario={onDelete}
				onMoveScenario={onMove}
				onSelectScenario={onSelect}
				scenarios={mockScenarios}
				selectedScenarioId="scen_1"
			/>,
		);

		// Assert
		expect(screen.getByText("Positioning choice")).toBeDefined();
		expect(screen.getByText("Cooldown check")).toBeDefined();
		expect(screen.getByText("Zarya ult prediction")).toBeDefined();
		expect(screen.getByText("Target selection")).toBeDefined();
		expect(screen.getByText("Sightline identification")).toBeDefined();
		expect(screen.getByText("STRATEGY")).toBeDefined();
		expect(screen.getByText("COOLDOWN")).toBeDefined();
		expect(screen.getByText("ULTIMATE")).toBeDefined();
		expect(screen.getByText("TACTICS")).toBeDefined();
		expect(screen.getByText("SPATIAL")).toBeDefined();
		expect(screen.getByText("2D Map Pin")).toBeDefined();
	});

	it("handles scenario selection when clicking a scenario item", () => {
		// Arrange
		const onSelect = vi.fn();
		render(
			<ScenarioTimeline
				onAddScenario={vi.fn()}
				onDeleteScenario={vi.fn()}
				onMoveScenario={vi.fn()}
				onSelectScenario={onSelect}
				scenarios={mockScenarios}
				selectedScenarioId={null}
			/>,
		);

		// Act
		fireEvent.click(screen.getByText("Cooldown check"));

		// Assert
		expect(onSelect).toHaveBeenCalledWith(mockScenarios[1]);
	});

	it("handles moving a scenario up or down", () => {
		// Arrange
		const onMove = vi.fn();
		render(
			<ScenarioTimeline
				onAddScenario={vi.fn()}
				onDeleteScenario={vi.fn()}
				onMoveScenario={onMove}
				onSelectScenario={vi.fn()}
				scenarios={mockScenarios}
				selectedScenarioId="scen_2"
			/>,
		);

		// Act: Move Up
		const moveUpButton = screen.getByRole("button", {
			name: "Move Cooldown check up",
		});
		fireEvent.click(moveUpButton);
		expect(onMove).toHaveBeenCalledWith("scen_2", "up");

		// Act: Move Down
		const moveDownButton = screen.getByRole("button", {
			name: "Move Cooldown check down",
		});
		fireEvent.click(moveDownButton);
		expect(onMove).toHaveBeenCalledWith("scen_2", "down");
	});

	it("disables move up for the first scenario and move down for the last scenario", () => {
		// Arrange
		render(
			<ScenarioTimeline
				onAddScenario={vi.fn()}
				onDeleteScenario={vi.fn()}
				onMoveScenario={vi.fn()}
				onSelectScenario={vi.fn()}
				scenarios={mockScenarios}
				selectedScenarioId="scen_1"
			/>,
		);

		// Act & Assert
		const firstMoveUp = screen.getByRole("button", {
			name: "Move Positioning choice up",
		}) as HTMLButtonElement;
		const lastMoveDown = screen.getByRole("button", {
			name: "Move Sightline identification down",
		}) as HTMLButtonElement;

		expect(firstMoveUp.disabled).toBe(true);
		expect(lastMoveDown.disabled).toBe(true);
	});

	it("handles deleting a scenario", () => {
		// Arrange
		const onDelete = vi.fn();
		render(
			<ScenarioTimeline
				onAddScenario={vi.fn()}
				onDeleteScenario={onDelete}
				onMoveScenario={vi.fn()}
				onSelectScenario={vi.fn()}
				scenarios={mockScenarios}
				selectedScenarioId="scen_1"
			/>,
		);

		// Act
		const deleteButton = screen.getByRole("button", {
			name: "Delete scenario Positioning choice",
		});
		fireEvent.click(deleteButton);

		// Assert
		expect(onDelete).toHaveBeenCalledWith("scen_1");
	});

	it("handles add scenario button click", () => {
		// Arrange
		const onAdd = vi.fn();
		render(
			<ScenarioTimeline
				onAddScenario={onAdd}
				onDeleteScenario={vi.fn()}
				onMoveScenario={vi.fn()}
				onSelectScenario={vi.fn()}
				scenarios={mockScenarios}
				selectedScenarioId="scen_1"
			/>,
		);

		// Act
		const addButton = screen.getByRole("button", { name: /add scenario/i });
		fireEvent.click(addButton);

		// Assert
		expect(onAdd).toHaveBeenCalled();
	});

	it("renders empty state and handles add first scenario button click", () => {
		// Arrange
		const onAdd = vi.fn();
		render(
			<ScenarioTimeline
				onAddScenario={onAdd}
				onDeleteScenario={vi.fn()}
				onMoveScenario={vi.fn()}
				onSelectScenario={vi.fn()}
				scenarios={[]}
				selectedScenarioId={null}
			/>,
		);

		// Act & Assert
		expect(screen.getByText("No scenarios created yet.")).toBeDefined();
		const addFirstBtn = screen.getByRole("button", {
			name: /add first scenario/i,
		});
		fireEvent.click(addFirstBtn);
		expect(onAdd).toHaveBeenCalled();
	});
});
