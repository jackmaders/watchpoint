/**
 * Landing view presentation for the Watchpoint game sense learning platform.
 *
 * Implements `HomePage` wrapped in `AppLayout`, rendering the field briefing overview,
 * quick catalog preview, and links to interactive training modules.
 */
import { Link } from "@tanstack/react-router";
import { AppLayout } from "@/widgets/layout-main";
import type { PublishedVodItem } from "../model/types";

export function HomePage(props?: {
	registrationEnabled?: boolean;
	vods?: PublishedVodItem[];
}) {
	const vods = props?.vods ?? [];

	return (
		<AppLayout registrationEnabled={props?.registrationEnabled ?? true}>
			<div className="mx-auto max-w-4xl space-y-12 py-6 sm:py-12">
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
										<div className="flex items-center justify-between text-xs font-semibold">
											<span className="text-muted-foreground">
												{vod.mapName}
											</span>
											<span className="text-primary">{vod.rankTier}</span>
										</div>
										<h3 className="line-clamp-2 text-base font-semibold">
											{vod.title}
										</h3>
									</div>
									<div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
										<span>{vod.scenarios.length} Scenarios</span>
										<Link
											className="text-xs font-semibold text-primary hover:underline"
											params={{ id: vod.id }}
											to="/vods/$id"
										>
											Briefing &rarr;
										</Link>
									</div>
								</div>
							))}
						</div>
					)}
				</section>
			</div>
		</AppLayout>
	);
}
