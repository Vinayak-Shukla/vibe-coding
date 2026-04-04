#!/usr/bin/env bash
set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Install npm deps if node_modules is missing
if [ ! -d "$PLUGIN_ROOT/node_modules" ]; then
  cd "$PLUGIN_ROOT"
  npm install --production --silent 2>/dev/null || true
fi

# Check dependencies
DEPS_OK=$(node "$PLUGIN_ROOT/bin/check-deps.js" 2>/dev/null) || true

if echo "$DEPS_OK" | grep -q "yt-dlp=ok"; then
  # Start daemon — this triggers pre-resolving tracks in the background
  node "$PLUGIN_ROOT/bin/client.js" status >/dev/null 2>&1 || true
fi

echo '{}'
