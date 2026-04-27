#!/usr/bin/env bash
# One-shot: npm install, build, default profile, install shim. Same goals as setup.ps1.
set -euo pipefail
ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
SHIM_NAME="${2:-u}"
cd "$ROOT"
npm install
npm run build
RUNNER="$ROOT/dist/run-config-cli.js"
test -f "$RUNNER" || { echo "missing $RUNNER" >&2; exit 1; }
CFG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/multiauth"
EXAMPLE="$ROOT/examples/profiles.example.yaml"
DEST="$CFG_DIR/profiles.yaml"
if [[ -f "$EXAMPLE" && ! -f "$DEST" ]]; then
  mkdir -p "$CFG_DIR"
  cp "$EXAMPLE" "$DEST"
  echo "Created $DEST (edit before use)" >&2
fi
"$(dirname "$0")/install-shim.sh" "$SHIM_NAME" "$RUNNER"
echo "Set MULTIAUTH_PROFILE or use --profile. Config: $DEST" >&2
