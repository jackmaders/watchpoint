/**
 * Centralized React Query cache key definitions across application domains.
 *
 * Prevents key collision and enables predictable cross-screen query invalidation
 * without violating Feature-Sliced Design layer boundaries.
 */

export const queryKeys = {
	adminVods: ["admin-vods"],
	audit: ["audit"],
	history: ["history"],
	historyDetail: ["history-detail"],
	home: ["home"],
	posts: ["posts"],
	scenarios: ["scenarios"],
	sessionPlaythrough: ["session-playthrough"],
	users: ["users"],
	vods: ["vods"],
} as const;
