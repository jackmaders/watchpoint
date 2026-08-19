import { Link } from "@tanstack/react-router";
import type { PublishedVodItem } from "@/shared/db";
import { AccountControls } from "@/shared/ui/auth-modal";

export function HomePage(props?: {
	registrationEnabled?: boolean;
	vods?: PublishedVodItem[];
}) {
	const vods = props?.vods ?? [];

	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground sm:p-12 lg:p-24">
			<div className="w-full max-w-4xl space-y-12">
				<div className="flex justify-end">
					<AccountControls
						registrationEnabled={props?.registrationEnabled ?? true}
					/>
				</div>
				<div className="space-y-4 text-center">
					<p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
						Watchpoint / Field Briefing
					</p>
					<h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
						Watchpoint Interactive Engine
					</h1>
					<p className="mx-auto max-w-2xl text-lg text-muted-foreground">
						Overwatch 2 interactive VOD decision training powered by Cloudflare
						edge runtime.
					</p>
				</div>

				<section className="space-y-6 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg">
					<div className="flex items-center justify-between border-b border-border pb-4">
						<h2 className="text-xl font-semibold">
							Training VOD Catalog ({vods.length})
						</h2>
						<Link
							className="text-sm font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							to="/vods"
						>
							View Full Catalog &rarr;
						</Link>
					</div>

					{vods.length === 0 ? (
						<div className="rounded-md border border-dashed border-border bg-muted p-8 text-center">
							<p className="text-base font-medium text-muted-foreground">
								No published training VODs in database.
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							{vods.map((vod) => (
								<div
									className="flex flex-col justify-between space-y-3 rounded-md border border-border bg-background p-4"
									key={vod.id}
								>
									<div className="space-y-2">
										<div className="flex items-center gap-2">
											<span className="rounded-sm border border-secondary bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
												{vod.mapName}
											</span>
											<span className="rounded-sm border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
												{vod.rankTier}
											</span>
										</div>
										<h3 className="text-base font-semibold text-card-foreground">
											{vod.title}
										</h3>
									</div>
									<div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
										<span>{vod.scenarios.length} Scenarios</span>
										<Link
											className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
											params={{ id: vod.id }}
											to="/vods/$id"
										>
											Start Training
										</Link>
									</div>
								</div>
							))}
						</div>
					)}
				</section>
			</div>
		</main>
	);
}
