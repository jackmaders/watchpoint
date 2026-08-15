# ==============================================================================
# Sandcastle Docker Isolation Container for Watchpoint
# ==============================================================================
FROM catthehacker/ubuntu:act-latest

# Install Bun package manager
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:/home/agent/.bun/bin:${PATH}"

# Ensure user directories exist for auth and tooling
RUN mkdir -p /root/.gemini /root/.local/bin /home/agent/.gemini /home/agent/.local/bin

WORKDIR /workspace

CMD ["/bin/bash"]
