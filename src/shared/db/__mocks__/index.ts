import { vi } from "vitest";
import { moduleTypeEnum } from "../schema";

export const getPublishedVods = vi.fn(async () => []);
export const getSessionManifest = vi.fn(async () => null);
export const createPlaythrough = vi.fn(async () => ({ id: "playthrough_1" }));
export const completePlaythrough = vi.fn(async () => ({ id: "completion_1" }));
export { moduleTypeEnum };
