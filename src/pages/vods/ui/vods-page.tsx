import { Link } from "@tanstack/react-router";
import type { PublishedVodItem } from "@/shared/db";
import { formatDuration } from "@/shared/lib/utils";
import { AccountControls } from "@/shared/ui/auth-modal";

export type VodItem = PublishedVodItem;
export { formatDuration };

export function VodsPage(props?: {
	registrationEnabled?: boolean;
	vods?: PublishedVodItem[];
}) {
	const vods = props?.vods ?? [];

	return (
		<main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8 sm:py-12 lg:px-12">
			<div className="mx-auto max-w-6xl space-y-8">
				<div className="flex items-center justify-between">
					<Link
						className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
						to="/"
					>
						&larr; Home
					</Link>
					<AccountControls
						registrationEnabled={props?.registrationEnabled ?? true}
					/>
				</div>
				<header className="space-y-3 border-b border-border pb-6">
					<div className="inline-flex rounded-sm border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">
						Interactive Training Engine
					</div>
					<h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
						VOD Training Catalog
					</h1>
					<p className="max-w-2xl text-base text-muted-foreground">
						Select a high-level Overwatch 2 ranked VOD to practice real-time
						scenario decision making, ultimate tracking, and tactical execution.
					</p>
				</header>

				{vods.length === 0 ? (
					<div className="rounded-lg border border-dashed border-border bg-muted/50 p-8 text-center sm:p-12">
						<p className="text-lg font-medium text-muted-foreground">
							No training VODs currently available.
						</p>
						<p className="mt-1 text-sm text-muted-foreground/80">
							Check back soon for new Grandmaster and Top 500 session uploads.
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{vods.map((vod) => (
							<div
								className="flex flex-col justify-between rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary/60 hover:shadow-md motion-reduce:transition-none"
								key={vod.id}
							>
								<div className="space-y-4">
									<div className="flex items-center justify-between gap-2 flex-wrap">
										<span className="rounded-sm border border-accent bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
											{vod.mapName}
										</span>
										<span className="rounded-sm border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
											{vod.rankTier}
										</span>
									</div>

									<h2 className="line-clamp-2 text-xl font-semibold text-card-foreground">
										{vod.title}
									</h2>

									<div className="flex items-center justify-between gap-2 border-t border-border pt-3 font-mono text-xs text-muted-foreground">
										<span>Duration: {formatDuration(vod.durationSeconds)}</span>
										<span>{vod.scenarios.length} Scenarios</span>
									</div>
								</div>

								<div className="mt-6">
									<Link
										className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card active:bg-primary/80 motion-reduce:transition-none"
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
			</div>
		</main>
	);
}
