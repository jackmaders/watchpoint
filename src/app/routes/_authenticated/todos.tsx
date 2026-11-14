import { createFileRoute } from "@tanstack/react-router";

import { TodosPage, todosQueryOptions } from "@/pages/todos";

const Route = createFileRoute("/_authenticated/todos")({
  loader: async ({ context }) => {
    await context.queryClient.query(todosQueryOptions());
  },
  headers: () => ({ "Cache-Control": "private, no-store" }),
  component: TodosPage,
});

export { Route };
