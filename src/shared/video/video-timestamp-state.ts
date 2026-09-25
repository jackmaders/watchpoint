import {
	parseFiniteNonNegativeNumber,
	roundToPrecision,
} from "@/shared/lib/utils";

export const VOD_TIMESTAMP_SEARCH_PARAM = "timestamp";

export const VOD_TIMESTAMP_PRECISION_SECONDS = 0.001;

export const DEFAULT_VOD_TIMESTAMP_SECONDS = 0;

export function parseVodTimestamp(
	value: unknown,
	durationSeconds?: unknown,
): number {
	const timestampSeconds = parseFiniteNonNegativeNumber(value);
	if (timestampSeconds === null) {
		return DEFAULT_VOD_TIMESTAMP_SECONDS;
	}

	const roundedTimestamp = roundToPrecision(
		timestampSeconds,
		VOD_TIMESTAMP_PRECISION_SECONDS,
	);
	const duration = parseFiniteNonNegativeNumber(durationSeconds);
	if (duration === null || duration <= 0) {
		return roundedTimestamp;
	}

	return Math.min(
		roundedTimestamp,
		roundToPrecision(duration, VOD_TIMESTAMP_PRECISION_SECONDS),
	);
}
