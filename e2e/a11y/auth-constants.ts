import { resolve } from "node:path";

export const authDir = resolve(process.cwd(), ".auth");
export const playerStoragePath = resolve(authDir, "player.json");
export const adminStoragePath = resolve(authDir, "admin.json");
