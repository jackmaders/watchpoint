export interface TimePollerPlayer {
	getCurrentTime(): number;
}

export interface TimePollerContext {
	getCurrentPlayer: () => TimePollerPlayer | undefined;
	isActiveGeneration: () => boolean;
	onTimeUpdate: (time: number) => void;
	setCurrentTime: (time: number) => void;
}

export function safeMediaValue(value: number): number {
	return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function createTimePoller({
	getCurrentPlayer,
	isActiveGeneration,
	onTimeUpdate,
	setCurrentTime,
}: TimePollerContext) {
	let animationFrameId: number | undefined;

	const stopPolling = () => {
		if (animationFrameId !== undefined) {
			window.cancelAnimationFrame(animationFrameId);
			animationFrameId = undefined;
		}
	};

	const sampleTime = () => {
		const player = getCurrentPlayer();
		if (!isActiveGeneration() || !player) {
			return;
		}
		const sampled = safeMediaValue(player.getCurrentTime());
		setCurrentTime(sampled);
		onTimeUpdate(sampled);
		animationFrameId = window.requestAnimationFrame(sampleTime);
	};

	const startPolling = () => {
		stopPolling();
		sampleTime();
	};

	return { startPolling, stopPolling };
}
