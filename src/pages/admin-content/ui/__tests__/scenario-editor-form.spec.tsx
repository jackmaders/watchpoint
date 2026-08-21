import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScenarioEditorForm } from "../scenario-editor-form";

describe("ScenarioEditorForm", () => {
	const defaultVod = {
		durationSeconds: 600,
		id: "vod_1",
		title: "Grandmaster Ana",
	};

	it("renders blank create form with default values", () => {
		// Arrange
		const onSave = vi.fn();
		const _onCancel = vi.fn();

		// Act
		render(
			<ScenarioEditorForm onSave={onSave} scenario={null} vod={defaultVod} />,
		);

		// Assert
		expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
		expect(screen.getByLabelText("Prompt Text")).toBeDefined();
		expect(screen.getByLabelText("Explanation Text")).toBeDefined();
		expect(screen.getByLabelText("Timestamp (Seconds)")).toBeDefined();
		expect(screen.getByLabelText("Module Type")).toBeDefined();
		expect(screen.getByLabelText("Polymorphic Input Type")).toBeDefined();
		expect(
			screen.getByRole("button", { name: "Create Scenario" }),
		).toBeDefined();
	});

	it("renders existing scenario values in edit mode and handles cancel", () => {
		// Arrange
		const existingScenario = {
			explanationText: "Position on high ground",
			id: "scen_1",
			imageUrl: "https://example.com/image.png",
			inputConfig: {
				options: [
					{ id: "1", is_correct: true, text: "High Ground" },
					{ id: "2", is_correct: false, text: "Low Ground" },
				],
			},
			inputType: "MULTIPLE_CHOICE" as const,
			moduleType: "STRATEGY" as const,
			promptText: "Where should you position?",
			timeLimitSeconds: 15,
			timestampSeconds: 120,
			vodId: "vod_1",
		};
		const onSave = vi.fn();
		const onCancel = vi.fn();

		// Act
		render(
			<ScenarioEditorForm
				onCancel={onCancel}
				onSave={onSave}
				scenario={existingScenario}
				vod={defaultVod}
			/>,
		);

		// Assert
		expect(
			(screen.getByLabelText("Prompt Text") as HTMLInputElement).value,
		).toBe("Where should you position?");
		expect(
			(screen.getByLabelText("Explanation Text") as HTMLInputElement).value,
		).toBe("Position on high ground");
		expect(
			(screen.getByLabelText("Timestamp (Seconds)") as HTMLInputElement).value,
		).toBe("120");
		expect(
			(
				screen.getByLabelText(
					"Visual Aid Image URL (Optional)",
				) as HTMLInputElement
			).value,
		).toBe("https://example.com/image.png");
		expect(screen.getByRole("button", { name: "Save Changes" })).toBeDefined();

		// Act: cancel
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(onCancel).toHaveBeenCalled();
	});

	it("switches polymorphic editor when input type changes", () => {
		// Arrange
		const onSave = vi.fn();
		const onCancel = vi.fn();
		render(
			<ScenarioEditorForm
				onCancel={onCancel}
				onSave={onSave}
				scenario={null}
				vod={defaultVod}
			/>,
		);

		// Act 1: PERCENT_SLIDER
		const inputTypeSelect = screen.getByLabelText("Polymorphic Input Type");
		fireEvent.change(inputTypeSelect, { target: { value: "PERCENT_SLIDER" } });
		expect(screen.getByLabelText("Target Percentage Slider")).toBeDefined();

		// Act 2: TIME_SLIDER
		fireEvent.change(inputTypeSelect, { target: { value: "TIME_SLIDER" } });
		expect(screen.getByLabelText("Target Seconds Slider")).toBeDefined();

		// Act 3: MAP_PIN_2D
		fireEvent.change(inputTypeSelect, { target: { value: "MAP_PIN_2D" } });
		expect(screen.getByLabelText("Interactive map pin surface")).toBeDefined();
	});

	it("validates empty required fields and prevents saving", async () => {
		// Arrange
		const onSave = vi.fn();
		const onCancel = vi.fn();
		const { container } = render(
			<ScenarioEditorForm
				onCancel={onCancel}
				onSave={onSave}
				scenario={null}
				vod={defaultVod}
			/>,
		);

		// Act 1: Empty prompt
		const form = container.querySelector("form");
		if (form) {
			fireEvent.submit(form);
		}
		expect(screen.getByText("Prompt text is required")).toBeDefined();

		// Act 2: Empty explanation
		fireEvent.change(screen.getByLabelText("Prompt Text"), {
			target: { value: "Valid prompt" },
		});
		if (form) {
			fireEvent.submit(form);
		}
		expect(screen.getByText("Explanation text is required")).toBeDefined();

		// Act 3: Invalid negative timestamp
		fireEvent.change(screen.getByLabelText("Explanation Text"), {
			target: { value: "Valid explanation" },
		});
		fireEvent.change(screen.getByLabelText("Timestamp (Seconds)"), {
			target: { value: "-5" },
		});
		if (form) {
			fireEvent.submit(form);
		}
		expect(
			screen.getByText("Timestamp must be a non-negative number of seconds"),
		).toBeDefined();

		expect(onSave).not.toHaveBeenCalled();
	});

	it("validates timestamp exceeding VOD duration", async () => {
		// Arrange
		const onSave = vi.fn();
		const onCancel = vi.fn();
		const { container } = render(
			<ScenarioEditorForm
				onCancel={onCancel}
				onSave={onSave}
				scenario={null}
				vod={defaultVod}
			/>,
		);

		// Act
		fireEvent.change(screen.getByLabelText("Prompt Text"), {
			target: { value: "Valid prompt" },
		});
		fireEvent.change(screen.getByLabelText("Explanation Text"), {
			target: { value: "Valid explanation" },
		});
		fireEvent.change(screen.getByLabelText("Timestamp (Seconds)"), {
			target: { value: "700" }, // exceeds vod.durationSeconds = 600
		});
		const form = container.querySelector("form");
		if (form) {
			fireEvent.submit(form);
		}

		// Assert
		expect(onSave).not.toHaveBeenCalled();
		expect(
			screen.getByText("Timestamp (700s) exceeds VOD duration (600s)"),
		).toBeDefined();
	});

	it("submits valid scenario payload with optional fields (timeLimit, moduleType, imageUrl)", async () => {
		// Arrange
		const onSave = vi.fn();
		const onCancel = vi.fn();
		const { container } = render(
			<ScenarioEditorForm
				onCancel={onCancel}
				onSave={onSave}
				scenario={null}
				vod={defaultVod}
			/>,
		);

		// Act
		fireEvent.change(screen.getByLabelText("Prompt Text"), {
			target: { value: "Valid prompt" },
		});
		fireEvent.change(screen.getByLabelText("Explanation Text"), {
			target: { value: "Valid explanation" },
		});
		fireEvent.change(screen.getByLabelText("Timestamp (Seconds)"), {
			target: { value: "45" },
		});
		fireEvent.change(screen.getByLabelText("Time Limit (Seconds, optional)"), {
			target: { value: "10" },
		});
		fireEvent.change(screen.getByLabelText("Module Type"), {
			target: { value: "TACTICS" },
		});
		fireEvent.change(screen.getByLabelText("Visual Aid Image URL (Optional)"), {
			target: { value: "https://example.com/asset.png" },
		});

		const optionInputs = screen.getAllByPlaceholderText(/enter option/i);
		const opt1 = optionInputs[0];
		const opt2 = optionInputs[1];
		if (opt1) {
			fireEvent.change(opt1, { target: { value: "Correct Choice" } });
		}
		if (opt2) {
			fireEvent.change(opt2, { target: { value: "Wrong Choice" } });
		}

		const form = container.querySelector("form");
		if (form) {
			fireEvent.submit(form);
		}

		// Assert
		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				explanationText: "Valid explanation",
				imageUrl: "https://example.com/asset.png",
				inputType: "MULTIPLE_CHOICE",
				moduleType: "TACTICS",
				promptText: "Valid prompt",
				timeLimitSeconds: 10,
				timestampSeconds: 45,
				vodId: "vod_1",
			}),
		);
	});
});
