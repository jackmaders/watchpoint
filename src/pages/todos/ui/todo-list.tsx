import type { Todo } from "@/shared/db";
import { DataTable } from "@/shared/ui/data-table";

import { todoTableColumns } from "./todo-table-columns";

interface TodoListProps {
  todos: Todo[];
}

function TodoList({ todos }: TodoListProps) {
  return (
    <DataTable
      columns={todoTableColumns}
      data={todos}
      emptyMessage="No todos found"
      filterColumn="title"
      filterPlaceholder="Filter todos..."
      getRowId={(todo) => todo.id}
    />
  );
}

export { TodoList };
export type { TodoListProps };
