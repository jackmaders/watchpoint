import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PercentSliderEditor } from "../polymorphic-inputs/percent-slider-editor";

describe("PercentSliderEditor", () => {
	it("renders with default percentage range and values", () => {
		// Arrange
		const onChange = vi.fn();

		// Act
		render(<PercentSliderEditor onChange={onChange} value={{}} />);

		// Assert
		expect(screen.getByLabelText("Target Percentage Slider")).toBeDefined();
		expect(screen.getByLabelText("Min Percentage")).toBeDefined();
		expect(screen.getByLabelText("Max Percentage")).toBeDefined();
		expect(screen.getByLabelText("Tolerance Percentage")).toBeDefined();
	});

	it("renders provided values correctly", () => {
		// Arrange
		const value = {
			max: 100,
			min: 0,
			step: 5,
			target: 75,
			tolerance: 10,
		};
		const onChange = vi.fn();

		// Act
		render(<PercentSliderEditor onChange={onChange} value={value} />);

		// Assert
		expect(
			(screen.getByLabelText("Target Percentage Input") as HTMLInputElement)
				.value,
		).toBe("75");
		expect(
			(screen.getByLabelText("Tolerance Percentage") as HTMLInputElement).value,
		).toBe("10");
	});

	it("updates target value on slider change and triggers onChange", () => {
		// Arrange
		const value = { max: 100, min: 0, target: 50, tolerance: 5 };
		const onChange = vi.fn();
		render(<PercentSliderEditor onChange={onChange} value={value} />);

		// Act
		const slider = screen.getByRole("slider", {
			name: /target percentage slider/i,
		});
		fireEvent.change(slider, { target: { value: "85" } });

		// Assert
		expect(onChange).toHaveBeenCalledWith({
			max: 100,
			min: 0,
			step: 1,
			target: 85,
			tolerance: 5,
		});
	});

	it("updates target and bounds via numeric input fields", () => {
		// Arrange
		const value = { max: 100, min: 0, target: 50, tolerance: 5 };
		const onChange = vi.fn();
		render(<PercentSliderEditor onChange={onChange} value={value} />);

		// Act: Min Change
		const minInput = screen.getByLabelText(/min percentage/i);
		fireEvent.change(minInput, { target: { value: "10" } });
		expect(onChange).toHaveBeenCalledWith({
			max: 100,
			min: 10,
			step: 1,
			target: 50,
			tolerance: 5,
		});

		// Act: Max Change
		const maxInput = screen.getByLabelText(/max percentage/i);
		fireEvent.change(maxInput, { target: { value: "90" } });
		expect(onChange).toHaveBeenCalledWith({
			max: 90,
			min: 0,
			step: 1,
			target: 50,
			tolerance: 5,
		});

		// Act: Tolerance Change
		const tolInput = screen.getByLabelText(/tolerance percentage/i);
		fireEvent.change(tolInput, { target: { value: "8" } });
		expect(onChange).toHaveBeenCalledWith({
			max: 100,
			min: 0,
			step: 1,
			target: 50,
			tolerance: 8,
		});

		// Act: Target Input Change
		const targetInput = screen.getByLabelText(/target percentage input/i);
		fireEvent.change(targetInput, { target: { value: "65" } });
		expect(onChange).toHaveBeenCalledWith({
			max: 100,
			min: 0,
			step: 1,
			target: 65,
			tolerance: 5,
		});
	});

	it("renders error message when error prop is provided", () => {
		// Arrange
		const onChange = vi.fn();

		// Act
		render(
			<PercentSliderEditor
				error="Target percentage must be within range"
				onChange={onChange}
				value={{}}
			/>,
		);

		// Assert
		expect(
			screen.getByText("Target percentage must be within range"),
		).toBeDefined();
	});
});
