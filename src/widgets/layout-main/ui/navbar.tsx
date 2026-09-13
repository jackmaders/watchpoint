/**
 * Renders the primary top navigation header providing global branding, route section breadcrumbs,
 * layout toggles, and player account controls across site-wide views.
 *
 * Implements the `Navbar` component within `src/widgets/layout-main` for the public app shell.
 * Derives current section indicators dynamically from `@tanstack/react-router` location state,
 * manages responsive sidebar toggle callbacks, and embeds `AccountControls` for authentication flows.
 */

import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight, Menu, PanelLeft, PanelLeftClose, X } from "lucide-react";
import { AccountControls } from "@/shared/ui/auth-modal";
import { Button } from "@/shared/ui/button";

export interface NavbarProps {
	isDesktopSidebarCollapsed?: boolean;
	isMobileSidebarOpen?: boolean;
	onToggleDesktopSidebar?: () => void;
	onToggleMobileSidebar?: () => void;
	registrationEnabled?: boolean;
}

interface RouteSectionMapping {
	match: (path: string) => boolean;
	parent?: { name: string; to: string };
	section: string;
}

const SECTION_MAPPINGS: readonly RouteSectionMapping[] = [
	{
		match: (path) => path === "/",
		section: "Overview",
	},
	{
		match: (path) => path === "/vods",
		section: "VOD Catalog",
	},
	{
		match: (path) => path.startsWith("/vods/"),
		parent: { name: "VOD Catalog", to: "/vods" },
		section: "VOD Details",
	},
	{
		match: (path) => path === "/history",
		section: "Training History",
	},
	{
		match: (path) => path.startsWith("/history/"),
		parent: { name: "Training History", to: "/history" },
		section: "Session Breakdown",
	},
	{
		match: (path) => path === "/admin",
		section: "Admin Panel",
	},
	{
		match: (path) => path.startsWith("/admin/content"),
		parent: { name: "Admin", to: "/admin" },
		section: "Content Management",
	},
	{
		match: (path) => path.startsWith("/admin/users"),
		parent: { name: "Admin", to: "/admin" },
		section: "User Roles",
	},
	{
		match: (path) => path.startsWith("/admin/audit"),
		parent: { name: "Admin", to: "/admin" },
		section: "Audit Logs",
	},
	{
		match: (path) => path.startsWith("/admin/"),
		parent: { name: "Admin", to: "/admin" },
		section: "Admin Dashboard",
	},
];

function getSectionName(pathname: string): {
	section: string;
	parent?: { name: string; to: string };
} {
	const matched = SECTION_MAPPINGS.find((entry) => entry.match(pathname));
	if (matched) {
		return { parent: matched.parent, section: matched.section };
	}
	return { section: "Dashboard" };
}

export function Navbar({
	isDesktopSidebarCollapsed = false,
	isMobileSidebarOpen = false,
	onToggleDesktopSidebar,
	onToggleMobileSidebar,
	registrationEnabled = true,
}: NavbarProps) {
	const location = useLocation();
	const { parent, section } = getSectionName(location.pathname);

	return (
		<header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur sm:px-6 lg:px-8">
			<div className="flex items-center gap-3 sm:gap-4">
				<Button
					aria-expanded={isMobileSidebarOpen}
					aria-label={
						isMobileSidebarOpen
							? "Close navigation menu"
							: "Open navigation menu"
					}
					className="md:hidden"
					onClick={onToggleMobileSidebar}
					size="icon"
					type="button"
					variant="ghost"
				>
					{isMobileSidebarOpen ? (
						<X className="h-5 w-5" />
					) : (
						<Menu className="h-5 w-5" />
					)}
				</Button>

				<Button
					aria-label={
						isDesktopSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
					}
					className="hidden md:inline-flex"
					onClick={onToggleDesktopSidebar}
					size="icon"
					type="button"
					variant="ghost"
				>
					{isDesktopSidebarCollapsed ? (
						<PanelLeft className="h-5 w-5" />
					) : (
						<PanelLeftClose className="h-5 w-5" />
					)}
				</Button>

				<Link
					className="flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-wider text-primary transition-opacity hover:opacity-90"
					to="/"
				>
					<span className="flex h-7 w-7 items-center justify-center rounded bg-primary text-xs font-black text-primary-foreground">
						W
					</span>
					<span className="hidden sm:inline">Watchpoint</span>
				</Link>

				<nav
					aria-label="Breadcrumbs"
					className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm"
				>
					<span className="text-border">/</span>
					{parent ? (
						<>
							<Link
								className="hover:text-foreground transition-colors"
								to={parent.to}
							>
								{parent.name}
							</Link>
							<ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
						</>
					) : null}
					<span className="font-medium text-foreground">{section}</span>
				</nav>
			</div>

			<div className="flex items-center gap-3">
				<AccountControls registrationEnabled={registrationEnabled} />
			</div>
		</header>
	);
}
