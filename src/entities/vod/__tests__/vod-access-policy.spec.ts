import { describe, expect, test } from "vitest";
import { evaluateVodLessonAccess } from "../model/vod-access-policy";

describe("evaluateVodLessonAccess", () => {
	const demoVod = {
		id: "vod-demo",
		isDemo: true,
		isPublished: true,
	};

	const standardVod = {
		id: "vod-standard",
		isDemo: false,
		isPublished: true,
	};

	const unpublishedVod = {
		id: "vod-draft",
		isDemo: false,
		isPublished: false,
	};

	const userSession = {
		user: {
			id: "user-1",
			role: "user",
		},
	};

	test("permits anonymous access to the designated demo VOD", () => {
		const result = evaluateVodLessonAccess({
			vod: demoVod,
			session: null,
			returnTo: "/vods/vod-demo",
		});

		expect(result).toEqual({
			status: "allow",
			mode: "demo",
		});
	});

	test("permits authenticated User access to the designated demo VOD", () => {
		const result = evaluateVodLessonAccess({
			vod: demoVod,
			session: userSession,
			returnTo: "/vods/vod-demo",
		});

		expect(result).toEqual({
			status: "allow",
			mode: "demo",
		});
	});

	test("redirects unauthenticated guest accessing standard VOD while preserving return destination", () => {
		const result = evaluateVodLessonAccess({
			vod: standardVod,
			session: null,
			returnTo: "/vods/vod-standard",
		});

		expect(result).toEqual({
			status: "redirect",
			to: "/",
			returnTo: "/vods/vod-standard",
		});
	});

	test("permits authenticated User to access published standard VOD", () => {
		const result = evaluateVodLessonAccess({
			vod: standardVod,
			session: userSession,
			returnTo: "/vods/vod-standard",
		});

		expect(result).toEqual({
			status: "allow",
			mode: "standard",
		});
	});

	test("returns not-found when VOD does not exist", () => {
		const result = evaluateVodLessonAccess({
			vod: null,
			session: userSession,
			returnTo: "/vods/non-existent",
		});

		expect(result).toEqual({
			status: "not-found",
		});
	});

	test("returns not-found for unauthenticated guest on missing demo VOD", () => {
		const result = evaluateVodLessonAccess({
			vod: null,
			session: null,
			returnTo: "/demo",
		});

		expect(result).toEqual({
			status: "not-found",
		});
	});

	test("returns not-found for published:false standard VOD for regular User", () => {
		const result = evaluateVodLessonAccess({
			vod: unpublishedVod,
			session: userSession,
			returnTo: "/vods/vod-draft",
		});

		expect(result).toEqual({
			status: "not-found",
		});
	});
});
