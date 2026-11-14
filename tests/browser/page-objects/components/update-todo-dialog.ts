import type { Locator, Page } from "@playwright/test";

class UpdateTodoDialog {
  public readonly dialog: Locator;
  public readonly titleInput: Locator;
  public readonly descriptionInput: Locator;
  public readonly submitButton: Locator;
  public readonly alert: Locator;

  public constructor(page: Page) {
    this.dialog = page.getByRole("dialog", { name: "Update Todo Item?" });
    this.titleInput = this.dialog.getByRole("textbox", { exact: true, name: "Title" });
    this.descriptionInput = this.dialog.getByRole("textbox", { name: "Description" });
    this.submitButton = this.dialog.getByRole("button", { exact: true, name: "Update" });
    this.alert = this.dialog.getByRole("alert");
  }

  public async fill(title: string, description?: string) {
    await this.titleInput.fill(title);
    if (typeof description === "string") {
      await this.descriptionInput.fill(description);
    }
  }
}

export { UpdateTodoDialog };
