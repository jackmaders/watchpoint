import { createFileRoute } from "@tanstack/react-router";

import { ProfilePage } from "@/pages/profile";

const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

export { Route };
