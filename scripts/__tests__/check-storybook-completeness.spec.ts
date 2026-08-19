import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	checkCompleteness,
	discoverStoryFiles,
	validateWaivers,
} from "../check-storybook-completeness";

const buttonSurface = `
	export type { ButtonProps } from "./button";
	export { Button, buttonVariants } from "./button";
`;

const validButtonStory = `
	import type { Meta, StoryObj } from "@storybook/react-vite";
	import { Button } from "@/shared/ui";
	const meta = { component: Button, title: "Shared UI / Button" } satisfies Meta<typeof Button>;
	export default meta;
	type Story = StoryObj<typeof meta>;
	export const Default: Story = { args: { children: "Continue" } };
`;

describe("validateWaivers", () => {
	it("rejects incomplete, malformed, and expired waivers", () => {
		// Arrange
		const value = {
			waivers: [
				{ story: "shared-ui-button--default" },
				{
					expires: "2020-01-01",
					issue: "https://example.com/issue",
					owner: "team",
					reason: "false positive",
					ruleId: "color-contrast",
					story: "shared-ui-button--default",
				},
			],
		};

		// Act
		const errors = validateWaivers(value, new Date("2026-01-01T00:00:00.000Z"));

		// Assert
		expect(errors).toHaveLength(7);
	});

	it("accepts a complete, current Watchpoint waiver", () => {
		// Arrange
		const value = {
			waivers: [
				{
					expires: "2026-12-31",
					issue: "https://github.com/jackmaders/watchpoint/issues/274",
					owner: "accessibility guild",
					reason: "documented false positive",
					ruleId: "color-contrast",
					story: "shared-ui-button--default",
				},
			],
		};

		// Act
		const errors = validateWaivers(value, new Date("2026-01-01T00:00:00.000Z"));

		// Assert
		expect(errors).toEqual([]);
	});

	it("rejects malformed calendar dates", () => {
		// Arrange
		const value = {
			waivers: [
				{
					expires: "2026-02-30",
					issue: "https://github.com/jackmaders/watchpoint/issues/274",
					owner: "accessibility guild",
					reason: "documented false positive",
					ruleId: "color-contrast",
					story: "shared-ui-button--default",
				},
			],
		};

		// Act
		const errors = validateWaivers(value, new Date("2026-01-01T00:00:00.000Z"));

		// Assert
		expect(errors).toEqual(["waiver 1 has an invalid expiry date"]);
	});
});

describe("checkCompleteness", () => {
	it("accepts visual exports, explicit helper allowlists, and type-only exports", () => {
		// Arrange
		const root = "/tmp/storybook-completeness-valid";
		const files = new Map([
			[
				`${root}/src/shared/ui/__stories__/button.stories.tsx`,
				validButtonStory,
			],
		]);

		// Act
		const errors = checkCompleteness(root, {
			readFile: (path) =>
				path.endsWith("index.ts") ? buttonSurface : (files.get(path) ?? ""),
			storyFiles: [...files.keys()],
		});

		// Assert
		expect(errors).toEqual([]);
	});

	it("rejects stories with missing metadata, wrong components, or no default story", () => {
		// Arrange
		const root = "/tmp/storybook-completeness-invalid";
		const storyPath = `${root}/src/shared/ui/__stories__/button.stories.tsx`;
		const story = `export const Variants = {};`;

		// Act
		const errors = checkCompleteness(root, {
			readFile: (path) => (path.endsWith("index.ts") ? buttonSurface : story),
			storyFiles: [storyPath],
		});

		// Assert
		expect(errors).toEqual([
			"visual export Button has no matching story",
			"src/shared/ui/__stories__/button.stories.tsx must reference a visual shared UI export",
			"src/shared/ui/__stories__/button.stories.tsx must expose a valid default metadata export",
			"src/shared/ui/__stories__/button.stories.tsx must expose a Default story",
		]);
	});

	it("rejects malformed waiver JSON without throwing", () => {
		// Arrange
		const root = "/tmp/storybook-completeness-malformed-waiver";

		// Act
		const errors = checkCompleteness(root, {
			readFile: (path) => (path.endsWith("index.ts") ? buttonSurface : "{}"),
			storyFiles: [],
			waiverFile: "{",
		});

		// Assert
		expect(errors).toEqual([
			"visual export Button has no matching story",
			"accessibility waiver file contains invalid JSON",
		]);
	});
});

describe("discoverStoryFiles", () => {
	it("discovers every supported story below the shared UI root", () => {
		// Arrange
		const storyRoot = join(process.cwd(), "src/shared/ui/__stories__");

		// Act
		const stories = discoverStoryFiles(storyRoot);

		// Assert
		expect(stories).toEqual([`${storyRoot}/button.stories.tsx`]);
	});
});
