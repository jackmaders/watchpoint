import type { Locator, Page } from "@playwright/test";

import { waitForHydration } from "./hydration";

class VodsPage {
  public readonly heading: Locator;
  public readonly vodCards: Locator;
  public readonly headerVodsLink: Locator;
  public readonly headerTodosLink: Locator;

  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("main").getByRole("heading", { level: 1, name: "VOD Catalogue" });
    this.vodCards = page.getByRole("main").getByRole("listitem");
    this.headerVodsLink = page.getByRole("banner").getByRole("link", { name: "VODs" });
    this.headerTodosLink = page.getByRole("banner").getByRole("link", { name: "Todos" });
  }

  public get vodCardLinks(): Locator {
    return this.vodCards.getByRole("link");
  }

  public get searchInput(): Locator {
    return this.page.getByRole("main").getByRole("searchbox", { name: "Search" });
  }

  public get searchButton(): Locator {
    return this.page.getByRole("main").getByRole("button", { name: "Search" });
  }

  public get roleSelect(): Locator {
    return this.page.getByRole("main").getByRole("combobox", { name: "Role" });
  }

  public get tierSelect(): Locator {
    return this.page.getByRole("main").getByRole("combobox", { name: "Competitive Tier" });
  }

  public get mapSelect(): Locator {
    return this.page.getByRole("main").getByRole("combobox", { name: "Map" });
  }

  public get sortSelect(): Locator {
    return this.page.getByRole("main").getByRole("combobox", { name: "Sort" });
  }

  public get emptyStateHeading(): Locator {
    return this.page.getByRole("main").getByText("No matching VODs");
  }

  public get clearFiltersButton(): Locator {
    return this.page.getByRole("main").getByRole("button", { name: "Clear filters" });
  }

  public async goto(search = "") {
    await this.page.goto(`/vods${search}`);
    await waitForHydration(this.page);
  }

  public async reload() {
    await this.page.reload();
    await waitForHydration(this.page);
  }

  public async goBack() {
    await this.page.goBack();
    await waitForHydration(this.page);
  }

  public async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchButton.click();
  }

  public async selectRole(role: string) {
    await this.roleSelect.selectOption(role);
  }

  public async selectTier(tier: string) {
    await this.tierSelect.selectOption(tier);
  }

  public async selectMap(map: string) {
    await this.mapSelect.selectOption(map);
  }

  public async selectSort(sort: string) {
    await this.sortSelect.selectOption(sort);
  }

  public async clearFilters() {
    await this.clearFiltersButton.click();
  }

  public getCard(title: string): Locator {
    return this.vodCards.filter({ has: this.page.getByRole("link", { name: title }) });
  }

  public getCardThumbnail(title: string): Locator {
    return this.getCard(title).getByRole("img", { name: title });
  }

  public getCardLink(title: string): Locator {
    return this.getCard(title).getByRole("link", { name: title });
  }
}

export { VodsPage };
