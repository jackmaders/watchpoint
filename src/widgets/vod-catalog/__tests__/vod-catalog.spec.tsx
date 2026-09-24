import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { VodCatalog } from "../ui/vod-catalog";

describe("VodCatalog", () => {
	test("renders an empty state when there are no published VODs", () => {
		render(<VodCatalog vods={[]} />);

		expect(
			screen.getByText("No published VODs are available yet."),
		).toBeInTheDocument();
	});

	test("renders each VOD with duration, Question count, and unique Skills", () => {
		render(
			<VodCatalog
				vods={[
					{
						id: "vod-positioning",
						title: "Positioning fundamentals",
						durationSeconds: 212,
						questionCount: 3,
						skills: [
							{ id: "skill-strategy", name: "Strategy", slug: "strategy" },
							{ id: "skill-tactics", name: "Tactics", slug: "tactics" },
						],
					},
				]}
			/>,
		);

		expect(screen.getByText("Positioning fundamentals")).toBeInTheDocument();
		expect(screen.getByText("3:32")).toBeInTheDocument();
		expect(screen.getByText("3 Questions")).toBeInTheDocument();
		expect(screen.getByText("Strategy")).toBeInTheDocument();
		expect(screen.getByText("Tactics")).toBeInTheDocument();
	});
});
