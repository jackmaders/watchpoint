/**
 * Provides the top-level responsive layout shell integrating top navigation and sidebar drawers
 * across public catalog, history, and user dashboard views.
 *
 * Implements `AppLayout` within `src/widgets/layout-main` according to Feature-Sliced Design.
 * Composes the `Navbar` and `Sidebar` components, orchestrates responsive drawer states via Radix UI
 * dialog primitives, and provides fluid desktop sidebar collapse interactions.
 */

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";

export interface AppLayoutProps {
	children?: ReactNode;
	registrationEnabled?: boolean;
}

export function AppLayout({
	children,
	registrationEnabled = true,
}: AppLayoutProps) {
	const [isMobileOpen, setIsMobileOpen] = useState(false);
	const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

	const toggleMobileSidebar = useCallback(() => {
		setIsMobileOpen((prev) => !prev);
	}, []);

	const closeMobileSidebar = useCallback(() => {
		setIsMobileOpen(false);
	}, []);

	const toggleDesktopSidebar = useCallback(() => {
		setIsDesktopCollapsed((prev) => !prev);
	}, []);

	return (
		<div className="min-h-screen bg-background text-foreground flex flex-col">
			<Navbar
				isDesktopSidebarCollapsed={isDesktopCollapsed}
				isMobileSidebarOpen={isMobileOpen}
				onToggleDesktopSidebar={toggleDesktopSidebar}
				onToggleMobileSidebar={toggleMobileSidebar}
				registrationEnabled={registrationEnabled}
			/>

			{/* Mobile Drawer */}
			<Dialog onOpenChange={setIsMobileOpen} open={isMobileOpen}>
				<DialogContent
					className="fixed inset-y-0 left-0 top-0 z-50 h-full w-72 max-w-[80vw] translate-x-0 translate-y-0 rounded-none border-r border-border bg-card p-0 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-xs"
					showCloseButton={false}
				>
					<DialogTitle className="sr-only">Mobile Navigation</DialogTitle>
					<div className="flex h-16 items-center justify-between border-b border-border px-4">
						<span className="font-mono text-sm font-bold uppercase tracking-wider text-primary">
							Navigation Menu
						</span>
						<Button
							aria-label="Close navigation menu"
							onClick={closeMobileSidebar}
							size="icon"
							type="button"
							variant="ghost"
						>
							<X className="h-5 w-5" />
						</Button>
					</div>
					<Sidebar
						className="h-[calc(100%-4rem)] w-full border-r-0 bg-transparent"
						onNavClick={closeMobileSidebar}
					/>
				</DialogContent>
			</Dialog>

			<div className="flex flex-1">
				{/* Desktop Sidebar */}
				<Sidebar className="hidden md:flex" isCollapsed={isDesktopCollapsed} />

				{/* Page Content */}
				<main className="flex-1 w-full p-4 sm:p-6 lg:p-8">{children}</main>
			</div>
		</div>
	);
}
