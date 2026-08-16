import { Link } from "@tanstack/react-router";
import type { PublishedVodItem } from "@/shared/db";
import { getPublishedVods } from "@/shared/db";
import { formatDuration } from "@/shared/lib/utils";

export type VodItem = PublishedVodItem;
export { formatDuration };

export async function VodsPage(props?: { vods?: PublishedVodItem[] }) {
	const vods = props?.vods ?? (await getPublishedVods());

	return (
		<main className="min-h-screen bg-slate-950 text-slate-50 px-6 py-12">
			<div className="max-w-6xl mx-auto space-y-8">
				<header className="border-b border-slate-800 pb-6 space-y-2">
					<div className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider rounded-full">
						Interactive Training Engine
					</div>
					<h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
						VOD Training Catalog
					</h1>
					<p className="text-slate-400 text-base max-w-2xl">
						Select a high-level Overwatch 2 ranked VOD to practice real-time
						scenario decision making, ultimate tracking, and tactical execution.
					</p>
				</header>

				{vods.length === 0 ? (
					<div className="p-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/50">
						<p className="text-slate-400 text-lg font-medium">
							No training VODs currently available.
						</p>
						<p className="text-slate-500 text-sm mt-1">
							Check back soon for new Grandmaster and Top 500 session uploads.
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{vods.map((vod) => (
							<div
								className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg hover:border-slate-700 transition-all duration-200"
								key={vod.id}
							>
								<div className="space-y-4">
									<div className="flex items-center justify-between gap-2 flex-wrap">
										<span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
											{vod.mapName}
										</span>
										<span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
											{vod.rankTier}
										</span>
									</div>

									<h2 className="text-xl font-bold text-slate-100 line-clamp-2">
										{vod.title}
									</h2>

									<div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3">
										<span>Duration: {formatDuration(vod.durationSeconds)}</span>
										<span>{vod.scenarios.length} Scenarios</span>
									</div>
								</div>

								<div className="mt-6">
									<Link
										className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 active:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20"
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
