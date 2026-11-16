import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) => {
    if (!context.session) {
      throw redirect({ to: "/", search: { returnTo: location.href } });
    }

    return { session: context.session };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return <Outlet />;
}

export { Route };
