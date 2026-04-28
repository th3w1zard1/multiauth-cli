#!/usr/bin/env bash
# Revert install recorded in install-state.json (shims, PATH on Windows, Cursor files, state).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$ROOT/scripts/uninstall.mjs" "$@"
