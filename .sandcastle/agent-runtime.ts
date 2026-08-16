import { resolveAuthMounts } from "./auth-mounts";
import { OPENROUTER_DEFAULT_MODEL } from "./codex-config";
import type { AgentType, AuthMountsConfig, SandboxType } from "./types";

export interface AgentRuntimeOptions {
	readonly agent?: AgentType;
	readonly model?: string;
	readonly sandbox?: SandboxType;
	readonly imageName?: string;
	readonly dangerouslySkipPermissions?: boolean;
	readonly homeDir?: string;
	readonly authMountsConfig?: AuthMountsConfig;
}

export interface ResolvedAgentRuntime {
	readonly agent: AgentType;
	readonly model?: string;
	readonly sandbox: SandboxType;
	readonly imageName: string;
	readonly dangerouslySkipPermissions: boolean;
	readonly authMountsConfig: AuthMountsConfig;
}

export function resolveAgentRuntime(
	options: AgentRuntimeOptions = {},
): ResolvedAgentRuntime {
	const agent = options.agent ?? "agy";
	const sandbox = options.sandbox ?? "docker";
	return {
		agent,
		authMountsConfig:
			options.authMountsConfig ??
			resolveAuthMounts({ homeDir: options.homeDir }),
		dangerouslySkipPermissions:
			options.dangerouslySkipPermissions ?? sandbox === "docker",
		imageName:
			options.imageName ??
			process.env.SANDCASTLE_IMAGE ??
			"sandcastle:watchpoint",
		model:
			options.model ??
			(agent === "codex" ? OPENROUTER_DEFAULT_MODEL : undefined),
		sandbox,
	};
}
