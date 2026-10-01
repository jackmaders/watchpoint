import Database from "better-sqlite3";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { afterEach, describe, expect, test, vi } from "vitest";
import { relations } from "@/shared/db";
import {
	getDemoVodHandler,
	getVodByIdHandler,
	getVodLessonAccessHandler,
	publishedVodListHandler,
} from "../api/vod-handlers";

vi.mock("@/shared/db/index.server", () => ({ getDb: vi.fn() }));

const databases: Database.Database[] = [];

afterEach(() => {
	for (const database of databases.splice(0)) {
		database.close();
	}
});

// biome-ignore lint/security/noSecrets: This is a function name, not a credential.
describe("publishedVodListHandler", () => {
	test("returns no VODs when the database has no published VODs", async () => {
		const db = createDatabase();

		// biome-ignore lint/nursery/noUnsafeTypeAssertion: The test uses an equivalent in-memory SQLite driver.
		expect(await publishedVodListHandler(db as never)).toEqual([]);
	});

	test("excludes unpublished VODs", async () => {
		const db = createDatabase();
		insertVod(db, { id: "unpublished", isPublished: 0 });

		// biome-ignore lint/nursery/noUnsafeTypeAssertion: The test uses an equivalent in-memory SQLite driver.
		expect(await publishedVodListHandler(db as never)).toEqual([]);
	});

	test("returns published VOD metadata with its Question count and unique Skills", async () => {
		const db = createDatabase();
		insertSkill(db, "strategy", "Strategy");
		insertSkill(db, "tactics", "Tactics");
		insertVod(db, { id: "published", isPublished: 1 });
		insertQuestion(db, "question-1", "published", "strategy");
		insertQuestion(db, "question-2", "published", "strategy");
		insertQuestion(db, "question-3", "published", "tactics");

		// biome-ignore lint/nursery/noUnsafeTypeAssertion: The test uses an equivalent in-memory SQLite driver.
		expect(await publishedVodListHandler(db as never)).toEqual([
			{
				id: "published",
				title: "Published VOD",
				youtubeId: "video-id",
				durationSeconds: 212,
				isDemo: false,
				isPublished: true,
				createdAt: new Date(1),
				updatedAt: new Date(1),
				questionCount: 3,
				skills: [
					{
						id: "strategy",
						name: "Strategy",
						slug: "strategy",
						createdAt: new Date(1),
						updatedAt: new Date(1),
					},
					{
						id: "tactics",
						name: "Tactics",
						slug: "tactics",
						createdAt: new Date(1),
						updatedAt: new Date(1),
					},
				],
			},
		]);
	});
});

describe("getDemoVodHandler", () => {
	test("returns null when no demo VOD exists", async () => {
		const db = createDatabase();

		// biome-ignore lint/nursery/noUnsafeTypeAssertion: The test uses an equivalent in-memory SQLite driver.
		expect(await getDemoVodHandler(db as never)).toBeNull();
	});

	test("returns the designated demo VOD", async () => {
		const db = createDatabase();
		insertVod(db, { id: "standard", isPublished: 1, isDemo: 0 });
		insertVod(db, { id: "demo", isPublished: 1, isDemo: 1 });

		// biome-ignore lint/nursery/noUnsafeTypeAssertion: The test uses an equivalent in-memory SQLite driver.
		const demoVod = await getDemoVodHandler(db as never);
		expect(demoVod?.id).toBe("demo");
		expect(demoVod?.isDemo).toBe(true);
	});
});

// biome-ignore lint/security/noSecrets: This is a function name, not a credential.
describe("getVodByIdHandler", () => {
	test("returns null when VOD does not exist", async () => {
		const db = createDatabase();

		// biome-ignore lint/nursery/noUnsafeTypeAssertion: The test uses an equivalent in-memory SQLite driver.
		expect(await getVodByIdHandler("non-existent", db as never)).toBeNull();
	});

	test("returns VOD by id", async () => {
		const db = createDatabase();
		insertVod(db, { id: "target-vod", isPublished: 1 });

		// biome-ignore lint/nursery/noUnsafeTypeAssertion: The test uses an equivalent in-memory SQLite driver.
		const vod = await getVodByIdHandler("target-vod", db as never);
		expect(vod?.id).toBe("target-vod");
	});
});

