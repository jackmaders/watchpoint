import { redirect } from "@tanstack/react-router";

export function adminIndexBeforeLoad() {
	throw redirect({ to: "/admin/content" });
}
