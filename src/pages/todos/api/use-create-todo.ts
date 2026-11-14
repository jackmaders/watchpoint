import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import type { Todo } from "@/shared/db";

import { todoKeys } from "./todo-query-options";
import type { CreateTodoInput } from "./todo-schema";
import { createTodoFn } from "./todos.functions";

type CreateTodoMutationOptions = Omit<
  UseMutationOptions<Todo, Error, CreateTodoInput>,
  "mutationFn"
>;

function useCreateTodo({ onSuccess, ...options }: CreateTodoMutationOptions = {}) {
  const queryClient = useQueryClient();
  const createTodo = useServerFn(createTodoFn);

  return useMutation({
    ...options,
    mutationFn: async (data: CreateTodoInput) => await createTodo({ data }),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: todoKeys.all });
      await onSuccess?.(...args);
    },
  });
}

export { useCreateTodo };
export type { CreateTodoMutationOptions };
