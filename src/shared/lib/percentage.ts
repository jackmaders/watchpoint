export function percentage(numerator: number, denominator: number): number {
	if (denominator === 0) {
		return 0;
	}

	return Math.round((numerator / denominator) * 10000) / 100;
}
