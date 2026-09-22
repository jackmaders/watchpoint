import { cn } from "@/shared/lib/utils";
import { Card, CardDescription, CardHeader } from "@/shared/ui/card";

export function SessionPanelFallback({ className }: { className?: string }) {
	return (
		<Card className={cn("min-h-112", className)}>
			<CardHeader>
				<CardDescription>Checking the current session…</CardDescription>
			</CardHeader>
		</Card>
	);
}
