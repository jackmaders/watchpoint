import { Link } from "@tanstack/react-router";
import type { SessionManifest } from "@/shared/db";
import { SessionPlayerClient } from "./session-player-client";

export async function SessionPlayerPage({
	params,
	searchParams,
	vod,
}: {
	params: Promise<{ id: string }> | { id: string };
	searchParams?:
		| Promise<{ modules?: string }>
		| { modules?: string }
		| undefined;
	vod?: SessionManifest | null;
}) {
	await params;
	await searchParams;

	if (!vod) {
		return (
			<main className="min-h-screen bg-background text-foreground px-4 py-8 sm:px-6 sm:py-12 flex items-center justify-center">
				<div className="max-w-md w-full text-center p-6 sm:p-8 border border-border rounded-lg bg-card shadow-lg space-y-4">
					<div className="inline-block p-3 rounded-md bg-secondary text-secondary-foreground border border-border">
						⚠️
					</div>
					<h1 className="text-2xl font-bold text-foreground">VOD Not Found</h1>
					<p className="text-muted-foreground text-sm">
						The requested VOD training session is unavailable or unpublished.
					</p>
					<Link
						className="inline-block mt-4 px-4 py-2 bg-secondary hover:bg-accent hover:text-accent-foreground text-secondary-foreground text-sm font-semibold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
						to="/vods"
					>
						Back to VOD Catalog
					</Link>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-background text-foreground px-4 sm:px-6 py-6 sm:py-8">
			<SessionPlayerClient vod={vod} />
		</main>
	);
}
