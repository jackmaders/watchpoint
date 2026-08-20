import type { D1Database } from "@cloudflare/workers-types";
import { hashPassword } from "better-auth/crypto";
import { drizzle } from "drizzle-orm/d1";
import { getPlatformProxy } from "wrangler";
import * as schema from "../src/shared/db/schema";
import {
	FIXTURE_IDS,
	getLocalFixtureScenarios,
} from "../src/shared/db/seed-fixtures";
import {
	assertLocalSeedTarget,
	getSeedCredentials,
} from "../src/shared/db/seed-policy";

async function getDbClient() {
	assertLocalSeedTarget();
	const proxy = await getPlatformProxy<{ DB: D1Database }>();
	return {
		db: drizzle(proxy.env.DB, { schema }),
		proxy,
	};
}

async function main() {
	assertLocalSeedTarget();
	const credentials = getSeedCredentials();
	const { db, proxy } = await getDbClient();
	const now = new Date();

	try {
		await db.delete(schema.attemptRecords);
		await db.delete(schema.scenarioSnapshots);
		await db.delete(schema.playthroughModuleSelections);
		await db.delete(schema.playthroughs);
		await db.delete(schema.auditEntries);
		await db.delete(schema.scenarios);
		await db.delete(schema.vods);
		await db.delete(schema.sessions);
		await db.delete(schema.accounts);
		await db.delete(schema.users);

		await db.insert(schema.users).values([
			{
				createdAt: now,
				email: credentials.playerEmail,
				emailVerified: true,
				id: FIXTURE_IDS.playerUser,
				isTestAccount: true,
				name: "Local Player",
				role: "PLAYER",
				updatedAt: now,
			},
			{
				createdAt: now,
				email: credentials.adminEmail,
				emailVerified: true,
				id: FIXTURE_IDS.adminUser,
				isTestAccount: true,
				name: "Local Administrator",
				role: "ADMIN",
				updatedAt: now,
			},
		]);

		await db.insert(schema.accounts).values([
			{
				accountId: FIXTURE_IDS.playerUser,
				createdAt: now,
				id: "account_local_player",
				password: await hashPassword(credentials.playerPassword),
				providerId: "credential",
				updatedAt: now,
				userId: FIXTURE_IDS.playerUser,
			},
			{
				accountId: FIXTURE_IDS.adminUser,
				createdAt: now,
				id: "account_local_admin",
				password: await hashPassword(credentials.adminPassword),
				providerId: "credential",
				updatedAt: now,
				userId: FIXTURE_IDS.adminUser,
			},
		]);

		await db.insert(schema.vods).values({
			createdAt: now,
			durationSeconds: 600,
			heroName: "Ana",
			id: FIXTURE_IDS.vod,
			isPublished: true,
			mapName: "Local Test Map",
			rankTier: "Synthetic",
			role: "SUPPORT",
			title: "Local Synthetic VOD Fixture",
			youtubeVideoId: "local-fixture-video",
		});
		await db
			.insert(schema.scenarios)
			.values(getLocalFixtureScenarios(FIXTURE_IDS.vod));

		console.log(
			`Seeded local fixtures: ${credentials.playerEmail}, ${credentials.adminEmail}, and 5 module scenarios.`,
		);
	} finally {
		await proxy.dispose();
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
