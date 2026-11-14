import type { Todo } from "@/shared/db";

const TEST_TODO: Todo = {
  completed: false,
  createdAt: new Date("2026-10-14T00:00:00Z"),
  description: "Test Description",
  id: "todo-1",
  imageKey: null,
  title: "Test Todo",
  updatedAt: new Date("2026-10-14T00:00:00Z"),
  userId: "user-1",
};

function createTodoFixture(overrides: Partial<Todo> = {}): Todo {
  return { ...TEST_TODO, ...overrides };
}

const TEST_UPDATED_TODO: Todo = createTodoFixture({ title: "Updated title" });
const TEST_TOGGLED_TODO: Todo = createTodoFixture({ completed: true });

const TEST_TODOS: Todo[] = [
  createTodoFixture({
    description: "First Description",
    id: "todo-1",
    title: "First Todo",
  }),
  createTodoFixture({
    completed: true,
    description: null,
    id: "todo-2",
    title: "Second Todo",
  }),
];

export { TEST_TODO, TEST_TODOS, TEST_TOGGLED_TODO, TEST_UPDATED_TODO, createTodoFixture };
