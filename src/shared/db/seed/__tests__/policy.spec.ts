import { describe, expect, it } from "vitest";
import { assertLocalSeedTarget, getSeedCredentials } from "../policy";

describe("seed policy", () => {
	it("allows local execution with default local settings", () => {
		// Arrange
		const env = {
			NODE_ENV: "development",
			WATCHPOINT_SEED_TARGET: "local",
			WRANGLER_ENV: "local",
		};

		// Act
		const result = assertLocalSeedTarget(env);

		// Assert
		expect(result).toBe("local");
	});

	it("throws when direct DB targets are configured", () => {
		// Arrange
		const env = { DB: "d1-direct-binding" };

		// Act & Assert
		expect(() => assertLocalSeedTarget(env)).toThrow(
			"Refusing to seed: direct DB targets are not allowed",
		);
	});

	it("throws when running in production mode", () => {
		// Arrange
		const env = { NODE_ENV: "production" };

		// Act & Assert
		expect(() => assertLocalSeedTarget(env)).toThrow(
			"Refusing to seed: production mode is not allowed",
		);
	});

	it("throws when WATCHPOINT_SEED_TARGET is not local", () => {
		// Arrange
		const env = { WATCHPOINT_SEED_TARGET: "remote" };

		// Act & Assert
		expect(() => assertLocalSeedTarget(env)).toThrow(
			"Refusing to seed: WATCHPOINT_SEED_TARGET must be local",
		);
	});

	it("throws when WRANGLER_ENV or CLOUDFLARE_ENV is non-local", () => {
		// Arrange
		const env = { WRANGLER_ENV: "production" };

		// Act & Assert
		expect(() => assertLocalSeedTarget(env)).toThrow(
			"Refusing to seed: WRANGLER_ENV=production is not local",
		);
	});

	it("resolves default seed credentials when env is empty", () => {
		// Arrange
		const env = {};

		// Act
		const credentials = getSeedCredentials(env);

		// Assert
		expect(credentials.adminEmail).toBe("admin@local.watchpoint");
		expect(credentials.playerEmail).toBe("player@local.watchpoint");
	});

	it("resolves custom seed credentials from env overrides", () => {
		// Arrange
		const env = {
			WATCHPOINT_SEED_ADMIN_EMAIL: "custom_admin@test.com",
			WATCHPOINT_SEED_ADMIN_PASSWORD: "custom-admin-pass",
			WATCHPOINT_SEED_PLAYER_EMAIL: "custom_player@test.com",
			WATCHPOINT_SEED_PLAYER_PASSWORD: "custom-player-pass",
		};

		// Act
		const credentials = getSeedCredentials(env);

		// Assert
		expect(credentials.adminEmail).toBe("custom_admin@test.com");
		expect(credentials.adminPassword).toBe("custom-admin-pass");
		expect(credentials.playerEmail).toBe("custom_player@test.com");
		expect(credentials.playerPassword).toBe("custom-player-pass");
	});
});
