export interface VisibilitySyncPlayer {
	pauseVideo(): void;
}

export function bindVisibilitySync(
	getCurrentPlayer: () => VisibilitySyncPlayer | undefined,
	isActiveGeneration: () => boolean,
) {
	const handleVisibilityChange = () => {
		const player = getCurrentPlayer();
		if (!isActiveGeneration() || !player) {
			return;
		}
		if (document.visibilityState === "hidden" || document.hidden) {
			player.pauseVideo();
		}
	};

	document.addEventListener("visibilitychange", handleVisibilityChange);
	return () => {
		document.removeEventListener("visibilitychange", handleVisibilityChange);
	};
}
