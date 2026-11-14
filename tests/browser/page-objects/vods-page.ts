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

  public async goto() {
    await this.page.goto("/vods");
    await waitForHydration(this.page);
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
