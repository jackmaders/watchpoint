/**
 * Enforces safety guardrails and credential extraction policies to prevent database seed
 * operations against non-local or production environments.
 *
 * Implements seed execution safety rules. Exports `assertLocalSeedTarget` to inspect environment
 * variables and throw immediately if execution targets production or remote bindings, and `getSeedCredentials`
 * to resolve default or configured admin and player credentials for local testing.
 */

export interface SeedEnvironment {
	CLOUDFLARE_ENV?: string;
	DB?: string;
	NODE_ENV?: string;
	WATCHPOINT_SEED_TARGET?: string;
	WRANGLER_ENV?: string;
}

export interface SeedCredentials {
	adminEmail: string;
	adminPassword: string;
	playerEmail: string;
	playerPassword: string;
}

const LOCAL_ENVIRONMENTS = new Set(["", "development", "test", "local"]);

export function assertLocalSeedTarget(
	env: SeedEnvironment = process.env,
): "local" {
	if (env.DB) {
		throw new Error("Refusing to seed: direct DB targets are not allowed");
	}

	if (env.NODE_ENV === "production") {
		throw new Error("Refusing to seed: production mode is not allowed");
	}

	if (env.WATCHPOINT_SEED_TARGET && env.WATCHPOINT_SEED_TARGET !== "local") {
		throw new Error("Refusing to seed: WATCHPOINT_SEED_TARGET must be local");
	}

	for (const [name, value] of [
		["WRANGLER_ENV", env.WRANGLER_ENV],
		["CLOUDFLARE_ENV", env.CLOUDFLARE_ENV],
	] as const) {
		if (value && !LOCAL_ENVIRONMENTS.has(value)) {
			throw new Error(`Refusing to seed: ${name}=${value} is not local`);
		}
	}

	return "local";
}

export function getSeedCredentials(
	env: SeedEnvironment & Record<string, string | undefined> = process.env,
): SeedCredentials {
	return {
		adminEmail: env.WATCHPOINT_SEED_ADMIN_EMAIL ?? "admin@local.watchpoint",
		adminPassword: env.WATCHPOINT_SEED_ADMIN_PASSWORD ?? "local-admin-password",
		playerEmail: env.WATCHPOINT_SEED_PLAYER_EMAIL ?? "player@local.watchpoint",
		playerPassword:
			env.WATCHPOINT_SEED_PLAYER_PASSWORD ?? "local-player-password",
	};
}
