import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import { createVodFixture, TEST_VOD } from "@test/vitest/fixtures/vods";

import { VodCard } from "../vod-card";

describe("vod card", () => {
  it("renders thumbnail and title link to the VOD detail route", () => {
    expect.assertions(4);

    // Arrange
    const vod = TEST_VOD;

    // Act
    render(<VodCard vod={vod} />);
    const thumbnail = screen.getByRole("img", { name: vod.title });
    const heading = screen.getByRole("heading", { level: 2, name: vod.title });
    const link = screen.getByRole("link", { name: vod.title });

    // Assert
    expect(thumbnail.getAttribute("src")).toBe(
      `https://i.ytimg.com/vi/${vod.youtubeVideoId}/hqdefault.jpg`,
    );
    expect(thumbnail.getAttribute("loading")).toBe("lazy");
    expect(heading).toBeDefined();
    expect(link.getAttribute("href")).toBe(`/vods/${vod.id}`);
  });

  it("renders tier, checkpoint count, hero role map, and covered skill category badges", () => {
    expect.assertions(4);

    // Arrange
    const vod = TEST_VOD;

    // Act
    render(<VodCard vod={vod} />);
    const renderedSkills = vod.skillCategories.map(
      (category) => screen.getByText(category).textContent,
    );

    // Assert
    expect(screen.getByText("OWCS")).toBeDefined();
    expect(screen.getByText("4 Checkpoints")).toBeDefined();
    expect(screen.getByText("Ana (Support) · King's Row")).toBeDefined();
    expect(renderedSkills).toStrictEqual(["Strategy", "Tactics", "Awareness", "Tracking"]);
  });

  it("renders singular Checkpoint label when checkpointCount is 1", () => {
    expect.assertions(1);

    // Arrange
    const vod = createVodFixture({ checkpointCount: 1 });

    // Act
    render(<VodCard vod={vod} />);

    // Assert
    expect(screen.getByText("1 Checkpoint")).toBeDefined();
  });

  it("omits skill badges when skillCategories is empty", () => {
    expect.assertions(5);

    // Arrange
    const vod = createVodFixture({ checkpointCount: 0, skillCategories: [] });

    // Act
    render(<VodCard vod={vod} />);

    // Assert
    expect(screen.getByText("0 Checkpoints")).toBeDefined();
    expect(screen.queryByText("Strategy")).toBeNull();
    expect(screen.queryByText("Tactics")).toBeNull();
    expect(screen.queryByText("Awareness")).toBeNull();
    expect(screen.queryByText("Tracking")).toBeNull();
  });

  it("merges className and forwards remaining card props", () => {
    expect.assertions(1);

    // Arrange
    const vod = TEST_VOD;

    // Act
    render(<VodCard className="border-primary" title="Featured VOD" vod={vod} />);
    const card = screen.getByTitle("Featured VOD");

    // Assert
    expect(card.className).toContain("border-primary");
  });
});
