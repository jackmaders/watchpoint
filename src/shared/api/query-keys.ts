/**
 * Centralized React Query cache key definitions across application domains.
 *
 * Prevents key collision and enables predictable cross-screen query invalidation
 * without violating Feature-Sliced Design layer boundaries.
 */

export const queryKeys = {
	posts: ["posts"],
	users: ["users"],
} as const;
