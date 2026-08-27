import { hashPassword } from "better-auth/crypto";
import type { DrizzleDb } from "../core/client";
import { auditEntries } from "../schema/audit";
import { accounts, sessions, users } from "../schema/auth";
import {
	attemptRecords,
	playthroughCompletions,
	playthroughModuleSelections,
	playthroughs,
	scenarioSnapshots,
} from "../schema/playthroughs";
import { scenarios, vods } from "../schema/vods";
import {
	FIXTURE_IDS,
	getLocalFixtureScenarios,
	getLocalFixtureVod,
} from "./fixtures";
import { assertLocalSeedTarget, getSeedCredentials } from "./policy";

export async function executeSeed(db: DrizzleDb) {
	assertLocalSeedTarget();
	const credentials = getSeedCredentials();
	const now = new Date();

	await db.delete(attemptRecords);
	await db.delete(scenarioSnapshots);
	await db.delete(playthroughModuleSelections);
	await db.delete(playthroughs);
	await db.delete(playthroughCompletions);
	await db.delete(auditEntries);
	await db.delete(scenarios);
	await db.delete(vods);
	await db.delete(sessions);
	await db.delete(accounts);
	await db.delete(users);

	await db.insert(users).values([
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

	await db.insert(accounts).values([
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

	const fixtureVod = getLocalFixtureVod();
	await db.insert(vods).values(fixtureVod);
	await db.insert(scenarios).values(getLocalFixtureScenarios(FIXTURE_IDS.vod));

	return {
		adminEmail: credentials.adminEmail,
		playerEmail: credentials.playerEmail,
		scenariosCount: 5,
		vodId: FIXTURE_IDS.vod,
	};
}
