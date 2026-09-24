import type { SQLiteAsyncDatabase } from "drizzle-orm/sqlite-core/async";
import { options } from "../schema/options";
import { questions } from "../schema/questions";
import { relations } from "../schema/relations";
import { skills } from "../schema/skills";
import { vods } from "../schema/vods";

export const BASELINE_SKILLS = [
	{
		id: "skill-strategy",
		name: "Strategy",
		slug: "strategy",
	},
	{
		id: "skill-tactics",
		name: "Tactics",
		slug: "tactics",
	},
	{
		id: "skill-tracking",
		name: "Tracking",
		slug: "tracking",
	},
	{
		id: "skill-spatial",
		name: "Spatial",
		slug: "spatial",
	},
] as const;

export const SAMPLE_VOD = {
	id: "vod-sample-coaching-demo",
	title: "Overwatch 2 - Positioning & Target Priority Guide",
	youtubeId: "dQw4w9WgXcQ",
	isDemo: true,
	isPublished: true,
} as const;

export const SAMPLE_QUESTIONS = [
	{
		id: "question-sample-1",
		vodId: SAMPLE_VOD.id,
		skillId: "skill-strategy",
		timestampSeconds: 72,
		prompt:
			"The enemy team just committed support ultimates. What is the optimal tactical rotation?",
		options: [
			{
				id: "option-sample-1",
				text: "Disengage to high ground and stabilize resources",
				isCorrect: true,
				orderIndex: 0,
			},
			{
				id: "option-sample-2",
				text: "Force the fight into their ultimate zone",
				isCorrect: false,
				orderIndex: 1,
			},
			{
				id: "option-sample-3",
				text: "Split push without line of sight",
				isCorrect: false,
				orderIndex: 2,
			},
		],
	},
] as const;

export type SeedableDatabase = SQLiteAsyncDatabase<"sync" | "async", unknown>;

export async function seed(db: SeedableDatabase) {
	const now = new Date();

	// 1. Seed baseline skills idempotently
	await Promise.all(
		BASELINE_SKILLS.map((skill) =>
			db
				.insert(skills)
				.values({
					id: skill.id,
					name: skill.name,
					slug: skill.slug,
					createdAt: now,
					updatedAt: now,
				})
				.onConflictDoUpdate({
					target: skills.slug,
					set: {
						name: skill.name,
						updatedAt: now,
					},
				}),
		),
	);

	// 2. Seed sample demo VOD idempotently
	await db
		.insert(vods)
		.values({
			id: SAMPLE_VOD.id,
			title: SAMPLE_VOD.title,
			youtubeId: SAMPLE_VOD.youtubeId,
			isDemo: SAMPLE_VOD.isDemo,
			isPublished: SAMPLE_VOD.isPublished,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoUpdate({
			target: vods.id,
			set: {
				title: SAMPLE_VOD.title,
				youtubeId: SAMPLE_VOD.youtubeId,
				isDemo: SAMPLE_VOD.isDemo,
				isPublished: SAMPLE_VOD.isPublished,
				updatedAt: now,
			},
		});

	// 3. Seed sample questions and options
	await Promise.all(
		SAMPLE_QUESTIONS.map(async (q) => {
			await db
				.insert(questions)
				.values({
					id: q.id,
					vodId: q.vodId,
					skillId: q.skillId,
					timestampSeconds: q.timestampSeconds,
					prompt: q.prompt,
					createdAt: now,
					updatedAt: now,
				})
				.onConflictDoUpdate({
					target: questions.id,
					set: {
						prompt: q.prompt,
						timestampSeconds: q.timestampSeconds,
						updatedAt: now,
					},
				});

			await Promise.all(
				q.options.map((opt) =>
					db
						.insert(options)
						.values({
							id: opt.id,
							questionId: q.id,
							text: opt.text,
							isCorrect: opt.isCorrect,
							orderIndex: opt.orderIndex,
							createdAt: now,
							updatedAt: now,
						})
						.onConflictDoUpdate({
							target: options.id,
							set: {
								text: opt.text,
								isCorrect: opt.isCorrect,
								orderIndex: opt.orderIndex,
								updatedAt: now,
							},
						}),
				),
			);
		}),
	);
}

const LOCAL_DATABASE_DIRECTORY =
	".wrangler/state/v3/d1/miniflare-D1DatabaseObject";

async function findLocalDatabasePath(): Promise<string> {
	const { readdir } = await import("node:fs/promises");
	const { join } = await import("node:path");
	const databasePath = process.env.WATCHPOINT_D1_DATABASE_PATH;

	if (databasePath) {
		return databasePath;
	}

	const entries = await readdir(LOCAL_DATABASE_DIRECTORY, {
		withFileTypes: true,
	});
	const databaseFiles = entries
		.filter(
			(entry) =>
				entry.isFile() &&
				entry.name.endsWith(".sqlite") &&
				entry.name !== "metadata.sqlite",
		)
		.map((entry) => join(LOCAL_DATABASE_DIRECTORY, entry.name));

	const firstFile = databaseFiles[0];
	if (databaseFiles.length !== 1 || !firstFile) {
		throw new Error(
			"Expected one local D1 database. Run `bun run db:migrate` first, or set WATCHPOINT_D1_DATABASE_PATH.",
		);
	}

	return firstFile;
}

async function runLocalSeed() {
	const { default: Database } = await import("better-sqlite3");
	const { drizzle } = await import("drizzle-orm/better-sqlite3");
	const database = new Database(await findLocalDatabasePath());

	try {
		await seed(drizzle({ client: database, relations }));
	} finally {
		database.close();
	}
}

if (import.meta.main) {
	runLocalSeed()
		.then(() => process.stdout.write("Seeded the local D1 database.\n"))
		.catch((error: unknown) => {
			process.stderr.write(
				`${error instanceof Error ? error.message : String(error)}\n`,
			);
			process.exitCode = 1;
		});
}
