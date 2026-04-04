#!/usr/bin/env bash
set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

export VIBE_AUTO_STOP=1
node "$PLUGIN_ROOT/bin/client.js" stop >/dev/null 2>&1 || true

echo '{}'
