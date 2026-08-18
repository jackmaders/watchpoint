import type { ModuleType } from "./schema";

export const FIXTURE_IDS = {
	adminUser: "usr_local_admin",
	playerUser: "usr_local_player",
	vod: "vod_local_fixture",
} as const;

const FIXTURE_SCENARIOS: ReadonlyArray<{
	explanationText: string;
	id: string;
	moduleType: ModuleType;
	promptText: string;
}> = [
	{
		explanationText:
			"Use high ground to preserve sightlines and safe retreat options.",
		id: "scenario_local_strategy",
		moduleType: "STRATEGY",
		promptText: "Where should the player position for the initial push?",
	},
	{
		explanationText:
			"Use the available cooldown during the short timing window.",
		id: "scenario_local_tactics",
		moduleType: "TACTICS",
		promptText: "What is the immediate fight-winning decision?",
	},
	{
		explanationText:
			"Recent damage and fight timing indicate the ultimate is nearly ready.",
		id: "scenario_local_ultimate",
		moduleType: "ULTIMATE",
		promptText: "What should you estimate about the enemy ultimate?",
	},
	{
		explanationText: "The ability was used recently and remains on cooldown.",
		id: "scenario_local_cooldown",
		moduleType: "COOLDOWN",
		promptText: "Is the enemy defensive ability available?",
	},
	{
		explanationText: "Audio and team-position cues identify the flank route.",
		id: "scenario_local_spatial",
		moduleType: "SPATIAL",
		promptText: "Where is the unseen threat most likely positioned?",
	},
];

export function getLocalFixtureScenarios(vodId: string) {
	return FIXTURE_SCENARIOS.map((scenario, index) => ({
		explanationText: scenario.explanationText,
		id: scenario.id,
		inputConfig: {
			options: [
				{ id: "correct", is_correct: true, text: "Best decision" },
				{ id: "other", is_correct: false, text: "Other decision" },
			],
		},
		inputType: "MULTIPLE_CHOICE" as const,
		moduleType: scenario.moduleType,
		promptText: scenario.promptText,
		timestampSeconds: 60 + index * 60,
		vodId,
	}));
}
