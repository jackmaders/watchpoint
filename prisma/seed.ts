import type { D1Database } from "@cloudflare/workers-types";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaD1(process.env.DB as unknown as D1Database);
const prisma = new PrismaClient({ adapter });

function getInitialScenarios() {
	return [
		{
			explanationText:
				"Highground statue balcony provides line of sight into choke while remaining safe from early dives.",
			inputConfig: {
				options: [
					{
						id: "opt_a",
						is_correct: true,
						text: "Highground Statue Balcony",
					},
					{ id: "opt_b", is_correct: false, text: "Lowground Main Gate" },
					{ id: "opt_c", is_correct: false, text: "Behind Point Archway" },
					{ id: "opt_d", is_correct: false, text: "Hotel Side Alley" },
				],
			},
			inputType: "MULTIPLE_CHOICE" as const,
			moduleType: "STRATEGY" as const,
			promptText:
				"Where should Ana position during the enemy's initial push through King's Row choke?",
			timeLimitSeconds: null,
			timestampSeconds: 120.0,
		},
		{
			explanationText:
				"Throw Sleep Dart at Reinhardt before he completes Charge animation to neutralize aggressive push.",
			inputConfig: {
				options: [
					{ id: "opt_a", is_correct: true, text: "Sleep Dart Reinhardt" },
					{ id: "opt_b", is_correct: false, text: "Biotic Grenade Team" },
					{ id: "opt_c", is_correct: false, text: "Retreat to Spawn" },
					{ id: "opt_d", is_correct: false, text: "Nano Boost Tank" },
				],
			},
			inputType: "MULTIPLE_CHOICE" as const,
			moduleType: "TACTICS" as const,
			promptText:
				"Enemy Reinhardt is aggressive without shield. What is the immediate optimal decision?",
			timeLimitSeconds: 3,
			timestampSeconds: 315.0,
		},
		{
			explanationText:
				"Based on damage output and passage of time, Genji ultimate is at 76-100% (Ready).",
			inputConfig: {
				options: [
					{ id: "opt_a", is_correct: false, text: "0-25% (No Ult)" },
					{ id: "opt_b", is_correct: false, text: "26-50% (Building)" },
					{ id: "opt_c", is_correct: false, text: "51-75% (Soon)" },
					{ id: "opt_d", is_correct: true, text: "76-100% (Ready)" },
				],
			},
			inputType: "MULTIPLE_CHOICE" as const,
			moduleType: "ULTIMATE" as const,
			promptText:
				"Enemy Genji has dealt 1,200 damage in 2 teamfights. Estimate Dragonblade charge.",
			timeLimitSeconds: null,
			timestampSeconds: 450.0,
		},
		{
			explanationText:
				"Protection Suzu has a 15-second cooldown. It is currently On CD 3-6s.",
			inputConfig: {
				options: [
					{ id: "opt_a", is_correct: false, text: "Ready" },
					{ id: "opt_b", is_correct: false, text: "On CD <3s" },
					{ id: "opt_c", is_correct: true, text: "On CD 3-6s" },
					{ id: "opt_d", is_correct: false, text: "On CD >6s" },
				],
			},
			inputType: "MULTIPLE_CHOICE" as const,
			moduleType: "COOLDOWN" as const,
			promptText: "Enemy Kiriko used Suzu 8 seconds ago. Is Suzu available?",
			timeLimitSeconds: null,
			timestampSeconds: 620.0,
		},
		{
			explanationText:
				"Tracer is flanking from Hotel Highground overlooking Point B streets.",
			imageUrl: "/assets/screenshots/kings_row_hotel_flank.png",
			inputConfig: {
				options: [
					{
						id: "opt_a",
						is_correct: true,
						text: "Hotel Highground Balcony",
					},
					{ id: "opt_b", is_correct: false, text: "Underpass Mega Health" },
					{ id: "opt_c", is_correct: false, text: "Main Street Payload" },
					{ id: "opt_d", is_correct: false, text: "Sniper Perch Right" },
				],
			},
			inputType: "MULTIPLE_CHOICE" as const,
			moduleType: "SPATIAL" as const,
			promptText:
				"Tracer footsteps detected on left flank. Where is the threat coming from?",
			timeLimitSeconds: null,
			timestampSeconds: 840.0,
		},
	];
}

async function main() {
	console.log("Seeding database...");

	await prisma.attemptRecord.deleteMany();
	await prisma.scenario.deleteMany();
	await prisma.vod.deleteMany();

	const vod = await prisma.vod.create({
		data: {
			durationSeconds: 1080,
			isPublished: true,
			mapName: "King's Row",
			rankTier: "Grandmaster",
			scenarios: {
				create: getInitialScenarios(),
			},
			title: "Grandmaster Ana VOD — King's Row Defense & Attack",
			youtubeVideoId: "dQw4w9WgXcQ",
		},
	});

	console.log(`Seeded VOD: ${vod.title} (${vod.id}) with 5 curated scenarios.`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
