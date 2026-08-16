export const OPENROUTER_DEFAULT_MODEL = "openrouter/free";
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const CODEX_CLI_VERSION = "0.147.0";

/**
 * The config deliberately contains no credential. Codex resolves the key at
 * runtime through the command, so this text is safe to bake into the image or
 * mount into an ephemeral CODEX_HOME.
 */
export function buildCodexConfig(model = OPENROUTER_DEFAULT_MODEL): string {
	return `model_provider = "openrouter"
model = "${model}"

[model_providers.openrouter]
name = "openrouter"
base_url = "${OPENROUTER_BASE_URL}"

[model_providers.openrouter.auth]
command = "sh"
args = ["-c", "echo $OPENROUTER_API_KEY"]
`;
}

export function validateCodexConfiguration(
	env: Record<string, string | undefined>,
): void {
	if (!env.OPENROUTER_API_KEY) {
		throw new Error(
			"Codex/OpenRouter requires OPENROUTER_API_KEY. Set it in the runtime environment; it is never stored in Sandcastle configuration.",
		);
	}
}
