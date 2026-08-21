import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { HeroRole, vods } from "@/shared/db";
import { useVodMetadataFormState } from "../use-vod-metadata-form";

describe("useVodMetadataFormState hook", () => {
	const mockVod: typeof vods.$inferSelect = {
		createdAt: new Date("2026-01-01"),
		durationSeconds: 700,
		heroName: "Winston",
		id: "vod_win",
		isPublished: false,
		mapName: "Dorado",
		rankTier: "Top 500",
		role: "TANK" as HeroRole,
		title: "Winston Top 500",
		youtubeVideoId: "yt_win",
	};

	it("initializes state from vod prop and updates fields via handlers", () => {
		// Arrange
		const onSave = vi.fn();
		const { rerender, result } = renderHook(
			({ vod }) => useVodMetadataFormState(vod, onSave),
			{ initialProps: { vod: mockVod } },
		);

		// Assert
		expect(result.current.title).toBe("Winston Top 500");
		expect(result.current.heroName).toBe("Winston");
		expect(result.current.role).toBe("TANK");
		expect(result.current.mapName).toBe("Dorado");
		expect(result.current.durationSeconds).toBe(700);

		// Act: rerender with updated vod prop
		rerender({
			vod: {
				...mockVod,
				durationSeconds: 900,
				heroName: "Reinhardt",
				title: "Reinhardt Guide",
			},
		});
		expect(result.current.title).toBe("Reinhardt Guide");
		expect(result.current.heroName).toBe("Reinhardt");
		expect(result.current.durationSeconds).toBe(900);

		// Act: update fields
		act(() => {
			result.current.handleTitleChange({
				target: { value: "Updated Title" },
			} as never);
			result.current.handleYoutubeChange({
				target: { value: "yt_new" },
			} as never);
			result.current.handleHeroChange({
				target: { value: "D.Va" },
			} as never);
			result.current.handleRoleChange({
				target: { value: "TANK" },
			} as never);
			result.current.handleMapChange({
				target: { value: "Oasis" },
			} as never);
			result.current.handleDurationChange({
				target: { value: "850" },
			} as never);
			result.current.handleRankChange({
				target: { value: "Grandmaster" },
			} as never);
		});

		// Act: submit
		act(() => {
			result.current.handleSubmit({ preventDefault: vi.fn() } as never);
		});

		// Assert
		expect(onSave).toHaveBeenCalledWith({
			durationSeconds: 850,
			heroName: "D.Va",
			mapName: "Oasis",
			rankTier: "Grandmaster",
			role: "TANK",
			title: "Updated Title",
			youtubeVideoId: "yt_new",
		});
	});
});
