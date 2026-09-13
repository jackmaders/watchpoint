/**
 * Tests queryKeys definitions for client caching and invalidations.
 *
 * Verifies key structures for posts, users, audit, and vod query domains.
 */

import { describe, expect, it } from "vitest";
import { queryKeys } from "../query-keys";

describe("queryKeys", () => {
	it("exposes canonical cache key arrays", () => {
		// Arrange
		const expectedAdminVods = ["admin-vods"];
		const expectedAudit = ["audit"];
		const expectedHome = ["home"];
		const expectedPosts = ["posts"];
		const expectedScenarios = ["scenarios"];
		const expectedUsers = ["users"];
		const expectedVods = ["vods"];

		// Act
		const { adminVods, audit, home, posts, scenarios, users, vods } = queryKeys;

		// Assert
		expect(adminVods).toEqual(expectedAdminVods);
		expect(audit).toEqual(expectedAudit);
		expect(home).toEqual(expectedHome);
		expect(posts).toEqual(expectedPosts);
		expect(scenarios).toEqual(expectedScenarios);
		expect(users).toEqual(expectedUsers);
		expect(vods).toEqual(expectedVods);
	});
});
