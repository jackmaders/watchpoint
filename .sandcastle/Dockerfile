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

# Install a reproducible Codex runtime for Sandcastle's non-root runtime user.
# The host's `codex` symlink is deliberately not mounted: its target lives in
# the host's global Node package tree and would break container isolation.
RUN mkdir -p /home/agent/.bun \
	&& chown -R 1000:1000 /home/agent/.bun \
	&& BUN_INSTALL=/home/agent/.bun bun add --global @openai/codex@0.147.0 \
	&& chown -R 1000:1000 /home/agent/.bun

# Ensure user directories exist for auth and tooling
RUN mkdir -p /root/.gemini /root/.local/bin /home/agent/.gemini /home/agent/.local/bin /home/agent/.codex
COPY .sandcastle/codex-entrypoint.sh /usr/local/bin/sandcastle-codex-entrypoint
RUN chmod +x /usr/local/bin/sandcastle-codex-entrypoint \
	&& chown -R 1000:1000 /home/agent/.codex

ENV CODEX_HOME="/home/agent/.codex"
# Keep Sandcastle's global Git safety configuration writable without allowing
# the agent to modify the host's mounted ~/.gitconfig.
ENV GIT_CONFIG_GLOBAL="/tmp/sandcastle-gitconfig"

WORKDIR /workspace

ENTRYPOINT ["/usr/local/bin/sandcastle-codex-entrypoint"]
