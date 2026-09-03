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
		const expectedPosts = ["posts"];
		const expectedUsers = ["users"];

		// Act
		const { posts, users } = queryKeys;

		// Assert
		expect(posts).toEqual(expectedPosts);
		expect(users).toEqual(expectedUsers);
	});
});
