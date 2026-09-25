import {
	parseFiniteNonNegativeNumber,
	roundToPrecision,
} from "@/shared/lib/maths";

export function formatTime(value: number, precisionSeconds: number): string {
	const seconds = parseFiniteNonNegativeNumber(value) ?? 0;
	const precision = parseFiniteNonNegativeNumber(precisionSeconds);
	if (precision === null || precision === 0 || precision > 1) {
		return "0:00";
	}

	const roundedSeconds = roundToPrecision(seconds, precision);
	const wholeSeconds = Math.floor(roundedSeconds);
	const minutes = Math.floor(wholeSeconds / 60);
	const remainingSeconds = wholeSeconds % 60;
	const [coefficient = "0", exponent] = precision.toString().split("e");
	const precisionDigits = Math.max(
		0,
		(coefficient.split(".")[1]?.length ?? 0) - Number(exponent ?? 0),
	);
	const fractionalSeconds = roundedSeconds - wholeSeconds;
	const fraction =
		fractionalSeconds === 0
			? ""
			: `.${fractionalSeconds.toFixed(precisionDigits).slice(2)}`;
	return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}${fraction}`;
}
