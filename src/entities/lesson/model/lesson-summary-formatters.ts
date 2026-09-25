import type { SkillSummary } from "./lesson-summary-types";

export function formatSkillSummary({
	skillId,
	percentage,
}: SkillSummary): string {
	return `${skillId}: ${percentage}%`;
}
