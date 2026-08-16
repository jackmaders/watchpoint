# ==============================================================================
# Sandcastle Docker Isolation Container for Watchpoint
# ==============================================================================
FROM catthehacker/ubuntu:act-latest

# Install GitHub CLI (gh)
RUN mkdir -p -m 755 /etc/apt/keyrings \
	&& curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
	&& chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
	&& echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
	&& apt-get update \
	&& apt-get install -y --no-install-recommends gh \
	&& rm -rf /var/lib/apt/lists/*

# Install Bun package manager
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:/home/agent/.bun/bin:${PATH}"

# Install a reproducible Codex runtime in the image. The host's `codex`
# symlink is deliberately not mounted: its target lives in the host's global
# Node package tree and would break container isolation.
RUN bun add --global @openai/codex@0.147.0

# Ensure user directories exist for auth and tooling
RUN mkdir -p /root/.gemini /root/.local/bin /home/agent/.gemini /home/agent/.local/bin /home/agent/.codex \
	&& printf '%s\n' \
	'model_provider = "openrouter"' \
	'model = "openrouter/free"' \
	'' \
	'[model_providers.openrouter]' \
	'name = "openrouter"' \
	'base_url = "https://openrouter.ai/api/v1"' \
	'' \
	'[model_providers.openrouter.auth]' \
	'command = "sh"' \
	'args = ["-c", "echo $OPENROUTER_API_KEY"]' \
	> /home/agent/.codex/config.toml

ENV CODEX_HOME="/home/agent/.codex"

WORKDIR /workspace

CMD ["/bin/bash"]
