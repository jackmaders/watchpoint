import { Link } from "@tanstack/react-router";
import { getSessionManifest } from "@/shared/db";
import { formatDuration } from "@/shared/lib/utils";
import { extractHeroFromTitle } from "../model/module-filter";
import { VodDetailClient } from "./vod-detail-client";

export async function VodDetailPage({
	params,
	vod: initialVod,
}: {
	params: Promise<{ id: string }> | { id: string };
	vod?: Awaited<ReturnType<typeof getSessionManifest>>;
}) {
	const resolvedParams = await params;
	const vod =
		initialVod !== undefined
			? initialVod
			: await getSessionManifest(resolvedParams.id);

	if (!vod) {
		return (
			<main className="min-h-screen bg-slate-950 text-slate-50 px-6 py-12 flex items-center justify-center">
				<div className="max-w-md w-full text-center p-8 border border-slate-800 rounded-2xl bg-slate-900/60 shadow-xl space-y-4">
					<div className="inline-block p-3 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
						⚠️
					</div>
					<h1 className="text-2xl font-bold text-white">VOD Not Found</h1>
					<p className="text-slate-400 text-sm">
						The requested VOD training session is unavailable or unpublished.
					</p>
					<Link
						className="inline-block mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg transition-colors"
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
		<main className="min-h-screen bg-slate-950 text-slate-50 px-6 py-12">
			<div className="max-w-5xl mx-auto space-y-8">
				<div className="space-y-4">
					<Link
						className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-colors"
						to="/vods"
					>
						← Back to VOD Catalog
					</Link>

					<header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
						<div className="space-y-2">
							<div className="flex items-center gap-2 flex-wrap">
								<span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
									{vod.mapName}
								</span>
								<span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
									{vod.rankTier}
								</span>
								{hero && (
									<span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
										Hero: {hero}
									</span>
								)}
							</div>
							<h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
								{vod.title}
							</h1>
						</div>

						<div className="text-right md:text-left text-xs text-slate-400 space-y-1">
							<div>Duration: {formatDuration(vod.durationSeconds)}</div>
							<div>Total Scenarios: {vod.scenarios.length}</div>
						</div>
					</header>
				</div>

				<VodDetailClient vod={vod} />
			</div>
		</main>
	);
}
