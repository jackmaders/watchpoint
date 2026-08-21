import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TimeSliderEditor } from "../polymorphic-inputs/time-slider-editor";

describe("TimeSliderEditor", () => {
	it("renders with default time slider range and values", () => {
		// Arrange
		const onChange = vi.fn();

		// Act
		render(<TimeSliderEditor onChange={onChange} value={{}} />);

		// Assert
		expect(screen.getByLabelText("Target Seconds Slider")).toBeDefined();
		expect(screen.getByLabelText("Min Seconds")).toBeDefined();
		expect(screen.getByLabelText("Max Seconds")).toBeDefined();
		expect(screen.getByLabelText("Tolerance Seconds")).toBeDefined();
	});

	it("renders provided values correctly", () => {
		// Arrange
		const value = {
			max: 15,
			min: 0,
			step: 0.5,
			target: 3.5,
			tolerance: 0.5,
		};
		const onChange = vi.fn();

		// Act
		render(<TimeSliderEditor onChange={onChange} value={value} />);

		// Assert
		expect(
			(screen.getByLabelText("Target Seconds Input") as HTMLInputElement).value,
		).toBe("3.5");
		expect(
			(screen.getByLabelText("Tolerance Seconds") as HTMLInputElement).value,
		).toBe("0.5");
	});

	it("updates target seconds on slider change and triggers onChange", () => {
		// Arrange
		const value = { max: 10, min: 0, target: 3, tolerance: 0.5 };
		const onChange = vi.fn();
		render(<TimeSliderEditor onChange={onChange} value={value} />);

		// Act
		const slider = screen.getByLabelText("Target Seconds Slider");
		fireEvent.change(slider, { target: { value: "4.5" } });

		// Assert
		expect(onChange).toHaveBeenCalledWith({
			max: 10,
			min: 0,
			step: 0.1,
			target: 4.5,
			tolerance: 0.5,
		});
	});

	it("updates bounds and target via numeric input fields", () => {
		// Arrange
		const value = { max: 10, min: 0, target: 3, tolerance: 0.5 };
		const onChange = vi.fn();
		render(<TimeSliderEditor onChange={onChange} value={value} />);

		// Act: Max Change
		const maxInput = screen.getByLabelText("Max Seconds");
		fireEvent.change(maxInput, { target: { value: "20" } });
		expect(onChange).toHaveBeenCalledWith({
			max: 20,
			min: 0,
			step: 0.1,
			target: 3,
			tolerance: 0.5,
		});

		// Act: Min Change
		const minInput = screen.getByLabelText("Min Seconds");
		fireEvent.change(minInput, { target: { value: "1" } });
		expect(onChange).toHaveBeenCalledWith({
			max: 10,
			min: 1,
			step: 0.1,
			target: 3,
			tolerance: 0.5,
		});

		// Act: Tolerance Change
		const tolInput = screen.getByLabelText("Tolerance Seconds");
		fireEvent.change(tolInput, { target: { value: "1.5" } });
		expect(onChange).toHaveBeenCalledWith({
			max: 10,
			min: 0,
			step: 0.1,
			target: 3,
			tolerance: 1.5,
		});

		// Act: Target Change
		const targetInput = screen.getByLabelText("Target Seconds Input");
		fireEvent.change(targetInput, { target: { value: "6.2" } });
		expect(onChange).toHaveBeenCalledWith({
			max: 10,
			min: 0,
			step: 0.1,
			target: 6.2,
			tolerance: 0.5,
		});
	});

	it("renders error message when error prop is provided", () => {
		// Arrange
		const onChange = vi.fn();

		// Act
		render(
			<TimeSliderEditor
				error="Target time must be within range"
				onChange={onChange}
				value={{}}
			/>,
		);

		// Assert
		expect(screen.getByText("Target time must be within range")).toBeDefined();
	});
});
