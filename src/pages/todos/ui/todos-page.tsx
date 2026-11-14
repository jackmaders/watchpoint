import { useSuspenseQuery } from "@tanstack/react-query";

import { todosQueryOptions } from "../api/todo-query-options";
import { CreateTodoForm } from "./create-todo-form";
import { TodoList } from "./todo-list";

function TodosPage() {
  const { data: todos } = useSuspenseQuery(todosQueryOptions());

  return (
    <div className="container mx-auto flex flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Todos</h1>
        <p className="text-sm text-muted-foreground">Manage your personal todo items</p>
      </div>

      <section aria-labelledby="create-todo-heading" className="flex flex-col gap-3">
        <h2 id="create-todo-heading" className="text-lg font-semibold">
          Create a todo
        </h2>
        <CreateTodoForm aria-label="Create a todo" />
      </section>

      <section aria-labelledby="todo-list-heading" className="flex flex-col gap-3">
        <h2 id="todo-list-heading" className="text-lg font-semibold">
          Your todos
        </h2>
        <TodoList todos={todos} />
      </section>
    </div>
  );
}

export { TodosPage };
