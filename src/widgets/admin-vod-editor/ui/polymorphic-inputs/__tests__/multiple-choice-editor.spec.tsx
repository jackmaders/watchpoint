import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MultipleChoiceEditor } from "../multiple-choice-editor";

describe("MultipleChoiceEditor", () => {
	it("renders existing options and highlights correct answer", () => {
		// Arrange
		const value = {
			options: [
				{ id: "opt_1", is_correct: true, text: "Option A" },
				{ id: "opt_2", is_correct: false, text: "Option B" },
			],
		};
		const onChange = vi.fn();

		// Act
		render(<MultipleChoiceEditor onChange={onChange} value={value} />);

		// Assert
		expect(screen.getByDisplayValue("Option A")).toBeDefined();
		expect(screen.getByDisplayValue("Option B")).toBeDefined();
		const correctRadios = screen.getAllByRole("radio", { name: /correct/i });
		expect((correctRadios[0] as HTMLInputElement).checked).toBe(true);
		expect((correctRadios[1] as HTMLInputElement).checked).toBe(false);
	});

	it("initializes with two default options when value is empty", () => {
		// Arrange
		const onChange = vi.fn();

		// Act
		render(<MultipleChoiceEditor onChange={onChange} value={{}} />);

		// Assert
		expect(screen.getAllByPlaceholderText(/enter option/i)).toHaveLength(2);
	});

	it("parses primitive string, null, and non-string object options in value.options array", () => {
		// Arrange
		const onChange = vi.fn();
		const value = {
			options: ["First", null, { id: 123, is_correct: false, text: null }],
		};

		// Act
		render(<MultipleChoiceEditor onChange={onChange} value={value} />);

		// Assert
		expect(screen.getByDisplayValue("First")).toBeDefined();
		expect(screen.getAllByPlaceholderText(/enter option/i)).toHaveLength(3);
	});

	it("allows editing option text and triggers onChange", () => {
		// Arrange
		const value = {
			options: [
				{ id: "opt_1", is_correct: true, text: "Option A" },
				{ id: "opt_2", is_correct: false, text: "Option B" },
			],
		};
		const onChange = vi.fn();
		render(<MultipleChoiceEditor onChange={onChange} value={value} />);

		// Act
		const input = screen.getByDisplayValue("Option A");
		fireEvent.change(input, { target: { value: "Updated Option A" } });

		// Assert
		expect(onChange).toHaveBeenCalledWith({
			options: [
				{ id: "opt_1", is_correct: true, text: "Updated Option A" },
				{ id: "opt_2", is_correct: false, text: "Option B" },
			],
		});
	});

	it("allows editing option explanation and clearing it", () => {
		// Arrange
		const value = {
			options: [
				{
					explanation: "Previous explanation",
					id: "opt_1",
					is_correct: true,
					text: "Option A",
				},
				{ id: "opt_2", is_correct: false, text: "Option B" },
			],
		};
		const onChange = vi.fn();
		render(<MultipleChoiceEditor onChange={onChange} value={value} />);

		// Act: Set explanation
		const input = screen.getByDisplayValue("Previous explanation");
		fireEvent.change(input, { target: { value: "New Explanation" } });

		// Assert
		expect(onChange).toHaveBeenCalledWith({
			options: [
				{
					explanation: "New Explanation",
					id: "opt_1",
					is_correct: true,
					text: "Option A",
				},
				{ id: "opt_2", is_correct: false, text: "Option B" },
			],
		});

		// Act: Clear explanation
		fireEvent.change(input, { target: { value: "   " } });
		expect(onChange).toHaveBeenCalledWith({
			options: [
				{ id: "opt_1", is_correct: true, text: "Option A" },
				{ id: "opt_2", is_correct: false, text: "Option B" },
			],
		});
	});

	it("allows toggling correct option and triggers onChange", () => {
		// Arrange
		const value = {
			options: [
				{ id: "opt_1", is_correct: true, text: "Option A" },
				{ id: "opt_2", is_correct: false, text: "Option B" },
			],
		};
		const onChange = vi.fn();
		render(<MultipleChoiceEditor onChange={onChange} value={value} />);

		// Act
		const correctRadios = screen.getAllByRole("radio", { name: /correct/i });
		const targetRadio = correctRadios[1];
		if (targetRadio) {
			fireEvent.click(targetRadio);
		}

		// Assert
		expect(onChange).toHaveBeenCalledWith({
			options: [
				{ id: "opt_1", is_correct: false, text: "Option A" },
				{ id: "opt_2", is_correct: true, text: "Option B" },
			],
		});
	});

	it("allows adding a new option", () => {
		// Arrange
		const value = {
			options: [
				{ id: "opt_1", is_correct: true, text: "Option A" },
				{ id: "opt_2", is_correct: false, text: "Option B" },
			],
		};
		const onChange = vi.fn();
		render(<MultipleChoiceEditor onChange={onChange} value={value} />);

		// Act
		const addButton = screen.getByRole("button", { name: /add option/i });
		fireEvent.click(addButton);

		// Assert
		expect(onChange).toHaveBeenCalledWith({
			options: [
				{ id: "opt_1", is_correct: true, text: "Option A" },
				{ id: "opt_2", is_correct: false, text: "Option B" },
				expect.objectContaining({ is_correct: false, text: "" }),
			],
		});
	});

	it("allows removing an option and ensures at least one option is correct", () => {
		// Arrange: opt_1 is correct, and we remove opt_1
		const value = {
			options: [
				{ id: "opt_1", is_correct: true, text: "Option A" },
				{ id: "opt_2", is_correct: false, text: "Option B" },
				{ id: "opt_3", is_correct: false, text: "Option C" },
			],
		};
		const onChange = vi.fn();
		render(<MultipleChoiceEditor onChange={onChange} value={value} />);

		// Act
		const removeButtons = screen.getAllByRole("button", {
			name: /remove option/i,
		});
		const targetRemoveBtn = removeButtons[0];
		if (targetRemoveBtn) {
			fireEvent.click(targetRemoveBtn);
		}

		// Assert: opt_2 becomes is_correct: true
		expect(onChange).toHaveBeenCalledWith({
			options: [
				{ id: "opt_2", is_correct: true, text: "Option B" },
				{ id: "opt_3", is_correct: false, text: "Option C" },
			],
		});

		// Act: Remove incorrect option (opt_2 from a list where opt_1 is already correct)
		onChange.mockClear();
		const removeBtn3 = removeButtons[2];
		if (removeBtn3) {
			fireEvent.click(removeBtn3);
		}
		expect(onChange).toHaveBeenCalledWith({
			options: [
				{ id: "opt_1", is_correct: true, text: "Option A" },
				{ id: "opt_2", is_correct: false, text: "Option B" },
			],
		});
	});

	it("disables remove buttons when only 2 options remain", () => {
		// Arrange
		const value = {
			options: [
				{ id: "opt_1", is_correct: true, text: "Option A" },
				{ id: "opt_2", is_correct: false, text: "Option B" },
			],
		};
		const onChange = vi.fn();

		// Act
		render(<MultipleChoiceEditor onChange={onChange} value={value} />);

		// Assert
		const removeButtons = screen.getAllByRole("button", {
			name: /remove option/i,
		});
		for (const btn of removeButtons) {
			expect((btn as HTMLButtonElement).disabled).toBe(true);
		}
	});

	it("renders error message when error prop is provided", () => {
		// Arrange
		const onChange = vi.fn();

		// Act
		render(
			<MultipleChoiceEditor
				error="At least one option must be marked correct"
				onChange={onChange}
				value={{}}
			/>,
		);

		// Assert
		expect(
			screen.getByText("At least one option must be marked correct"),
		).toBeDefined();
	});
});
