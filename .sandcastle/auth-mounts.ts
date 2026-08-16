import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { MountConfig } from "@ai-hero/sandcastle";
import type { AuthMountsConfig } from "./types";

interface ResolveAuthMountsOptions {
	homeDir?: string;
	env?: Record<string, string | undefined>;
	agyPath?: string;
	existsSync?: (path: string) => boolean;
}

const FORWARDED_ENV_KEYS = [
	"GEMINI_API_KEY",
	"OPENAI_API_KEY",
	"OPENROUTER_API_KEY",
	"ANTHROPIC_API_KEY",
	"GITHUB_TOKEN",
	"GH_TOKEN",
	"CLAUDE_CODE_OAUTH_TOKEN",
];

function findCandidateAgyPath(
	homeDir: string,
	checkExists: (p: string) => boolean,
	customPath?: string,
): string | undefined {
	if (customPath && checkExists(customPath)) {
		return customPath;
	}
	const homeAgy = path.join(homeDir, ".local/bin/agy");
	if (checkExists(homeAgy)) {
		return homeAgy;
	}
	const sysAgy = "/usr/local/bin/agy";
	if (checkExists(sysAgy)) {
		return sysAgy;
	}
	return undefined;
}

function resolveForwardedEnv(
	source: Record<string, string | undefined>,
): Record<string, string> {
	const env: Record<string, string> = {
		HOME: "/home/agent",
		PATH: "/home/agent/.bun/bin:/home/agent/.local/bin:/opt/acttoolcache/node/24.17.0/x64/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
	};
	for (const key of FORWARDED_ENV_KEYS) {
		const val = source[key];
		if (val) {
			env[key] = val;
		}
	}
	return env;
}

export function resolveAuthMounts(
	options: ResolveAuthMountsOptions = {},
): AuthMountsConfig {
	const homeDir = options.homeDir || os.homedir();
	const envSource = options.env || process.env;
	const checkExists = options.existsSync || fs.existsSync;

	const mounts: MountConfig[] = [];

	const geminiDir = path.join(homeDir, ".gemini");
	if (checkExists(geminiDir)) {
		mounts.push({
			hostPath: geminiDir,
			readonly: false,
			sandboxPath: "/home/agent/.gemini",
		});
	}

	const agyPath = findCandidateAgyPath(homeDir, checkExists, options.agyPath);
	if (agyPath) {
		mounts.push({
			hostPath: agyPath,
			readonly: true,
			sandboxPath: "/home/agent/.local/bin/agy",
		});
	}

	const gitConfig = path.join(homeDir, ".gitconfig");
	if (checkExists(gitConfig)) {
		mounts.push({
			hostPath: gitConfig,
			readonly: true,
			sandboxPath: "/home/agent/.gitconfig",
		});
	}

	return {
		env: resolveForwardedEnv(envSource),
		mounts,
	};
}
