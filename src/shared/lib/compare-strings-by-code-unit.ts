export function compareStringsByCodeUnit(left: string, right: string) {
	if (left < right) {
		return -1;
	}

	return left > right ? 1 : 0;
}
