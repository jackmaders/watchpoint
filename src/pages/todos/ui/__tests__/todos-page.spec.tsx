import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { getRouter } from "@/app/router";
import { ApplicationError } from "@/shared/errors";
import { toast, Toaster } from "@/shared/ui/shadcn/toast";
import { createTodoFixture } from "@test/vitest/fixtures/todos";
import { createTestingWrapper } from "@test/vitest/wrappers/testing-wrapper";

import { todosQueryOptions } from "../../api/todo-query-options";
import { deleteTodoFn, getTodosFn, updateTodoFn } from "../../api/todos.functions";
import { TodosPage } from "../todos-page";

vi.mock(import("../../api/todos.functions"));

afterEach(() => {
  toast.close();
});

describe("todos page write recovery", () => {
  it("keeps a failed delete visible until retry succeeds", async () => {
    expect.hasAssertions();

    // Arrange
    vi.mocked(deleteTodoFn)
      .mockRejectedValueOnce(new ApplicationError("TODO_NOT_FOUND"))
      .mockResolvedValueOnce(createTodoFixture());
    vi.mocked(getTodosFn).mockResolvedValue([]);
    const { user } = renderTodosPage();

    // Act
    const failure = await retryFailedDelete(user);

    // Assert
    expect(failure).toStrictEqual({ message: "Todo item not found.", title: "Test Todo" });
    await expect(screen.findByText("No todos found")).resolves.toBeDefined();
    expect(deleteTodoFn).toHaveBeenCalledTimes(2);
  });

  it("shows a failed toggle notification and retains persisted state until retry succeeds", async () => {
    expect.hasAssertions();

    // Arrange
    const completedTodo = createTodoFixture({ completed: true });
    vi.mocked(updateTodoFn)
      .mockRejectedValueOnce(new ApplicationError("TODO_NOT_FOUND"))
      .mockResolvedValueOnce(completedTodo);
    vi.mocked(getTodosFn).mockResolvedValue([completedTodo]);
    const { user } = renderTodosPage();

    // Act
    const failure = await retryFailedToggle(user);

    // Assert
    expect(failure).toStrictEqual({ checked: "false", message: "Todo item not found." });
    await expect(screen.findByText("Done")).resolves.toBeDefined();
    expect(
      screen.getByRole("checkbox", { name: "Toggle Test Todo" }).getAttribute("aria-checked"),
    ).toBe("true");
  });
});

function renderTodosPage() {
  const user = userEvent.setup();
  const { queryClient } = getRouter().options.context;
  queryClient.setQueryDefaults(todosQueryOptions().queryKey, { staleTime: Infinity });
  queryClient.setQueryData(todosQueryOptions().queryKey, [createTodoFixture()]);
  const { wrapper } = createTestingWrapper({ queryClient });
  render(
    <>
      <TodosPage />
      <Toaster />
    </>,
    { wrapper },
  );
  return { user };
}

async function retryFailedDelete(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Delete todo" }));
  await user.click(screen.getByRole("button", { name: "Delete Todo" }));
  const error = await screen.findByRole("alert");
  const failure = { message: error.textContent, title: screen.getByText("Test Todo").textContent };
  await user.click(screen.getByRole("button", { name: "Delete Todo" }));
  return failure;
}

async function retryFailedToggle(user: ReturnType<typeof userEvent.setup>) {
  const toggle = screen.getByRole("checkbox", { name: "Toggle Test Todo" });
  await user.click(toggle);
  const notification = await screen.findByRole("dialog", { name: "Todo item not found." });
  const failure = {
    checked: toggle.getAttribute("aria-checked"),
    message: notification.textContent,
  };
  await user.click(toggle);
  return failure;
}