describe("getVodLessonAccessHandler", () => {
	const userSession = {
		user: {
			id: "user-1",
			role: "user",
		},
	};

	test("returns demo access result for anonymous guest on demo VOD", async () => {
		const db = createDatabase();
		insertVod(db, { id: "demo-vod", isPublished: 1, isDemo: 1 });

		const result = await getVodLessonAccessHandler(
			{ vodId: "demo-vod", session: null },
			// biome-ignore lint/nursery/noUnsafeTypeAssertion: The test uses an equivalent in-memory SQLite driver.
			db as never,
		);

		expect(result).toEqual({
			status: "allow",
			mode: "demo",
			vod: expect.objectContaining({ id: "demo-vod", isDemo: true }),
		});
	});

	test("returns redirect result for anonymous guest on standard VOD", async () => {
		const db = createDatabase();
		insertVod(db, { id: "standard-vod", isPublished: 1, isDemo: 0 });

		const result = await getVodLessonAccessHandler(
			{ vodId: "standard-vod", session: null, returnTo: "/vods/standard-vod" },
			// biome-ignore lint/nursery/noUnsafeTypeAssertion: The test uses an equivalent in-memory SQLite driver.
			db as never,
		);

		expect(result).toEqual({
			status: "redirect",
			to: "/",
			returnTo: "/vods/standard-vod",
		});
	});

	test("returns standard access result for authenticated User on published VOD", async () => {
		const db = createDatabase();
		insertVod(db, { id: "standard-vod", isPublished: 1, isDemo: 0 });

		const result = await getVodLessonAccessHandler(
			{ vodId: "standard-vod", session: userSession },
			// biome-ignore lint/nursery/noUnsafeTypeAssertion: The test uses an equivalent in-memory SQLite driver.
			db as never,
		);

		expect(result).toEqual({
			status: "allow",
			mode: "standard",
			vod: expect.objectContaining({ id: "standard-vod", isDemo: false }),
		});
	});

	test("returns not-found result when VOD does not exist", async () => {
		const db = createDatabase();

		const result = await getVodLessonAccessHandler(
			{ vodId: "missing-vod", session: userSession },
			// biome-ignore lint/nursery/noUnsafeTypeAssertion: The test uses an equivalent in-memory SQLite driver.
			db as never,
		);

		expect(result).toEqual({
			status: "not-found",
		});
	});
});

function createDatabase() {
	const database = new Database(":memory:");
	databases.push(database);
	const db = drizzle({ client: database, relations });
	db.run(sql`
		CREATE TABLE vods (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			youtube_id TEXT NOT NULL,
			duration_seconds INTEGER NOT NULL,
			is_demo INTEGER NOT NULL,
			is_published INTEGER NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		)
	`);
	db.run(sql`
		CREATE TABLE skills (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			slug TEXT NOT NULL,
			created_at INTEGER NOT NULL DEFAULT 1,
			updated_at INTEGER NOT NULL DEFAULT 1
		)
	`);
	db.run(sql`
		CREATE TABLE questions (
			id TEXT PRIMARY KEY,
			vod_id TEXT NOT NULL,
			skill_id TEXT NOT NULL,
			timestamp_seconds INTEGER NOT NULL,
			prompt TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		)
	`);
	return db;
}

function insertVod(
	db: ReturnType<typeof createDatabase>,
	values: { id: string; isPublished: 0 | 1; isDemo?: 0 | 1 },
) {
	db.run(
		sql`INSERT INTO vods (id, title, youtube_id, duration_seconds, is_demo, is_published, created_at, updated_at)
			VALUES (${values.id}, 'Published VOD', 'video-id', 212, ${values.isDemo ?? 0}, ${values.isPublished}, 1, 1)`,
	);
}

function insertSkill(
	db: ReturnType<typeof createDatabase>,
	id: string,
	name: string,
) {
	db.run(
		sql`INSERT INTO skills (id, name, slug) VALUES (${id}, ${name}, ${id})`,
	);
}

function insertQuestion(
	db: ReturnType<typeof createDatabase>,
	id: string,
	vodId: string,
	skillId: string,
) {
	db.run(
		sql`INSERT INTO questions (id, vod_id, skill_id, timestamp_seconds, prompt, created_at, updated_at)
			VALUES (${id}, ${vodId}, ${skillId}, 10, 'Question', 1, 1)`,
	);
}
