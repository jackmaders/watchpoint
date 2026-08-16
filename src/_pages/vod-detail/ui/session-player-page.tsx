import { Link } from "@tanstack/react-router";
import { getSessionManifest } from "@/shared/db";
import { SessionPlayerClient } from "./session-player-client";

export async function SessionPlayerPage({
	params,
	searchParams,
	vod: initialVod,
}: {
	params: Promise<{ id: string }> | { id: string };
	searchParams?:
		| Promise<{ modules?: string }>
		| { modules?: string }
		| undefined;
	vod?: Awaited<ReturnType<typeof getSessionManifest>>;
}) {
	const resolvedParams = await params;
	const resolvedSearch = await searchParams;
	let vod = initialVod;
	if (vod === undefined) {
		vod = await getSessionManifest(resolvedParams.id, {
			modules: resolvedSearch?.modules,
		});
	}

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

	return (
		<main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-6 py-8">
			<SessionPlayerClient vod={vod} />
		</main>
	);
}
