import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getVodManifest } from "@/shared/db";
import { VodSessionPage } from "../vod-session-page";

vi.mock("next/server");
vi.mock("@/shared/db");

const manifest = {
	scenarios: [],
	title: "GM Ana VOD",
};

const manifestWithScenario = {
	scenarios: [
		{
			id: "scenario-1",
			inputConfig: {
				options: [
					{ id: "option-a", is_correct: true, text: "Take high ground" },
				],
			},
			inputType: "MULTIPLE_CHOICE" as const,
			moduleType: "STRATEGY" as const,
			promptText: "Where should the team position?",
		},
	],
	title: "GM Ana VOD",
};

describe("VodSessionPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the Session Manifest title and active Scenario boundary", async () => {
		// Arrange
		vi.mocked(getVodManifest).mockResolvedValueOnce(
			manifest as unknown as Awaited<ReturnType<typeof getVodManifest>>,
		);

		// Act
		const ui = await VodSessionPage({
			params: Promise.resolve({ id: "vod-1" }),
		});
		render(ui);

		// Assert
		expect(screen.getByText("GM Ana VOD")).toBeDefined();
		expect(screen.getByText("No active Scenarios")).toBeDefined();
		expect(getVodManifest).toHaveBeenCalledWith("vod-1", {
			modules: undefined,
		});
	});

	it("passes selected module filters to the Session Manifest query", async () => {
		// Arrange
		vi.mocked(getVodManifest).mockResolvedValueOnce(
			manifest as unknown as Awaited<ReturnType<typeof getVodManifest>>,
		);

		// Act
		await VodSessionPage({
			params: Promise.resolve({ id: "vod-1" }),
			searchParams: Promise.resolve({
				modules: ["strategy,tactics", "ultimate"],
			}),
		});

		// Assert
		expect(getVodManifest).toHaveBeenCalledWith("vod-1", {
			modules: ["STRATEGY", "TACTICS", "ULTIMATE"],
		});
	});

	it("normalizes persisted option correctness for the Session flow", async () => {
		// Arrange
		vi.mocked(getVodManifest).mockResolvedValueOnce(
			manifestWithScenario as unknown as Awaited<
				ReturnType<typeof getVodManifest>
			>,
		);

		// Act
		const ui = await VodSessionPage({
			params: Promise.resolve({ id: "vod-1" }),
		});
		render(ui);
		fireEvent.keyDown(window, { key: "1" });

		// Assert
		expect(screen.getByText("PASS")).toBeDefined();
	});

	it("renders a not-found response when the Session Manifest is unavailable", async () => {
		// Arrange
		vi.mocked(getVodManifest).mockResolvedValueOnce(null);

		// Act
		const ui = await VodSessionPage({
			params: Promise.resolve({ id: "missing" }),
		});
		render(ui);

		// Assert
		expect(screen.getByText("VOD Not Found")).toBeDefined();
	});
});
