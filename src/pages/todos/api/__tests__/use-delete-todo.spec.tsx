import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { createTodoFixture } from "@test/vitest/fixtures/todos";
import { createTestingWrapper } from "@test/vitest/wrappers/testing-wrapper";

import { todoKeys } from "../todo-query-options";
import { deleteTodoFn } from "../todos.functions";
import { useDeleteTodo } from "../use-delete-todo";

vi.mock(import("../todos.functions"));

const MOCK_TODO = createTodoFixture();

describe("useDeleteTodo mutation hook", () => {
  it("invokes deleteTodoFn and invalidates queries on success", async () => {
    expect.hasAssertions();

    // Arrange
    vi.mocked(deleteTodoFn).mockResolvedValueOnce(MOCK_TODO);
    const { wrapper, queryClient } = createTestingWrapper();

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useDeleteTodo(), { wrapper });

    // Act
    await result.current.mutateAsync({ id: "todo-1" });

    // Assert
    expect(deleteTodoFn).toHaveBeenCalledWith({ data: { id: "todo-1" } });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: todoKeys.all });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it("calls custom onSuccess callback when provided", async () => {
    expect.assertions(1);

    // Arrange
    vi.mocked(deleteTodoFn).mockResolvedValueOnce(MOCK_TODO);
    const onSuccess = vi.fn<() => void>();
    const { wrapper } = createTestingWrapper();
    const { result } = renderHook(() => useDeleteTodo({ onSuccess }), { wrapper });

    // Act
    await result.current.mutateAsync({ id: "todo-1" });

    // Assert
    expect(onSuccess).toHaveBeenCalledOnce();
  });
});
