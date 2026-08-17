import { resolveAuthMounts } from "./auth-mounts";
import {
	type CodexProvider,
	resolveCodexModel,
	resolveCodexProvider,
	validateCodexModel,
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
	const model =
		agent === "codex"
			? resolveCodexModel(codexProvider, options.model)
			: options.model;
	if (agent === "codex") {
		validateCodexModel(codexProvider, model as string);
	}
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
		model,
		sandbox,
	};
}
