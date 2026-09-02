/**
 * Navigation guard redirecting root admin route access to the content management section.
 *
 * Implements `adminIndexBeforeLoad` which throws a TanStack Router `redirect` pointing to `/admin/content`.
 */
import { redirect } from "@tanstack/react-router";

export function adminIndexBeforeLoad() {
	throw redirect({ to: "/admin/content" });
}
