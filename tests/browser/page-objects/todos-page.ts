import { expect, type Locator, type Page } from "@playwright/test";

import { CreateTodoForm, DeleteTodoDialog, UpdateTodoDialog } from "./components";
import { waitForHydration } from "./hydration";

class TodosPage {
  public readonly createForm: CreateTodoForm;
  public readonly updateDialog: UpdateTodoDialog;
  public readonly deleteDialog: DeleteTodoDialog;
  public readonly todoListRegion: Locator;

  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
    this.createForm = new CreateTodoForm(page);
    this.updateDialog = new UpdateTodoDialog(page);
    this.deleteDialog = new DeleteTodoDialog(page);
    this.todoListRegion = page.getByRole("region", { name: "Your todos" });
  }

  public async goto() {
    await this.page.goto("/todos");
    await waitForHydration(this.page);
  }

  public async createTodo(title: string, description?: string) {
    await this.createForm.fill(title, description);
    await this.submitCreate();
    await this.getTodoItemCheckbox(title).waitFor({ state: "visible" });
  }

  public async fillCreateDraft(title: string, description?: string) {
    await this.createForm.fill(title, description);
  }

  public async submitCreate() {
    return await this.submitWrite(this.createForm.submitButton);
  }

  public async openUpdateDialog() {
    await this.page.getByRole("button", { name: "Edit todo" }).click();
    await expect(this.updateDialog.dialog).toBeVisible();
  }

  public async fillUpdateDraft(title: string, description?: string) {
    await this.updateDialog.fill(title, description);
  }

  public async submitUpdate() {
    return await this.submitWrite(this.updateDialog.submitButton);
  }

  public async deleteTodo(title: string) {
    await this.page.getByRole("button", { name: "Delete todo" }).click();
    await this.deleteDialog.confirmButton.click();
    await this.deleteDialog.dialog.waitFor({ state: "hidden" });
    await this.getTodoItemCheckbox(title).waitFor({ state: "hidden" });
  }

  public getTodoItemCheckbox(title: string): Locator {
    return this.page.getByRole("checkbox", {
      exact: true,
      name: `Toggle ${title}`,
    });
  }

  public getTodoItemText(text: string): Locator {
    return this.todoListRegion.getByText(text, { exact: true });
  }

  private async submitWrite(button: Locator): Promise<string> {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/_serverFn/") && response.request().method() === "POST",
    );
    await button.click();
    const response = await responsePromise;
    return await response.text();
  }
}

export { TodosPage };
