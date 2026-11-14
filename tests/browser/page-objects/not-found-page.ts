import type { Locator, Page } from "@playwright/test";

class NotFoundPage {
  public readonly heading: Locator;
  public readonly message: Locator;
  public readonly returnHomeLink: Locator;

  public constructor(page: Page) {
    const main = page.getByRole("main");
    this.heading = main.getByRole("heading", { level: 1, name: "Page Not Found" });
    this.message = main.getByText("The page you are looking for does not exist or has been moved.");
    this.returnHomeLink = main.getByRole("link", { name: "Return Home" });
  }
}

export { NotFoundPage };
