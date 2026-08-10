import { vi } from "vitest";

/**
 * Automock stand-in for `../logger`, per the repo's `__mocks__` convention
 * (`plugins/enforce-automocking.grit`). A spec that logs — directly or through
 * a collaborator — declares `vi.mock("../logger")` and gets silence plus
 * assertable calls, instead of the production logger having to know it is
 * under test.
 */
export const logger = {
	error: vi.fn(),
	log: vi.fn(),
	warn: vi.fn(),
};
