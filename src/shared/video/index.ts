/**
 * @fileOverview Exposes the shared video cue integration's public API.
 *
 * Keeps the page dependent on cue synchronization rather than player-vendor internals.
 */

export { ReactPlayer } from "./react-player";
export type { VideoCue } from "./types";
export { useVideoCueSync } from "./use-video-cue-sync";
