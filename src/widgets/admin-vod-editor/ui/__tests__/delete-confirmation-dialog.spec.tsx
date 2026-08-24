import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeleteConfirmationDialog } from "../delete-confirmation-dialog";

describe("DeleteConfirmationDialog", () => {
	it("renders confirmation message with single vod and scenario count", () => {
		// Arrange
		const onConfirm = vi.fn();
		const onOpenChange = vi.fn();

		// Act
		render(
			<DeleteConfirmationDialog
				isDeleting={false}
				onConfirm={onConfirm}
				onOpenChange={onOpenChange}
				open={true}
				scenarioCount={5}
				vodCount={1}
			/>,
		);

		// Assert
		expect(screen.getByText("Delete VOD Confirmation")).toBeDefined();
		expect(
			screen.getByText(
				/This will permanently delete 1 VOD and 5 associated scenarios\./i,
			),
		).toBeDefined();
	});

	it("renders confirmation message with multiple vods and singular scenario", () => {
		// Arrange
		const onConfirm = vi.fn();
		const onOpenChange = vi.fn();

		// Act
		render(
			<DeleteConfirmationDialog
				isDeleting={false}
				onConfirm={onConfirm}
				onOpenChange={onOpenChange}
				open={true}
				scenarioCount={1}
				vodCount={3}
			/>,
		);

		// Assert
		expect(
			screen.getByText(
				/This will permanently delete 3 VODs and 1 associated scenario\./i,
			),
		).toBeDefined();
	});

	it("calls onConfirm when confirm button is clicked", () => {
		// Arrange
		const onConfirm = vi.fn();
		const onOpenChange = vi.fn();
		render(
			<DeleteConfirmationDialog
				isDeleting={false}
				onConfirm={onConfirm}
				onOpenChange={onOpenChange}
				open={true}
				scenarioCount={2}
				vodCount={1}
			/>,
		);

		// Act
		fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

		// Assert
		expect(onConfirm).toHaveBeenCalledTimes(1);
	});

	it("calls onOpenChange with false when cancel button is clicked", () => {
		// Arrange
		const onConfirm = vi.fn();
		const onOpenChange = vi.fn();
		render(
			<DeleteConfirmationDialog
				isDeleting={false}
				onConfirm={onConfirm}
				onOpenChange={onOpenChange}
				open={true}
				scenarioCount={2}
				vodCount={1}
			/>,
		);

		// Act
		fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

		// Assert
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("disables buttons when isDeleting is true", () => {
		// Arrange
		const onConfirm = vi.fn();
		const onOpenChange = vi.fn();

		// Act
		render(
			<DeleteConfirmationDialog
				isDeleting={true}
				onConfirm={onConfirm}
				onOpenChange={onOpenChange}
				open={true}
				scenarioCount={0}
				vodCount={1}
			/>,
		);

		// Assert
		expect(
			(screen.getByRole("button", { name: /deleting…/i }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
		expect(
			(screen.getByRole("button", { name: /cancel/i }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
	});
});
