/** The URL search parameter used for a VOD's playback position.
 * @public
 */
export const VOD_TIMESTAMP_SEARCH_PARAM = "timestamp";

/** Timestamp values are represented in seconds, rounded to milliseconds.
 * @public
 */
export const VOD_TIMESTAMP_PRECISION_SECONDS = 0.001;

/** The safe playback position used when a timestamp cannot be parsed.
 * @public
 */
export const DEFAULT_VOD_TIMESTAMP_SECONDS = 0;

/**
 * Parses and bounds a VOD timestamp from URL or form input.
 *
 * Invalid timestamps resolve to zero. A valid duration caps the result, while
 * invalid durations are ignored because duration metadata may not be ready.
 * @public
 */
export function parseVodTimestamp(
	value: unknown,
	durationSeconds?: unknown,
): number {
	const timestampSeconds = parseFiniteNonNegativeNumber(value);
	if (timestampSeconds === null) {
		return DEFAULT_VOD_TIMESTAMP_SECONDS;
	}

	const roundedTimestamp = roundToPrecision(timestampSeconds);
	const duration = parseFiniteNonNegativeNumber(durationSeconds);
	if (duration === null) {
		return roundedTimestamp;
	}

	return Math.min(roundedTimestamp, roundToPrecision(duration));
}

function parseFiniteNonNegativeNumber(value: unknown): number | null {
	if (typeof value !== "number" && typeof value !== "string") {
		return null;
	}

	if (typeof value === "string" && value.trim() === "") {
		return null;
	}

	const parsedValue = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(parsedValue) || parsedValue < 0) {
		return null;
	}

	return parsedValue;
}

function roundToPrecision(value: number): number {
	return (
		Math.round(value / VOD_TIMESTAMP_PRECISION_SECONDS) *
		VOD_TIMESTAMP_PRECISION_SECONDS
	);
}
