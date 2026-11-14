import { describe, expect, it, vi } from "vite-plus/test";

import { TEST_TODO } from "@test/vitest/fixtures/todos";

import { todoKeys, todosQueryOptions } from "../todo-query-options";
import { getTodosFn } from "../todos.functions";

vi.mock(import("../todos.functions"));

describe("todo query options", () => {
  it("constructs expected hierarchical query keys", () => {
    expect.assertions(2);

    expect(todoKeys.all).toStrictEqual(["todos"]);
    expect(todoKeys.list()).toStrictEqual(["todos", "list"]);
  });

  it("builds todosQueryOptions with lists queryKey and delegates to getTodosFn", async () => {
    expect.assertions(3);

    // Arrange
    vi.mocked(getTodosFn).mockResolvedValueOnce([TEST_TODO]);
    const options = todosQueryOptions();

    // Act
    const result = await options.queryFn?.({} as never);

    // Assert
    expect(options.queryKey).toStrictEqual(["todos", "list"]);
    expect(getTodosFn).toHaveBeenCalledOnce();
    expect(result).toStrictEqual([TEST_TODO]);
  });
});
