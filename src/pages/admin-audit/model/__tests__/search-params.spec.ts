import { describe, expect, it } from "vitest";
import {
	toGetAdminAuditLogsQuery,
	validateAuditSearch,
} from "../search-params";

describe("audit search-params", () => {
	it("validates valid search params correctly", () => {
		// Arrange & Act
		const result = validateAuditSearch({
			action: "VOD_PUBLISHED",
			search: "admin",
		});

		// Assert
		expect(result).toEqual({
			action: "VOD_PUBLISHED",
			search: "admin",
		});
	});

	it("toGetAdminAuditLogsQuery converts search params to repository query", () => {
		// Arrange & Act
		const querySpecific = toGetAdminAuditLogsQuery({
			action: "VOD_DELETED",
			search: "test",
		});
		const queryAll = toGetAdminAuditLogsQuery({
			action: "ALL",
		});

		// Assert
		expect(querySpecific).toEqual({
			action: "VOD_DELETED",
			search: "test",
		});
		expect(queryAll).toEqual({
			action: undefined,
			search: undefined,
		});
	});

	it("handles invalid or undefined input gracefully", () => {
		// Arrange & Act
		const fromUndefined = validateAuditSearch(undefined);
		const fromEmpty = validateAuditSearch({});
		const fromInvalid = validateAuditSearch(
			"invalid" as unknown as Record<string, unknown>,
		);
		const fromBadSchema = validateAuditSearch({
			action: 12345 as unknown as string,
		});

		// Assert
		expect(fromUndefined).toEqual({});
		expect(fromEmpty).toEqual({});
		expect(fromInvalid).toEqual({});
		expect(fromBadSchema).toEqual({});
	});
});
