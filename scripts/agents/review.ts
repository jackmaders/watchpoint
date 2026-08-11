interface DiffState {
	path: string;
	rightLine: number;
}

function updateDiffHeader(line: string, state: DiffState): boolean {
	if (line.startsWith("+++ ")) {
		const path = line.slice(4);
		state.path = path === "/dev/null" ? "" : path.replace(/^b\//, "");
		return true;
	}

	if (line.startsWith("@@ ")) {
		const match = line.match(/^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
		if (match) state.rightLine = Number.parseInt(match[1], 10);
		return true;
	}

	return false;
}

function addDiffLine(
	line: string,
	state: DiffState,
	validLines: Set<string>,
): void {
	if (!state.path || state.rightLine < 1) return;

	if (line.startsWith("+") || line.startsWith(" ")) {
		validLines.add(`${state.path}:${state.rightLine}`);
		state.rightLine += 1;
		return;
	}

	if (!line.startsWith("-")) state.rightLine += 1;
}

/** Returns path/line keys that GitHub can accept on the diff's right side. */
export function parseDiff(diffText: string): Set<string> {
	const validLines = new Set<string>();
	const state: DiffState = { path: "", rightLine: 0 };

	for (const line of diffText.split(/\r?\n/)) {
		if (updateDiffHeader(line, state)) continue;
		addDiffLine(line, state, validLines);
	}

	return validLines;
}
