import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MapPinEditor } from "../map-pin-editor";

describe("MapPinEditor", () => {
	it("renders default map pin coordinates and controls", () => {
		// Arrange
		const onChange = vi.fn();

		// Act
		render(<MapPinEditor onChange={onChange} value={{}} />);

		// Assert
		expect(screen.getByLabelText("Target X Coordinate (%)")).toBeDefined();
		expect(screen.getByLabelText("Target Y Coordinate (%)")).toBeDefined();
		expect(screen.getByLabelText("Tolerance Radius (%)")).toBeDefined();
		expect(screen.getByLabelText("Map Asset Reference")).toBeDefined();
	});

	it("renders provided values correctly", () => {
		// Arrange
		const value = {
			mapName: "King's Row",
			targetX: 42,
			targetY: 68,
			toleranceRadius: 15,
		};
		const onChange = vi.fn();

		// Act
		render(<MapPinEditor onChange={onChange} value={value} />);

		// Assert
		expect(
			(screen.getByLabelText("Target X Coordinate (%)") as HTMLInputElement)
				.value,
		).toBe("42");
		expect(
			(screen.getByLabelText("Target Y Coordinate (%)") as HTMLInputElement)
				.value,
		).toBe("68");
		expect(
			(screen.getByLabelText("Tolerance Radius (%)") as HTMLInputElement).value,
		).toBe("15");
		expect(
			(screen.getByLabelText("Map Asset Reference") as HTMLInputElement).value,
		).toBe("King's Row");
	});

	it("updates coordinates, mapName, and tolerance via inputs", () => {
		// Arrange
		const value = {
			mapName: "Dorado",
			targetX: 50,
			targetY: 50,
			toleranceRadius: 10,
		};
		const onChange = vi.fn();
		render(<MapPinEditor onChange={onChange} value={value} />);

		// Act: X Input
		const xInput = screen.getByLabelText("Target X Coordinate (%)");
		fireEvent.change(xInput, { target: { value: "65" } });
		expect(onChange).toHaveBeenCalledWith({
			mapName: "Dorado",
			targetX: 65,
			targetY: 50,
			toleranceRadius: 10,
		});

		// Act: Y Input
		const yInput = screen.getByLabelText("Target Y Coordinate (%)");
		fireEvent.change(yInput, { target: { value: "70" } });
		expect(onChange).toHaveBeenCalledWith({
			mapName: "Dorado",
			targetX: 50,
			targetY: 70,
			toleranceRadius: 10,
		});

		// Act: Tolerance Input
		const tolInput = screen.getByLabelText("Tolerance Radius (%)");
		fireEvent.change(tolInput, { target: { value: "18" } });
		expect(onChange).toHaveBeenCalledWith({
			mapName: "Dorado",
			targetX: 50,
			targetY: 50,
			toleranceRadius: 18,
		});

		// Act: Map Asset Reference Input
		const mapInput = screen.getByLabelText("Map Asset Reference");
		fireEvent.change(mapInput, { target: { value: "Circuit Royal" } });
		expect(onChange).toHaveBeenCalledWith({
			mapName: "Circuit Royal",
			targetX: 50,
			targetY: 50,
			toleranceRadius: 10,
		});
	});

	it("updates coordinates on interactive surface click and handles zero-size or disabled surface", () => {
		// Arrange
		const value = { targetX: 50, targetY: 50, toleranceRadius: 10 };
		const onChange = vi.fn();
		const { rerender } = render(
			<MapPinEditor onChange={onChange} value={value} />,
		);

		// Act
		const surface = screen.getByRole("button", {
			name: "Interactive map pin surface",
		});
		vi.spyOn(surface, "getBoundingClientRect").mockReturnValue({
			bottom: 200,
			height: 200,
			left: 0,
			right: 200,
			toJSON: () => {},
			top: 0,
			width: 200,
			x: 0,
			y: 0,
		});

		// Act: Valid click
		fireEvent.click(surface, {
			clientX: 150,
			clientY: 80,
		});
		expect(onChange).toHaveBeenCalledWith({
			mapName: "",
			targetX: 75,
			targetY: 40,
			toleranceRadius: 10,
		});

		// Act: Zero size rect
		onChange.mockClear();
		vi.spyOn(surface, "getBoundingClientRect").mockReturnValue({
			bottom: 0,
			height: 0,
			left: 0,
			right: 0,
			toJSON: () => {},
			top: 0,
			width: 0,
			x: 0,
			y: 0,
		});
		fireEvent.click(surface, { clientX: 100, clientY: 100 });
		expect(onChange).not.toHaveBeenCalled();

		// Act: Disabled mode
		rerender(<MapPinEditor disabled onChange={onChange} value={value} />);
		const disabledSurface = screen.getByRole("button", {
			name: "Interactive map pin surface",
		});
		fireEvent.click(disabledSurface, { clientX: 100, clientY: 100 });
		expect(onChange).not.toHaveBeenCalled();
	});

	it("renders error message when error prop is provided", () => {
		// Arrange
		const onChange = vi.fn();

		// Act
		render(
			<MapPinEditor
				error="Target coordinates are required"
				onChange={onChange}
				value={{}}
			/>,
		);

		// Assert
		expect(screen.getByText("Target coordinates are required")).toBeDefined();
	});
});
