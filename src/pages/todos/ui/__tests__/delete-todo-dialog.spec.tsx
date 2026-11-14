import { act, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { getRouter } from "@/app/router";
import { toast } from "@/shared/ui/shadcn/toast";
import { TEST_TODO } from "@test/vitest/fixtures/todos";
import { createDeferred } from "@test/vitest/helpers/deferred";
import { renderWithProviders } from "@test/vitest/wrappers/testing-wrapper";

import { deleteTodoFn } from "../../api/todos.functions";
import { DeleteTodoDialog } from "../delete-todo-dialog";

vi.mock(import("../../api/todos.functions"));
vi.mock(import("@/shared/ui/shadcn/toast"));

beforeEach(() => {
  vi.mocked(deleteTodoFn).mockReset().mockResolvedValue(TEST_TODO);
});

describe("delete todo dialog", () => {
  it("opens confirmation from its trigger", async () => {
    expect.assertions(1);

    // Arrange
    const { user } = renderWithProviders(<DeleteTodoDialog todo={TEST_TODO} />, {
      queryClient: getRouter().options.context.queryClient,
    });

    // Act
    await user.click(screen.getByRole("button", { name: "Delete Item" }));

    // Assert
    expect(screen.getByRole("heading", { name: "Delete Todo Item?" })).toBeDefined();
  });

  it("deletes the selected todo and closes confirmation after success", async () => {
    expect.hasAssertions();

    // Arrange
    const { user } = renderWithProviders(<DeleteTodoDialog todo={TEST_TODO} />, {
      queryClient: getRouter().options.context.queryClient,
    });
    await user.click(screen.getByRole("button", { name: "Delete Item" }));

    // Act
    await user.click(screen.getByRole("button", { name: "Delete Todo" }));

    // Assert
    expect(deleteTodoFn).toHaveBeenCalledWith({ data: { id: TEST_TODO.id } });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("disables confirmation while deletion is pending", async () => {
    expect.hasAssertions();

    // Arrange
    const deferred = createDeferred<typeof TEST_TODO>();
    vi.mocked(deleteTodoFn).mockReturnValueOnce(deferred.promise);
    const { user } = renderWithProviders(<DeleteTodoDialog todo={TEST_TODO} />, {
      queryClient: getRouter().options.context.queryClient,
    });
    await user.click(screen.getByRole("button", { name: "Delete Item" }));

    // Act
    await user.click(screen.getByRole("button", { name: "Delete Todo" }));
    const pendingDisabled = screen.getByRole<HTMLButtonElement>("button", {
      name: "Deleting...",
    }).disabled;
    await act(async () => {
      deferred.resolve(TEST_TODO);
      await deferred.promise;
    });

    // Assert
    expect(pendingDisabled).toBe(true);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("keeps confirmation open with feedback until a retry succeeds", async () => {
    expect.hasAssertions();

    // Arrange
    vi.mocked(deleteTodoFn).mockRejectedValueOnce(new Error("Network unavailable"));
    const { user } = renderWithProviders(<DeleteTodoDialog todo={TEST_TODO} />, {
      queryClient: getRouter().options.context.queryClient,
    });
    await user.click(screen.getByRole("button", { name: "Delete Item" }));

    // Act: first attempt fails
    await user.click(screen.getByRole("button", { name: "Delete Todo" }));
    const feedback = await screen.findByRole("alert");
    const failure = {
      dialogOpen: Boolean(screen.queryByRole("dialog")),
      message: feedback.textContent,
    };

    // Act: retry succeeds
    await user.click(screen.getByRole("button", { name: "Delete Todo" }));

    // Assert
    expect(failure).toStrictEqual({ dialogOpen: true, message: "Network unavailable" });
    expect(toast.add).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(deleteTodoFn).toHaveBeenCalledTimes(2);
  });

  it("clears previous feedback when confirmation is reopened", async () => {
    expect.assertions(2);

    // Arrange
    vi.mocked(deleteTodoFn).mockRejectedValueOnce(new Error("Network unavailable"));
    const { user } = renderWithProviders(<DeleteTodoDialog todo={TEST_TODO} />, {
      queryClient: getRouter().options.context.queryClient,
    });
    await user.click(screen.getByRole("button", { name: "Delete Item" }));
    await user.click(screen.getByRole("button", { name: "Delete Todo" }));
    const previousError = await screen.findByRole("alert");
    const previousMessage = previousError.textContent;

    // Act
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Delete Item" }));

    // Assert
    expect(previousMessage).toBe("Network unavailable");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
