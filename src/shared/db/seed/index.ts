/**
 * Consolidates and exports database seeding utilities, environment safety assertions,
 * and test fixtures for development and automated testing environments.
 *
 * Serves as the public barrel for database seed operations. Re-exports `executeSeed`,
 * safety policy checkers `assertLocalSeedTarget` and `getSeedCredentials`, alongside
 * fixture accessors `getLocalFixtureVod` and `getLocalFixtureScenarios`.
 */

export {
	FIXTURE_IDS,
	FIXTURE_VOD,
	getLocalFixtureScenarios,
	getLocalFixtureVod,
} from "./fixtures";
export {
	assertLocalSeedTarget,
	getSeedCredentials,
	type SeedCredentials,
	type SeedEnvironment,
} from "./policy";
export { executeSeed } from "./seeder";
