import { connection } from "next/server";
import { getVodManifest } from "@/shared/db";
import { type SessionScenario, VodSessionClient } from "./vod-session-client";

interface VodSessionPageProps {
	params: Promise<{ id: string }>;
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function getModules(
	searchParams: Record<string, string | string[] | undefined>,
) {
	const rawModules = searchParams.modules;
	const modules = Array.isArray(rawModules) ? rawModules : [rawModules];

	return modules
		.filter((module): module is string => typeof module === "string")
		.flatMap((module) => module.split(","))
		.map((module) => module.trim().toUpperCase())
		.filter(Boolean);
}

export async function VodSessionPage({
	params,
	searchParams = Promise.resolve({}),
}: VodSessionPageProps) {
	await connection();
	const { id } = await params;
	const modules = getModules(await searchParams);
	const manifest = await getVodManifest(id, {
		modules: modules.length > 0 ? modules : undefined,
	});

	if (!manifest) {
		return (
			<main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-50">
				<h1 className="text-2xl font-bold">VOD Not Found</h1>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-50">
			<div className="mx-auto max-w-3xl space-y-8">
				<header className="space-y-2">
					<p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
						Interactive Training Session
					</p>
					<h1 className="text-3xl font-bold">{manifest.title}</h1>
				</header>
				<VodSessionClient
					scenarios={manifest.scenarios as unknown as SessionScenario[]}
				/>
			</div>
		</main>
	);
}
