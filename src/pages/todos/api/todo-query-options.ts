import { queryOptions } from "@tanstack/react-query";

import { getTodosFn } from "./todos.functions";

const todoKeys = {
  all: ["todos"] as const,
  list: () => [...todoKeys.all, "list"] as const,
};

function todosQueryOptions() {
  return queryOptions({
    queryFn: getTodosFn,
    queryKey: todoKeys.list(),
  });
}

export { todoKeys, todosQueryOptions };
