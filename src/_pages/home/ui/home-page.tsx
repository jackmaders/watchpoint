import Link from "next/link";
import { connection } from "next/server";
import { getPublishedVods } from "@/shared/db";
import { UserForm } from "./user-form";

export async function HomePage() {
	await connection();

	const vods = await getPublishedVods();

	return (
		<main className="flex min-h-screen flex-col items-center justify-center p-8 sm:p-24 bg-slate-950 text-slate-50">
			<div className="max-w-4xl w-full space-y-12">
				<div className="text-center space-y-4">
					<h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
						Watchpoint Interactive Engine
					</h1>
					<p className="text-slate-400 text-lg max-w-2xl mx-auto">
						Overwatch 2 interactive VOD decision training powered by Cloudflare
						edge runtime.
					</p>
				</div>

				<section className="space-y-6 border border-slate-800 rounded-xl bg-slate-900/60 p-6 shadow-xl">
					<div className="flex items-center justify-between border-b border-slate-800 pb-4">
						<h2 className="text-xl font-bold text-white">
							Training VOD Catalog ({vods.length})
						</h2>
						<Link
							className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
							href="/vods"
						>
							View Full Catalog &rarr;
						</Link>
					</div>

					{vods.length === 0 ? (
						<div className="p-8 text-center border border-dashed border-slate-800 rounded-lg bg-slate-950/40">
							<p className="text-slate-400 text-base font-medium">
								No published training VODs in database.
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{vods.map((vod) => (
								<div
									className="p-4 rounded-lg border border-slate-800 bg-slate-950/60 space-y-3 flex flex-col justify-between"
									key={vod.id}
								>
									<div className="space-y-2">
										<div className="flex items-center gap-2">
											<span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
												{vod.mapName}
											</span>
											<span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
												{vod.rankTier}
											</span>
										</div>
										<h3 className="font-semibold text-slate-100 text-base">
											{vod.title}
										</h3>
									</div>
									<div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
										<span>{vod.scenarios.length} Scenarios</span>
										<Link
											className="text-indigo-400 hover:underline font-semibold"
											href={`/vods/${vod.id}`}
										>
											Start Training
										</Link>
									</div>
								</div>
							))}
						</div>
					)}
				</section>

				<div className="w-full max-w-md mx-auto pt-6 border-t border-slate-800">
					<UserForm />
				</div>
			</div>
		</main>
	);
}
