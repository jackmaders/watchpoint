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
						youtubeId: "positioning-video",
						durationSeconds: 212,
						isDemo: false,
						isPublished: true,
						createdAt: new Date(0),
						updatedAt: new Date(0),
						questionCount: 3,
						skills: [
							{
								id: "skill-strategy",
								name: "Strategy",
								slug: "strategy",
								createdAt: new Date(0),
								updatedAt: new Date(0),
							},
							{
								id: "skill-tactics",
								name: "Tactics",
								slug: "tactics",
								createdAt: new Date(0),
								updatedAt: new Date(0),
							},
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
