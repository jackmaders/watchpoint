import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BulkSummaryAlert } from "../bulk-summary-alert";

describe("BulkSummaryAlert", () => {
	it("renders success and failure details for partial failure result", () => {
		// Arrange
		const onDismiss = vi.fn();
		const result = {
			failed: [{ error: "Cannot publish with 0 scenarios", id: "vod_1" }],
			succeeded: ["vod_2", "vod_3"],
		};

		// Act
		render(
			<BulkSummaryAlert
				onDismiss={onDismiss}
				operationLabel="Bulk Publish"
				result={result}
			/>,
		);

		// Assert
		expect(
			screen.getByText(/Bulk Publish completed: 2 succeeded, 1 failed/i),
		).toBeDefined();
		expect(
			screen.getByText(/vod_1: Cannot publish with 0 scenarios/i),
		).toBeDefined();
	});

	it("renders success message when all items succeed", () => {
		// Arrange
		const onDismiss = vi.fn();
		const result = {
			failed: [],
			succeeded: ["vod_1", "vod_2"],
		};

		// Act
		render(
			<BulkSummaryAlert
				onDismiss={onDismiss}
				operationLabel="Bulk Delete"
				result={result}
			/>,
		);

		// Assert
		expect(
			screen.getByText(/Bulk Delete completed: 2 succeeded, 0 failed/i),
		).toBeDefined();
	});

	it("renders failure message when all items fail", () => {
		// Arrange
		const onDismiss = vi.fn();
		const result = {
			failed: [{ error: "Network timeout", id: "vod_1" }],
			succeeded: [],
		};

		// Act
		render(
			<BulkSummaryAlert
				onDismiss={onDismiss}
				operationLabel="Bulk Unpublish"
				result={result}
			/>,
		);

		// Assert
		expect(
			screen.getByText(/Bulk Unpublish completed: 0 succeeded, 1 failed/i),
		).toBeDefined();
		expect(screen.getByText(/vod_1: Network timeout/i)).toBeDefined();
	});

	it("calls onDismiss when close button is clicked", () => {
		// Arrange
		const onDismiss = vi.fn();
		const result = {
			failed: [{ error: "Failed", id: "vod_1" }],
			succeeded: [],
		};
		render(
			<BulkSummaryAlert
				onDismiss={onDismiss}
				operationLabel="Bulk Action"
				result={result}
			/>,
		);

		// Act
		fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

		// Assert
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});
});
