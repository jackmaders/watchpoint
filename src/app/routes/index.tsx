import { createFileRoute, redirect } from "@tanstack/react-router";

import { HomePage } from "@/pages/home";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    if (context.session) {
      throw redirect({ to: "/todos" });
    }
  },
  component: HomePage,
});
