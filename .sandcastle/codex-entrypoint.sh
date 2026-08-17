#!/bin/sh
set -eu

provider="${CODEX_PROVIDER:-openrouter}"
model="${CODEX_MODEL:-}"

case "$provider" in
	openai)
		[ -n "$model" ] || model="gpt-5.3-codex"
		cat > /home/agent/.codex/config.toml <<EOF
model_provider = "openai"
model = "$model"

[model_providers.openai]
name = "openai"
base_url = "https://api.openai.com/v1"
[model_providers.openai.auth]
command = "sh"
args = ["-c", "echo \$OPENAI_API_KEY"]
EOF
		;;
	openrouter)
		[ -n "$model" ] || model="openrouter/free"
		cat > /home/agent/.codex/config.toml <<EOF
model_provider = "openrouter"
model = "$model"

[model_providers.openrouter]
name = "openrouter"
base_url = "https://openrouter.ai/api/v1"
[model_providers.openrouter.auth]
command = "sh"
args = ["-c", "echo \$OPENROUTER_API_KEY"]
EOF
		;;
	*)
		echo "Unsupported CODEX_PROVIDER: $provider" >&2
		exit 2
		;;
esac

cp /home/agent/.gitconfig /tmp/sandcastle-gitconfig 2>/dev/null || true
exec sleep infinity
