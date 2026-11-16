import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { HomePage } from "@/pages/home";
import { getInternalReturnTo } from "@/shared/auth";

export const Route = createFileRoute("/")({
  validateSearch: z.object({ returnTo: z.string().optional() }),
  beforeLoad: ({ context, search }) => {
    if (context.session) {
      throw redirect({ href: getInternalReturnTo(search.returnTo ?? null) });
    }
  },
  component: HomePage,
});
