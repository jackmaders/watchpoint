import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
	const validSeconds = Math.max(
		0,
		Math.floor(Number.isFinite(seconds) ? seconds : 0),
	);
	const mins = Math.floor(validSeconds / 60);
	const secs = validSeconds % 60;
	const paddedSecs = secs < 10 ? `0${secs}` : `${secs}`;
	return `${mins}m ${paddedSecs}s`;
}
