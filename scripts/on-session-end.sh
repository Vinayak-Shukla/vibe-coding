#!/usr/bin/env bash
set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

node "$PLUGIN_ROOT/bin/client.js" shutdown >/dev/null 2>&1 || true

echo '{}'
