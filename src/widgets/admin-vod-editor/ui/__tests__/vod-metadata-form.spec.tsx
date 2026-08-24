import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { vods } from "@/shared/db";
import { VodMetadataForm } from "../vod-metadata-form";

describe("VodMetadataForm", () => {
	it("renders blank create form with required metadata fields", () => {
		// Arrange
		const onSave = vi.fn();

		// Act
		render(<VodMetadataForm isCreate onSave={onSave} />);

		// Assert
		expect(screen.getByLabelText("VOD Title")).toBeDefined();
		expect(screen.getByLabelText("YouTube Video ID")).toBeDefined();
		expect(screen.getByLabelText("Hero Name")).toBeDefined();
		expect(screen.getByLabelText("Role")).toBeDefined();
		expect(screen.getByLabelText("Map Name")).toBeDefined();
		expect(screen.getByLabelText("Duration (Seconds)")).toBeDefined();
		expect(screen.getByLabelText("Rank Tier")).toBeDefined();
		expect(screen.getByRole("button", { name: "Create VOD" })).toBeDefined();
	});

	it("renders existing VOD values in edit mode and handles cancel", () => {
		// Arrange
		const existingVod: typeof vods.$inferSelect = {
			createdAt: new Date("2026-01-01"),
			durationSeconds: 720,
			heroName: "Tracer",
			id: "vod_123",
			isPublished: false,
			mapName: "King's Row",
			rankTier: "Top 500",
			role: "DAMAGE" as const,
			title: "Top 500 Tracer Guide",
			youtubeVideoId: "yt_12345",
		};
		const onSave = vi.fn();
		const onCancel = vi.fn();

		// Act
		render(
			<VodMetadataForm
				isCreate={false}
				onCancel={onCancel}
				onSave={onSave}
				vod={existingVod}
			/>,
		);

		// Assert
		expect((screen.getByLabelText("VOD Title") as HTMLInputElement).value).toBe(
			"Top 500 Tracer Guide",
		);
		expect(
			(screen.getByLabelText("YouTube Video ID") as HTMLInputElement).value,
		).toBe("yt_12345");
		expect((screen.getByLabelText("Hero Name") as HTMLInputElement).value).toBe(
			"Tracer",
		);
		expect(
			(screen.getByLabelText("Role") as unknown as HTMLSelectElement).value,
		).toBe("DAMAGE");
		expect((screen.getByLabelText("Map Name") as HTMLInputElement).value).toBe(
			"King's Row",
		);
		expect(
			(screen.getByLabelText("Duration (Seconds)") as HTMLInputElement).value,
		).toBe("720");
		expect((screen.getByLabelText("Rank Tier") as HTMLInputElement).value).toBe(
			"Top 500",
		);
		expect(
			screen.getByRole("button", { name: "Save VOD Metadata" }),
		).toBeDefined();

		// Act: Cancel button
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(onCancel).toHaveBeenCalled();
	});

	it("validates required text fields before submitting", () => {
		// Arrange
		const onSave = vi.fn();
		const { container } = render(<VodMetadataForm isCreate onSave={onSave} />);
		const form = container.querySelector("form");
		if (!form) throw new Error("Missing form");

		// Act: Title missing
		fireEvent.submit(form);
		expect(screen.getByText("Title is required")).toBeDefined();

		// Act: YouTube ID missing
		fireEvent.change(screen.getByLabelText("VOD Title"), {
			target: { value: "Valid Title" },
		});
		fireEvent.submit(form);
		expect(screen.getByText("YouTube video ID is required")).toBeDefined();

		// Act: Hero Name missing
		fireEvent.change(screen.getByLabelText("YouTube Video ID"), {
			target: { value: "yt_123" },
		});
		fireEvent.submit(form);
		expect(screen.getByText("Hero name is required")).toBeDefined();

		// Act: Map Name missing
		fireEvent.change(screen.getByLabelText("Hero Name"), {
			target: { value: "Ana" },
		});
		fireEvent.submit(form);
		expect(screen.getByText("Map name is required")).toBeDefined();
		expect(onSave).not.toHaveBeenCalled();
	});

	it("validates rank tier and duration bounds before submitting", () => {
		// Arrange
		const onSave = vi.fn();
		const { container } = render(<VodMetadataForm isCreate onSave={onSave} />);
		const form = container.querySelector("form");
		if (!form) throw new Error("Missing form");

		fireEvent.change(screen.getByLabelText("VOD Title"), {
			target: { value: "Valid Title" },
		});
		fireEvent.change(screen.getByLabelText("YouTube Video ID"), {
			target: { value: "yt_123" },
		});
		fireEvent.change(screen.getByLabelText("Hero Name"), {
			target: { value: "Ana" },
		});
		fireEvent.change(screen.getByLabelText("Map Name"), {
			target: { value: "Dorado" },
		});

		// Act: Rank Tier missing
		fireEvent.change(screen.getByLabelText("Rank Tier"), {
			target: { value: "" },
		});
		fireEvent.submit(form);
		expect(screen.getByText("Rank tier is required")).toBeDefined();

		// Act: Duration invalid
		fireEvent.change(screen.getByLabelText("Rank Tier"), {
			target: { value: "Grandmaster" },
		});
		fireEvent.change(screen.getByLabelText("Duration (Seconds)"), {
			target: { value: "-50" },
		});
		fireEvent.submit(form);
		expect(
			screen.getByText("Duration must be a positive number of seconds"),
		).toBeDefined();
		expect(onSave).not.toHaveBeenCalled();
	});

	it("submits valid VOD metadata payload", () => {
		// Arrange
		const onSave = vi.fn();
		const { container } = render(<VodMetadataForm isCreate onSave={onSave} />);

		// Act
		fireEvent.change(screen.getByLabelText("VOD Title"), {
			target: { value: "Grandmaster Ana King's Row" },
		});
		fireEvent.change(screen.getByLabelText("YouTube Video ID"), {
			target: { value: "dQw4w9WgXcQ" },
		});
		fireEvent.change(screen.getByLabelText("Hero Name"), {
			target: { value: "Ana" },
		});
		fireEvent.change(screen.getByLabelText("Role"), {
			target: { value: "SUPPORT" },
		});
		fireEvent.change(screen.getByLabelText("Map Name"), {
			target: { value: "King's Row" },
		});
		fireEvent.change(screen.getByLabelText("Duration (Seconds)"), {
			target: { value: "600" },
		});
		fireEvent.change(screen.getByLabelText("Rank Tier"), {
			target: { value: "Grandmaster" },
		});

		const form = container.querySelector("form");
		if (form) {
			fireEvent.submit(form);
		}

		// Assert
		expect(onSave).toHaveBeenCalledWith({
			durationSeconds: 600,
			heroName: "Ana",
			mapName: "King's Row",
			rankTier: "Grandmaster",
			role: "SUPPORT",
			title: "Grandmaster Ana King's Row",
			youtubeVideoId: "dQw4w9WgXcQ",
		});
	});
});
