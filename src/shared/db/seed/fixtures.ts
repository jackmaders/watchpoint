export const FIXTURE_IDS = {
	adminUser: "usr_local_admin",
	playerUser: "usr_local_player",
	vod: "vod_local_fixture",
} as const;

export const FIXTURE_VOD = {
	durationSeconds: 600,
	heroName: "Ana",
	id: FIXTURE_IDS.vod,
	isPublished: true,
	mapName: "Local Test Map",
	rankTier: "Synthetic",
	role: "SUPPORT" as const,
	title: "Local Synthetic VOD Fixture",
	youtubeVideoId: "local-fixture-video",
} as const;

export function getLocalFixtureVod() {
	return {
		...FIXTURE_VOD,
		createdAt: new Date(),
	};
}

const FIXTURE_SCENARIOS = [
	{
		explanationText:
			"Use high ground to preserve sightlines and safe retreat options.",
		id: "scenario_local_strategy",
		moduleType: "STRATEGY" as const,
		promptText: "Where should the player position for the initial push?",
	},
	{
		explanationText:
			"Use the available cooldown during the short timing window.",
		id: "scenario_local_tactics",
		moduleType: "TACTICS" as const,
		promptText: "What is the immediate fight-winning decision?",
	},
	{
		explanationText:
			"Recent damage and fight timing indicate the ultimate is nearly ready.",
		id: "scenario_local_ultimate",
		moduleType: "ULTIMATE" as const,
		promptText: "What should you estimate about the enemy ultimate?",
	},
	{
		explanationText: "The ability was used recently and remains on cooldown.",
		id: "scenario_local_cooldown",
		moduleType: "COOLDOWN" as const,
		promptText: "Is the enemy defensive ability available?",
	},
	{
		explanationText: "Audio and team-position cues identify the flank route.",
		id: "scenario_local_spatial",
		moduleType: "SPATIAL" as const,
		promptText: "Where is the unseen threat most likely positioned?",
	},
] as const;

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
