import { describe, expect, it } from "vitest";
import { assertLocalSeedTarget, getSeedCredentials } from "../seed-policy";

describe("local seed policy", () => {
	it("accepts an explicit local target", () => {
		// Arrange
		const env = { WATCHPOINT_SEED_TARGET: "local" };

		// Act
		const target = assertLocalSeedTarget(env);

		// Assert
		expect(target).toBe("local");
	});

	it("rejects direct database targets", () => {
		// Arrange
		const env = { DB: "remote-binding" };

		// Act & Assert
		expect(() => assertLocalSeedTarget(env)).toThrow(
			/ direct DB targets are not allowed/,
		);
	});

	it("rejects production and deployed environments", () => {
		// Arrange
		const environments = [
			{ NODE_ENV: "production" },
			{ WRANGLER_ENV: "staging" },
			{ CLOUDFLARE_ENV: "preview" },
		];

		// Act & Assert
		for (const env of environments) {
			expect(() => assertLocalSeedTarget(env)).toThrow(/Refusing to seed/);
		}
	});

	it("rejects an explicitly non-local seed target", () => {
		// Arrange
		const env = { WATCHPOINT_SEED_TARGET: "production" };

		// Act & Assert
		expect(() => assertLocalSeedTarget(env)).toThrow(
			/WATCHPOINT_SEED_TARGET must be local/,
		);
	});

	it("returns safe local fixture credential defaults", () => {
		// Arrange

		// Act
		const credentials = getSeedCredentials({});

		// Assert
		expect(credentials).toEqual({
			adminEmail: "admin@local.watchpoint",
			adminPassword: "local-admin-password",
			playerEmail: "player@local.watchpoint",
			playerPassword: "local-player-password",
		});
	});
});
