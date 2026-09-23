import type { SQLiteAsyncDatabase } from "drizzle-orm/sqlite-core/async";
import { options, questions, skills, vods } from "../schema";

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
