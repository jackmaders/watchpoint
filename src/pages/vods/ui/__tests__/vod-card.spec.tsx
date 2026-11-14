import { screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import { createVodFixture, TEST_VOD } from "@test/vitest/fixtures/vods";
import { renderWithProviders } from "@test/vitest/wrappers/testing-wrapper";

import { VodCard } from "../vod-card";

describe("vod card", () => {
  it("renders thumbnail and title link to the VOD detail route", () => {
    expect.assertions(4);

    // Arrange
    const vod = TEST_VOD;

    // Act
    renderWithProviders(<VodCard vod={vod} />);
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

  it("extends the title link hit area across the relative card container", () => {
    expect.assertions(3);

    // Arrange
    const vod = TEST_VOD;

    // Act
    renderWithProviders(<VodCard title={vod.title} vod={vod} />);
    const card = screen.getByTitle(vod.title);
    const link = screen.getByRole("link", { name: vod.title });

    // Assert
    expect(card.className).toContain("relative");
    expect(link.className).toContain("after:absolute");
    expect(link.className).toContain("after:inset-0");
  });

  it("renders tier, checkpoint count, hero role map, and covered skill category badges", () => {
    expect.assertions(4);

    // Arrange
    const vod = TEST_VOD;

    // Act
    renderWithProviders(<VodCard vod={vod} />);
    const tierBadge = screen.getByText("OWCS");
    const checkpointLabel = screen.getByText("4 Checkpoints");
    const subtitle = screen.getByText("Ana (Support) · King's Row");
    const renderedSkills = vod.skillCategories.map(
      (category) => screen.getByText(category).textContent,
    );

    // Assert
    expect(tierBadge).toBeDefined();
    expect(checkpointLabel).toBeDefined();
    expect(subtitle).toBeDefined();
    expect(renderedSkills).toStrictEqual(["Strategy", "Tactics", "Awareness", "Tracking"]);
  });

  it("renders singular Checkpoint label when checkpointCount is 1", () => {
    expect.assertions(1);

    // Arrange
    const vod = createVodFixture({ checkpointCount: 1 });

    // Act
    renderWithProviders(<VodCard vod={vod} />);
    const checkpointLabel = screen.getByText("1 Checkpoint");

    // Assert
    expect(checkpointLabel).toBeDefined();
  });

  it("omits skill badges when skillCategories is empty", () => {
    expect.assertions(5);

    // Arrange
    const vod = createVodFixture({ checkpointCount: 0, skillCategories: [] });

    // Act
    renderWithProviders(<VodCard vod={vod} />);
    const checkpointLabel = screen.getByText("0 Checkpoints");
    const strategyBadge = screen.queryByText("Strategy");
    const tacticsBadge = screen.queryByText("Tactics");
    const awarenessBadge = screen.queryByText("Awareness");
    const trackingBadge = screen.queryByText("Tracking");

    // Assert
    expect(checkpointLabel).toBeDefined();
    expect(strategyBadge).toBeNull();
    expect(tacticsBadge).toBeNull();
    expect(awarenessBadge).toBeNull();
    expect(trackingBadge).toBeNull();
  });

  it("merges className and forwards remaining card props", () => {
    expect.assertions(1);

    // Arrange
    const vod = TEST_VOD;

    // Act
    renderWithProviders(<VodCard className="border-primary" title="Featured VOD" vod={vod} />);
    const card = screen.getByTitle("Featured VOD");

    // Assert
    expect(card.className).toContain("border-primary");
  });
});
