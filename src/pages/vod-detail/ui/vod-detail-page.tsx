import { Link } from "@tanstack/react-router";
import type { SessionManifest } from "@/shared/db";
import { formatDuration } from "@/shared/lib/utils";
import { extractHeroFromTitle } from "../model/module-filter";
import { VodDetailClient } from "./vod-detail-client";

export function VodDetailPage({
	params: _params,
	registrationEnabled,
	vod,
}: {
	params: Promise<{ id: string }> | { id: string };
	registrationEnabled?: boolean;
	vod?: SessionManifest | null;
}) {
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

	const hero = extractHeroFromTitle(vod.title);

	return (
		<main className="min-h-screen bg-background text-foreground px-4 py-8 sm:px-6 sm:py-12">
			<div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
				<div className="space-y-4">
					<Link
						className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
						to="/vods"
					>
						← Back to VOD Catalog
					</Link>

					<header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
						<div className="space-y-2">
							<div className="flex items-center gap-2 flex-wrap">
								<span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-accent text-accent-foreground border border-border">
									{vod.mapName}
								</span>
								<span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-secondary text-secondary-foreground border border-border">
									{vod.rankTier}
								</span>
								{hero && (
									<span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/40">
										Hero: {hero}
									</span>
								)}
							</div>
							<h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
								{vod.title}
							</h1>
						</div>

						<div className="text-right md:text-left text-xs text-muted-foreground font-mono space-y-1">
							<div>Duration: {formatDuration(vod.durationSeconds)}</div>
							<div>Total Scenarios: {vod.scenarios.length}</div>
						</div>
					</header>
				</div>

				<VodDetailClient registrationEnabled={registrationEnabled} vod={vod} />
			</div>
		</main>
	);
}
