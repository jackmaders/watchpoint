import { resolveAuthMounts } from "./auth-mounts";
import {
	type CodexProvider,
	defaultCodexModel,
	resolveCodexProvider,
} from "./codex-config";
import type { AgentType, AuthMountsConfig, SandboxType } from "./types";

export interface AgentRuntimeOptions {
	readonly agent?: AgentType;
	readonly model?: string;
	readonly codexProvider?: CodexProvider;
	readonly sandbox?: SandboxType;
	readonly imageName?: string;
	readonly dangerouslySkipPermissions?: boolean;
	readonly homeDir?: string;
	readonly authMountsConfig?: AuthMountsConfig;
}

export interface ResolvedAgentRuntime {
	readonly agent: AgentType;
	readonly model?: string;
	readonly codexProvider: CodexProvider;
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
	const codexProvider = resolveCodexProvider(options.codexProvider);
	return {
		agent,
		authMountsConfig:
			options.authMountsConfig ??
			resolveAuthMounts({ homeDir: options.homeDir }),
		codexProvider,
		dangerouslySkipPermissions:
			options.dangerouslySkipPermissions ?? sandbox === "docker",
		imageName:
			options.imageName ??
			process.env.SANDCASTLE_IMAGE ??
			"sandcastle:watchpoint",
		model:
			options.model ??
			(agent === "codex" ? defaultCodexModel(codexProvider) : undefined),
		sandbox,
	};
}
