/**
 * Tests queryKeys definitions for client caching and invalidations.
 *
 * Verifies key structures for posts, users, audit, vod, history, and session playthrough query domains.
 */

import { describe, expect, it } from "vitest";
import { queryKeys } from "../query-keys";

describe("queryKeys", () => {
	it("exposes canonical cache key arrays", () => {
		// Arrange
		const expectedAdminVods = ["admin-vods"];
		const expectedAudit = ["audit"];
		const expectedHistory = ["history"];
		const expectedHistoryDetail = ["history-detail"];
		const expectedHome = ["home"];
		const expectedPosts = ["posts"];
		const expectedScenarios = ["scenarios"];
		const expectedSessionPlaythrough = ["session-playthrough"];
		const expectedUsers = ["users"];
		const expectedVods = ["vods"];

		// Act
		const {
			adminVods,
			audit,
			history,
			historyDetail,
			home,
			posts,
			scenarios,
			sessionPlaythrough,
			users,
			vods,
		} = queryKeys;

		// Assert
		expect(adminVods).toEqual(expectedAdminVods);
		expect(audit).toEqual(expectedAudit);
		expect(history).toEqual(expectedHistory);
		expect(historyDetail).toEqual(expectedHistoryDetail);
		expect(home).toEqual(expectedHome);
		expect(posts).toEqual(expectedPosts);
		expect(scenarios).toEqual(expectedScenarios);
		expect(sessionPlaythrough).toEqual(expectedSessionPlaythrough);
		expect(users).toEqual(expectedUsers);
		expect(vods).toEqual(expectedVods);
	});
});
