import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { createTodoFixture } from "@test/vitest/fixtures/todos";
import { createTestingWrapper } from "@test/vitest/wrappers/testing-wrapper";

import { todoKeys } from "../todo-query-options";
import { createTodoFn } from "../todos.functions";
import { useCreateTodo } from "../use-create-todo";

vi.mock(import("../todos.functions"));

const MOCK_TODO = createTodoFixture();

describe("useCreateTodo mutation hook", () => {
  it("invokes createTodoFn and updates mutation state on success", async () => {
    expect.hasAssertions();

    // Arrange
    vi.mocked(createTodoFn).mockResolvedValueOnce(MOCK_TODO);
    const { queryClient, wrapper } = createTestingWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCreateTodo(), { wrapper });

    // Act
    await result.current.mutateAsync({ title: "Test Todo" });

    // Assert
    expect(createTodoFn).toHaveBeenCalledWith({ data: { title: "Test Todo" } });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: todoKeys.all });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it("calls custom onSuccess callback when provided", async () => {
    expect.assertions(1);

    // Arrange
    vi.mocked(createTodoFn).mockResolvedValueOnce(MOCK_TODO);
    const customOnSuccess = vi.fn<() => void>();
    const { wrapper } = createTestingWrapper();
    const { result } = renderHook(() => useCreateTodo({ onSuccess: customOnSuccess }), { wrapper });

    // Act
    await result.current.mutateAsync({ title: "Test Todo" });

    // Assert
    expect(customOnSuccess).toHaveBeenCalledOnce();
  });
});
