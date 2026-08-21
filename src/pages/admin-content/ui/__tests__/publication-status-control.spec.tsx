import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PublicationStatusControl } from "../publication-status-control";

describe("PublicationStatusControl", () => {
	const validVod = {
		durationSeconds: 600,
		id: "vod_1",
		isPublished: false,
		title: "Grandmaster Ana",
	};

	const validScenarios = [
		{
			explanationText: "Explanation",
			id: "s1",
			imageUrl: null,
			inputConfig: {
				options: [
					{ id: "1", is_correct: true, text: "A" },
					{ id: "2", is_correct: false, text: "B" },
				],
			},
			inputType: "MULTIPLE_CHOICE" as const,
			moduleType: "STRATEGY" as const,
			promptText: "Prompt",
			timeLimitSeconds: null,
			timestampSeconds: 50,
			vodId: "vod_1",
		},
	];

	it("disables publish button and warns when VOD has zero scenarios", () => {
		// Arrange
		const onTogglePublish = vi.fn();

		// Act
		render(
			<PublicationStatusControl
				onTogglePublish={onTogglePublish}
				scenarios={[]}
				vod={validVod}
			/>,
		);

		// Assert
		expect(
			screen.getByText(
				"Cannot publish: VOD must have at least one valid scenario.",
			),
		).toBeDefined();
		const publishButton = screen.getByRole("button", {
			name: "Publish VOD",
		}) as HTMLButtonElement;
		expect(publishButton.disabled).toBe(true);
	});

	it("disables publish button when scenario timestamp exceeds VOD duration", () => {
		// Arrange
		const baseScenario = validScenarios[0];
		const invalidScenarios = baseScenario
			? [
					{
						...baseScenario,
						timestampSeconds: 700, // exceeds 600
					},
				]
			: [];
		const onTogglePublish = vi.fn();

		// Act
		render(
			<PublicationStatusControl
				onTogglePublish={onTogglePublish}
				scenarios={invalidScenarios}
				vod={validVod}
			/>,
		);

		// Assert
		expect(screen.getByText(/exceeds VOD duration/i)).toBeDefined();
		const publishButton = screen.getByRole("button", {
			name: "Publish VOD",
		}) as HTMLButtonElement;
		expect(publishButton.disabled).toBe(true);
	});

	it("allows publishing when VOD has valid scenarios and triggers callback", () => {
		// Arrange
		const onTogglePublish = vi.fn();
		render(
			<PublicationStatusControl
				onTogglePublish={onTogglePublish}
				scenarios={validScenarios}
				vod={validVod}
			/>,
		);

		// Act
		const publishButton = screen.getByRole("button", { name: "Publish VOD" });
		fireEvent.click(publishButton);

		// Assert
		expect(onTogglePublish).toHaveBeenCalledWith(true);
	});

	it("allows unpublishing when VOD is currently published", () => {
		// Arrange
		const onTogglePublish = vi.fn();
		render(
			<PublicationStatusControl
				onTogglePublish={onTogglePublish}
				scenarios={validScenarios}
				vod={{ ...validVod, isPublished: true }}
			/>,
		);

		// Act
		const unpublishButton = screen.getByRole("button", {
			name: "Unpublish VOD",
		});
		fireEvent.click(unpublishButton);

		// Assert
		expect(onTogglePublish).toHaveBeenCalledWith(false);
	});

	it("displays isSubmitting loading state for published and unpublished buttons", () => {
		// Arrange
		const onTogglePublish = vi.fn();

		// Act: Unpublished submitting
		const { rerender } = render(
			<PublicationStatusControl
				isSubmitting={true}
				onTogglePublish={onTogglePublish}
				scenarios={validScenarios}
				vod={validVod}
			/>,
		);
		expect(screen.getByText("Publishing…")).toBeDefined();

		// Act: Published submitting
		rerender(
			<PublicationStatusControl
				isSubmitting={true}
				onTogglePublish={onTogglePublish}
				scenarios={validScenarios}
				vod={{ ...validVod, isPublished: true }}
			/>,
		);
		expect(screen.getByText("Updating…")).toBeDefined();
	});
});
