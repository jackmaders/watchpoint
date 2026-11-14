import type { Todo } from "@/shared/db";
import { Checkbox } from "@/shared/ui/shadcn/checkbox";

import { useUpdateTodo } from "../api/use-update-todo";

function TodoCompletionCheckbox({ todo }: { todo: Todo }) {
  const { mutate: updateTodo } = useUpdateTodo();

  return (
    <Checkbox
      aria-label={`Toggle ${todo.title}`}
      checked={todo.completed}
      onCheckedChange={(checked) => {
        updateTodo({ data: { completed: checked }, id: todo.id });
      }}
    />
  );
}

export { TodoCompletionCheckbox };
