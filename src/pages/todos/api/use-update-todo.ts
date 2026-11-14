import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import type { Todo } from "@/shared/db";

import { todoKeys } from "./todo-query-options";
import type { UpdateTodoInput } from "./todo-schema";
import { updateTodoFn } from "./todos.functions";

type UpdateTodoMutationOptions = Omit<
  UseMutationOptions<Todo, Error, UpdateTodoInput>,
  "mutationFn"
>;

function useUpdateTodo({ onSuccess, ...options }: UpdateTodoMutationOptions = {}) {
  const queryClient = useQueryClient();
  const updateTodo = useServerFn(updateTodoFn);

  return useMutation({
    ...options,
    mutationFn: async (data: UpdateTodoInput) => await updateTodo({ data }),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: todoKeys.all });
      await onSuccess?.(...args);
    },
  });
}

export { useUpdateTodo };
export type { UpdateTodoMutationOptions };
