import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { useDeleteTodo } from "@/pages/todos/api/use-delete-todo";
import { useUpdateTodo } from "@/pages/todos/api/use-update-todo";
import { TodoList } from "@/pages/todos/ui/todo-list";
import { type TEST_TODO, TEST_TODOS } from "@test/vitest/fixtures/todos";

vi.mock(import("@/pages/todos/api/use-delete-todo"));
vi.mock(import("@/pages/todos/api/use-update-todo"));

const [firstTodo, secondTodo] = TEST_TODOS as [typeof TEST_TODO, typeof TEST_TODO];

describe("todo list empty state", () => {
  beforeEach(() => {
    vi.mocked(useDeleteTodo).mockReturnValue({
      isPending: false,
      mutate: vi.fn<() => void>(),
    } as never);
    vi.mocked(useUpdateTodo).mockReturnValue({
      isPending: false,
      mutate: vi.fn<() => void>(),
    } as never);
  });

  it("renders empty state message when todos is empty", () => {
    expect.assertions(1);

    // Arrange & Act
    render(<TodoList todos={[]} />);

    // Assert
    expect(screen.getByText("No todos found")).toBeDefined();
  });
});

describe("todo list items rendering in table", () => {
  beforeEach(() => {
    vi.mocked(useDeleteTodo).mockReturnValue({
      isPending: false,
      mutate: vi.fn<() => void>(),
    } as never);
    vi.mocked(useUpdateTodo).mockReturnValue({
      isPending: false,
      mutate: vi.fn<() => void>(),
    } as never);
  });

  it("renders table and column headers", () => {
    expect.assertions(4);

    // Arrange & Act
    render(<TodoList todos={TEST_TODOS} />);

    // Assert
    expect(screen.getByRole("table")).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Title" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Description" })).toBeDefined();
  });

  it("renders todo titles in table", () => {
    expect.assertions(2);

    // Arrange & Act
    render(<TodoList todos={TEST_TODOS} />);

    // Assert
    expect(screen.getByText(firstTodo.title)).toBeDefined();
    expect(screen.getByText(secondTodo.title)).toBeDefined();
  });

  it("sorts todos in both directions from the title heading", async () => {
    expect.assertions(2);

    // Arrange
    const user = userEvent.setup();
    render(<TodoList todos={[secondTodo, firstTodo]} />);

    // Act
    await user.click(screen.getByRole("button", { name: "Title" }));
    const ascending = screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("cell")[1]?.textContent);
    await user.click(screen.getByRole("button", { name: "Title" }));
    const descending = screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("cell")[1]?.textContent);

    // Assert
    expect(ascending).toStrictEqual([`${firstTodo.title}Pending`, `${secondTodo.title}Done`]);
    expect(descending).toStrictEqual([`${secondTodo.title}Done`, `${firstTodo.title}Pending`]);
  });

  it("allows toggling todo completed status via checkbox", async () => {
    expect.assertions(1);

    // Arrange
    const user = userEvent.setup();
    const updateMock = vi.fn<() => void>();
    vi.mocked(useUpdateTodo).mockReturnValue({
      isPending: false,
      mutate: updateMock,
    } as never);

    render(<TodoList todos={TEST_TODOS} />);

    // Act
    await user.click(screen.getByRole("checkbox", { name: `Toggle ${firstTodo.title}` }));

    // Assert
    expect(updateMock).toHaveBeenCalledWith({
      data: { completed: true },
      id: firstTodo.id,
    });
  });

  it("renders edit and delete action buttons for each todo", () => {
    expect.assertions(2);

    // Arrange & Act
    render(<TodoList todos={TEST_TODOS} />);

    // Assert
    expect(screen.getAllByRole("button", { name: "Edit todo" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Delete todo" })).toHaveLength(2);
  });

  it("renders a thumbnail image when todo has a non-null imageKey", () => {
    expect.assertions(2);

    // Arrange
    const todoWithImage = {
      ...firstTodo,
      imageKey: "todos/todo-1/thumb.webp",
    };

    // Act
    render(<TodoList todos={[todoWithImage, secondTodo]} />);
    const thumbnail = screen.getByAltText<HTMLImageElement>(firstTodo.title);

    // Assert
    expect(thumbnail.getAttribute("src")).toBe("/api/images/todos/todo-1/thumb.webp");
    expect(screen.queryByAltText(secondTodo.title)).toBeNull();
  });
});
