import type { QueryClient } from "@tanstack/react-query";
import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { useEffect } from "react";

import { ErrorPage } from "@/pages/error";
import { NotFoundPage } from "@/pages/not-found";
import { getSessionFn, type Session } from "@/shared/auth";
import { Toaster } from "@/shared/ui/shadcn/toast";

import { Devtools, Footer, Header } from "../layouts";

import appCss from "../styles/index.css?url";

export interface RootRouterContext {
  queryClient: QueryClient;
  session?: Session | null;
}

export const Route = createRootRouteWithContext<RootRouterContext>()({
  beforeLoad: async () => {
    const session = await getSessionFn();
    return { session };
  },
  errorComponent: ErrorPage,
  head: () => ({
    links: [
      {
        href: appCss,
        rel: "stylesheet",
      },
    ],
    meta: [
      {
        charSet: "utf8",
      },
      {
        content: "width=device-width, initial-scale=1",
        name: "viewport",
      },
      {
        title: "TanStack Start Starter",
      },
    ],
  }),
  notFoundComponent: NotFoundPage,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.dataset["hydrated"] = "true";
  }, []);

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body
        className="flex min-h-svh flex-col font-sans wrap-anywhere antialiased"
        data-hydrated="false"
      >
        <Header />
        <main className="container mx-auto flex flex-1 flex-col px-4 py-8">{children}</main>
        <Footer />
        <Toaster />
        <Devtools />
        <Scripts />
      </body>
    </html>
  );
}
