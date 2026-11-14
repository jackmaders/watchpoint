import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import type { Todo } from "@/shared/db";

import { todoKeys } from "./todo-query-options";
import type { DeleteTodoInput } from "./todo-schema";
import { deleteTodoFn } from "./todos.functions";

type DeleteTodoMutationOptions = Omit<
  UseMutationOptions<Todo, Error, DeleteTodoInput>,
  "mutationFn"
>;

function useDeleteTodo({ onSuccess, ...options }: DeleteTodoMutationOptions = {}) {
  const queryClient = useQueryClient();
  const deleteTodo = useServerFn(deleteTodoFn);

  return useMutation({
    ...options,
    mutationFn: async (data: DeleteTodoInput) => await deleteTodo({ data }),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: todoKeys.all });
      await onSuccess?.(...args);
    },
  });
}

export { useDeleteTodo };
export type { DeleteTodoMutationOptions };
