import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { AuthClient, TodosPage } from "./page-objects";

const EXISTING_TITLE = "Shared title";

test("retries a create draft after editing a field following a real duplicate-title failure", async ({
  page,
  baseURL,
}) => {
  // Arrange
  const todosPage = new TodosPage(page);
  await signUpAndVisitTodos(page, baseURL);
  const form = await fillCreateDraft(todosPage);

  // Act
  const body = await todosPage.submitCreate();

  // Assert
  expect(body).toContain("TODO_CREATE_FAILED");
  await expect(form.alert).toHaveText("Todo item could not be created.");
  await expect(form.titleInput).toHaveValue(EXISTING_TITLE);
  await expect(form.submitButton).toBeEnabled();

  // Act
  await retryCreateAfterConflictResolved(todosPage);

  // Assert
  await expect(todosPage.getTodoItemText("Revised draft")).toBeVisible();
});

test("keeps an update draft open after a real constraint failure and allows recovery", async ({
  page,
  baseURL,
}) => {
  // Arrange: another user can create the same title used by the other test.
  const todosPage = new TodosPage(page);
  await signUpAndVisitTodos(page, baseURL);
  const dialog = await prepareUpdateWithConflict(page, todosPage);

  // Act
  const body = await todosPage.submitUpdate();

  // Assert
  expect(body).toContain("INTERNAL_SERVER_ERROR");
  await expect(dialog.alert).toHaveText("Something went wrong.");
  await expect(dialog.titleInput).toHaveValue(EXISTING_TITLE);
  await expect(dialog.submitButton).toBeEnabled();

  // Act
  await retryUpdate(dialog);

  // Assert
  await expect(todosPage.getTodoItemText("Keep this draft")).toBeVisible();
});

async function signUpAndVisitTodos(page: Page, baseURL: string | undefined) {
  const authClient = new AuthClient(page);
  const response = await authClient.signUp({
    baseURL,
    email: `todo-errors-${globalThis.crypto.randomUUID()}@example.com`,
    name: "Todo error test",
    password: "todo-errors-test-password",
  });
  if (!response.ok()) {
    throw new Error(`Test user registration failed (${response.status()})`);
  }
  const todosPage = new TodosPage(page);
  await todosPage.goto();
}

async function fillCreateDraft(todosPage: TodosPage) {
  await todosPage.createTodo(EXISTING_TITLE);
  await todosPage.fillCreateDraft(EXISTING_TITLE, "Keep this draft");
  return todosPage.createForm;
}

async function retryCreateAfterConflictResolved(todosPage: TodosPage) {
  await todosPage.deleteTodo(EXISTING_TITLE);
  await todosPage.createForm.descriptionInput.fill("Revised draft");
  await todosPage.createForm.submitButton.click();
}

async function prepareUpdateWithConflict(page: Page, todosPage: TodosPage) {
  await todosPage.createTodo("Editable todo");
  await todosPage.openUpdateDialog();
  await createConflictInAnotherPage(page);
  await todosPage.fillUpdateDraft(EXISTING_TITLE, "Keep this draft");
  return todosPage.updateDialog;
}

async function createConflictInAnotherPage(page: Page) {
  const otherPage = await page.context().newPage();
  const otherTodosPage = new TodosPage(otherPage);
  await otherTodosPage.goto();
  await otherTodosPage.createTodo(EXISTING_TITLE);
  await otherPage.close();
}

async function retryUpdate(dialog: TodosPage["updateDialog"]) {
  await dialog.titleInput.fill("Recovered todo");
  await dialog.submitButton.click();
}
