import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { scenarios } from "@/shared/db";
import {
	useScenarioFormHandlers,
	useScenarioFormInit,
} from "../use-scenario-form";

function useTestScenarioForm(
	scenario: typeof scenarios.$inferSelect | null,
	vod: { durationSeconds: number; id: string },
	onSave: (payload: unknown) => void,
) {
	const init = useScenarioFormInit(scenario);
	const handlers = useScenarioFormHandlers(
		init,
		vod,
		scenario,
		onSave as never,
	);
	return { handlers, init };
}

describe("use-scenario-form hooks", () => {
	const defaultVod = {
		durationSeconds: 600,
		id: "vod_1",
	};

	const mockScenario: typeof scenarios.$inferSelect = {
		explanationText: "Use high ground",
		id: "scen_1",
		imageUrl: "https://example.com/image.png",
		inputConfig: { options: [] },
		inputType: "MULTIPLE_CHOICE",
		moduleType: "STRATEGY",
		promptText: "Positioning choice",
		timeLimitSeconds: 15,
		timestampSeconds: 50,
		vodId: "vod_1",
	};

	it("initializes state from scenario and resets when scenario becomes null", () => {
		// Arrange & Act
		const { rerender, result } = renderHook(
			({ scenario }) => useScenarioFormInit(scenario),
			{
				initialProps: {
					scenario: mockScenario as typeof scenarios.$inferSelect | null,
				},
			},
		);

		// Assert
		expect(result.current.promptText).toBe("Positioning choice");
		expect(result.current.explanationText).toBe("Use high ground");
		expect(result.current.timestampSeconds).toBe(50);
		expect(result.current.timeLimitSeconds).toBe(15);
		expect(result.current.imageUrl).toBe("https://example.com/image.png");

		// Act: update with null scenario
		rerender({ scenario: null });

		// Assert
		expect(result.current.promptText).toBe("");
		expect(result.current.explanationText).toBe("");
		expect(result.current.timestampSeconds).toBe(0);
		expect(result.current.timeLimitSeconds).toBe("");

		// Act: update with scenario that has null optional fields
		rerender({
			scenario: {
				...mockScenario,
				imageUrl: null,
				inputConfig: null as never,
				timeLimitSeconds: null,
			},
		});
		expect(result.current.imageUrl).toBe("");
		expect(result.current.timeLimitSeconds).toBe("");
		expect(result.current.inputConfig).toEqual({});
	});

	it("handles form change handlers and submission via useScenarioFormHandlers", () => {
		// Arrange
		const onSave = vi.fn();
		const { result } = renderHook(() =>
			useTestScenarioForm(null, defaultVod, onSave),
		);

		// Act: changes
		act(() => {
			result.current.handlers.handlePromptChange({
				target: { value: "New prompt text" },
			} as never);
			result.current.handlers.handleExplanationChange({
				target: { value: "New explanation text" },
			} as never);
			result.current.handlers.handleTimestampChange({
				target: { value: "60" },
			} as never);
			result.current.handlers.handleTimeLimitChange({
				target: { value: "20" },
			} as never);
			result.current.handlers.handleModuleTypeChange({
				target: { value: "TACTICS" },
			} as never);
			result.current.handlers.handleInputTypeChange({
				target: { value: "PERCENT_SLIDER" },
			} as never);
			result.current.handlers.handleImageUrlChange({
				target: { value: "https://example.com/pic.png" },
			} as never);
		});

		// Act: submit
		act(() => {
			result.current.handlers.handleSubmit({
				preventDefault: vi.fn(),
			} as never);
		});

		// Assert
		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				explanationText: "New explanation text",
				imageUrl: "https://example.com/pic.png",
				inputType: "PERCENT_SLIDER",
				moduleType: "TACTICS",
				promptText: "New prompt text",
				timeLimitSeconds: 20,
				timestampSeconds: 60,
				vodId: "vod_1",
			}),
		);
	});
});
