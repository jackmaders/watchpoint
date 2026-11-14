import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";

import {
  normalizeVodFilters,
  parseVodCatalogueSearch,
  VOD_SORT_OPTIONS,
  vodsQueryInputSchema,
} from "../vod-catalogue";

const SEARCH_PARAM_KEY = "q";

describe("vod catalogue search and query schemas", () => {
  it("exposes supported sort options with Curated first", () => {
    expect.assertions(1);

    // Assert
    expect(VOD_SORT_OPTIONS).toStrictEqual(["Curated", "Map A–Z", "Hero A–Z", "Most Checkpoints"]);
  });

  it("parses valid URL search parameters and trims q and map", () => {
    expect.assertions(1);

    // Arrange
    const rawSearch = {
      map: "  King's Row  ",
      [SEARCH_PARAM_KEY]: "  Ana  ",
      role: "Support",
      sort: "Hero A–Z",
      tier: "OWCS",
    };

    // Act
    const result = parseVodCatalogueSearch(rawSearch);

    // Assert
    expect(result).toStrictEqual({
      map: "King's Row",
      [SEARCH_PARAM_KEY]: "Ana",
      role: "Support",
      sort: "Hero A–Z",
      tier: "OWCS",
    });
  });

  it("drops blank search strings, invalid enum values, and default Curated sort in URL search parsing", () => {
    expect.assertions(2);

    // Arrange
    const invalidSearch = {
      map: "   ",
      [SEARCH_PARAM_KEY]: "",
      role: "Flex",
      sort: "Curated",
      tier: "Bronze",
    };

    // Act
    const parsedInvalid = parseVodCatalogueSearch(invalidSearch);
    const parsedTypes = parseVodCatalogueSearch({
      map: 123,
      [SEARCH_PARAM_KEY]: null,
      sort: "Unknown",
    });

    // Assert
    expect(parsedInvalid).toStrictEqual({});
    expect(parsedTypes).toStrictEqual({});
  });

  it("normalizes filters by omitting empty values and default Curated sort", () => {
    expect.assertions(3);

    // Act
    const emptyDefault = normalizeVodFilters();
    const withDefaultSort = normalizeVodFilters({ [SEARCH_PARAM_KEY]: "  ", sort: "Curated" });
    const withValues = normalizeVodFilters({
      map: "Lijiang Tower",
      [SEARCH_PARAM_KEY]: "Winston",
      role: "Tank",
      sort: "Most Checkpoints",
      tier: "Ranked GM",
    });

    // Assert
    expect(emptyDefault).toStrictEqual({});
    expect(withDefaultSort).toStrictEqual({});
    expect(withValues).toStrictEqual({
      map: "Lijiang Tower",
      [SEARCH_PARAM_KEY]: "Winston",
      role: "Tank",
      sort: "Most Checkpoints",
      tier: "Ranked GM",
    });
  });

  it("accepts empty or valid filters in vodsQueryInputSchema and rejects invalid values", () => {
    expect.assertions(5);

    // Arrange
    const omittedInput: unknown[] = [];

    // Act
    const emptyResult = vodsQueryInputSchema.parse(omittedInput.at(0));
    const blankTextResult = vodsQueryInputSchema.parse({
      map: "   ",
      [SEARCH_PARAM_KEY]: "  ",
    });
    const validResult = vodsQueryInputSchema.parse({
      [SEARCH_PARAM_KEY]: "  Tracer  ",
      role: "Damage",
      sort: "Map A–Z",
      tier: "FACEIT",
    });

    // Assert
    expect(emptyResult).toBeUndefined();
    expect(blankTextResult).toStrictEqual({});
    expect(validResult).toStrictEqual({
      [SEARCH_PARAM_KEY]: "Tracer",
      role: "Damage",
      sort: "Map A–Z",
      tier: "FACEIT",
    });
    expect(() => vodsQueryInputSchema.parse({ role: "InvalidRole" })).toThrow(z.ZodError);
    expect(() => vodsQueryInputSchema.parse({ sort: "InvalidSort" })).toThrow(z.ZodError);
  });
});
