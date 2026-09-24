export const completeQuestionSnapshot = {
	questionId: "question-1",
	prompt: "What is the best move?",
	explanation: "Take the safe angle before committing.",
	timestampSeconds: 42,
	skillId: "skill-strategy",
	skillName: "Strategy",
	skillSlug: "strategy",
	options: [
		{
			id: "option-1",
			orderIndex: 0,
			text: "Hold the angle",
			isCorrect: true,
		},
		{
			id: "option-2",
			orderIndex: 1,
			text: "Push immediately",
			isCorrect: false,
		},
	],
	selectedOption: {
		id: "option-2",
		orderIndex: 1,
		text: "Push immediately",
		isCorrect: false,
	},
} as const;

export const legacyQuestionSnapshot = {
	questionId: "question-1",
	prompt: "What is the best move?",
	explanation: "Take the safe angle before committing.",
	timestampSeconds: 42,
	skillId: "skill-strategy",
	skillName: "Strategy",
	options: [
		{ id: "option-1", text: "Hold the angle", isCorrect: true },
		{ id: "option-2", text: "Push immediately", isCorrect: false },
	],
} as const;

export const invalidQuestionSnapshot = {
	...completeQuestionSnapshot,
	options: completeQuestionSnapshot.options.map((option) => ({
		...option,
		orderIndex: 1,
	})),
} as const;
