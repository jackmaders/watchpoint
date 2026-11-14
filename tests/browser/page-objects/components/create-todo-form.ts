import type { Locator, Page } from "@playwright/test";

class CreateTodoForm {
  public readonly form: Locator;
  public readonly titleInput: Locator;
  public readonly descriptionInput: Locator;
  public readonly submitButton: Locator;
  public readonly alert: Locator;

  public constructor(page: Page) {
    this.form = page.getByRole("form", { name: "Create a todo" });
    this.titleInput = this.form.getByRole("textbox", { exact: true, name: "Title" });
    this.descriptionInput = this.form.getByRole("textbox", { name: "Description" });
    this.submitButton = this.form.getByRole("button", { name: "Add Todo" });
    this.alert = this.form.getByRole("alert");
  }

  public async fill(title: string, description?: string) {
    await this.titleInput.fill(title);
    if (typeof description === "string") {
      await this.descriptionInput.fill(description);
    }
  }
}

export { CreateTodoForm };
