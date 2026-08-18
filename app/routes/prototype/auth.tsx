import { createFileRoute } from "@tanstack/react-router";
import { AuthPrototype } from "@/pages/prototype-auth";

export const Route = createFileRoute("/prototype/auth")({
	component: AuthPrototype,
});
