/**
 * Defines centralized entity relationships for Drizzle ORM relational queries across
 * audit logs, authentication, playthrough sessions, telemetry, and VOD scenarios.
 *
 * Implements the relational configuration for ADR-0010 using Drizzle ORM 1.0 `defineRelations`.
 * Connects users to sessions, accounts, audit entries, and playthroughs; connects VODs to
 * scenarios and playthroughs; and connects playthrough sessions to telemetry attempt records.
 */

import { defineRelations } from "drizzle-orm";
import { auditEntries } from "./audit";
import { accounts, sessions, users, verifications } from "./auth";
import {
	attemptRecords,
	playthroughCompletions,
	playthroughModuleSelections,
	playthroughs,
	scenarioSnapshots,
} from "./playthroughs";
import { scenarios, vods } from "./vods";

const schema = {
	accounts,
	attemptRecords,
	auditEntries,
	playthroughCompletions,
	playthroughModuleSelections,
	playthroughs,
	scenarioSnapshots,
	scenarios,
	sessions,
	users,
	verifications,
	vods,
};

export const relations = defineRelations(schema, (r) => ({
	accounts: {
		user: r.one.users({
			from: r.accounts.userId,
			to: r.users.id,
		}),
	},
	attemptRecords: {
		playthrough: r.one.playthroughs({
			from: r.attemptRecords.playthroughId,
			to: r.playthroughs.id,
		}),
		scenario: r.one.scenarios({
			from: r.attemptRecords.scenarioId,
			to: r.scenarios.id,
		}),
		scenarioSnapshot: r.one.scenarioSnapshots({
			from: r.attemptRecords.scenarioSnapshotId,
			to: r.scenarioSnapshots.id,
		}),
		user: r.one.users({
			from: r.attemptRecords.userId,
			to: r.users.id,
		}),
	},
	auditEntries: {
		actor: r.one.users({
			from: r.auditEntries.actorUserId,
			to: r.users.id,
		}),
	},
	playthroughCompletions: {
		playthrough: r.one.playthroughs({
			from: r.playthroughCompletions.playthroughId,
			to: r.playthroughs.id,
		}),
		user: r.one.users({
			from: r.playthroughCompletions.userId,
			to: r.users.id,
		}),
	},
	playthroughModuleSelections: {
		playthrough: r.one.playthroughs({
			from: r.playthroughModuleSelections.playthroughId,
			to: r.playthroughs.id,
		}),
	},
	playthroughs: {
		attempts: r.many.attemptRecords(),
		completion: r.one.playthroughCompletions({
			from: r.playthroughs.id,
			to: r.playthroughCompletions.playthroughId,
		}),
		moduleSelections: r.many.playthroughModuleSelections(),
		scenarioSnapshots: r.many.scenarioSnapshots(),
		user: r.one.users({
			from: r.playthroughs.userId,
			to: r.users.id,
		}),
		vod: r.one.vods({
			from: r.playthroughs.vodId,
			to: r.vods.id,
		}),
	},
	scenarioSnapshots: {
		attempts: r.many.attemptRecords(),
		playthrough: r.one.playthroughs({
			from: r.scenarioSnapshots.playthroughId,
			to: r.playthroughs.id,
		}),
	},
	scenarios: {
		vod: r.one.vods({
			from: r.scenarios.vodId,
			to: r.vods.id,
		}),
	},
	sessions: {
		user: r.one.users({
			from: r.sessions.userId,
			to: r.users.id,
		}),
	},
	users: {
		accounts: r.many.accounts(),
		sessions: r.many.sessions(),
	},
	vods: {
		scenarios: r.many.scenarios(),
	},
}));
