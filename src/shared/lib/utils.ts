export { cn } from "cn";

export function parseFiniteNonNegativeNumber(value: unknown): number | null {
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

export function roundToPrecision(value: number, precision: number): number {
	const factor = Math.round(1 / precision);
	return Math.round(value * factor) / factor;
}
