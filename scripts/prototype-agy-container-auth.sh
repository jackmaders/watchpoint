#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# PROTOTYPE: Antigravity CLI Auth in Docker Container
# Purpose: Verify Google subscription OAuth token sharing from host into Docker
# ==============================================================================

echo "=== [PROTOTYPE] Testing Antigravity (agy) Docker Auth Sharing ==="

# 1. Check host credentials
if [ ! -f "$HOME/.gemini/antigravity-cli/antigravity-oauth-token" ]; then
  echo "❌ Error: Host OAuth token not found at ~/.gemini/antigravity-cli/antigravity-oauth-token"
  exit 1
fi
echo "✓ Host OAuth token detected"

# 2. Check agy binary
AGY_BIN="$(which agy 2>/dev/null || echo "$HOME/.local/bin/agy")"
if [ ! -f "$AGY_BIN" ]; then
  echo "❌ Error: agy binary not found"
  exit 1
fi
echo "✓ agy binary found at $AGY_BIN"

# 3. Run container test with volume mounted credentials
echo "Running agy inside Docker with mounted ~/.gemini..."
docker run --rm \
  -v "$AGY_BIN:/usr/local/bin/agy:ro" \
  -v "$HOME/.gemini:/root/.gemini" \
  -e HOME=/root \
  catthehacker/ubuntu:act-latest \
  /usr/local/bin/agy -p "Respond with: 'SUCCESS: Google subscription auth is fully operational inside the container.'" --dangerously-skip-permissions

echo "=== [PROTOTYPE COMPLETED] Auth sharing is confirmed working ==="
