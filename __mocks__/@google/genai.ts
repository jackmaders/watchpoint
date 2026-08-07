import { vi } from "vitest";

export const mockGenerateContent = vi.fn().mockResolvedValue({
	text: "Mock Gemini response text",
});

export class GoogleGenAI {
	models = {
		generateContent: mockGenerateContent,
	};
}
