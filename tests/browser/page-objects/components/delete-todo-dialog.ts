import type { Locator, Page } from "@playwright/test";

class DeleteTodoDialog {
  public readonly dialog: Locator;
  public readonly confirmButton: Locator;

  public constructor(page: Page) {
    this.dialog = page.getByRole("dialog", { name: "Delete Todo Item?" });
    this.confirmButton = this.dialog.getByRole("button", { exact: true, name: "Delete Todo" });
  }
}

export { DeleteTodoDialog };
