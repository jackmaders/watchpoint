import { vi } from "vitest";

export const Type = {
	ARRAY: "ARRAY",
	BOOLEAN: "BOOLEAN",
	INTEGER: "INTEGER",
	NUMBER: "NUMBER",
	OBJECT: "OBJECT",
	STRING: "STRING",
} as const;

export const mockGenerateContent = vi.fn().mockResolvedValue({
	text: "Mock Gemini response text",
});

export class GoogleGenAI {
	models = {
		generateContent: mockGenerateContent,
	};
}
