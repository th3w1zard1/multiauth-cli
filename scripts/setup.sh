#!/usr/bin/env bash
# One-shot: npm install, build, then either declarative apply-install (YAML) or legacy profile + one shim.
# Usage:
#   setup.sh [repo_root] [shim_name]              # legacy
#   setup.sh --config <install.yaml> [repo_root]  # declarative
#   MULTIAUTH_INSTALL_CONFIG=path setup.sh [repo_root]
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DEFAULT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_CANDIDATE=""
if [[ "${1:-}" == "--config" ]]; then
  [[ -n "${2:-}" ]] || { echo "usage: $0 --config <install.yaml> [repo_root]" >&2; exit 1; }
  CONFIG_CANDIDATE="$2"
  shift 2
fi
ROOT="${1:-$ROOT_DEFAULT}"
SHIM_NAME="${2:-u}"
cd "$ROOT" || { echo "bad repo root: $ROOT" >&2; exit 1; }

if [[ -n "$CONFIG_CANDIDATE" || -n "${MULTIAUTH_INSTALL_CONFIG:-}" ]]; then
  RAW="${CONFIG_CANDIDATE:-$MULTIAUTH_INSTALL_CONFIG}"
  C=""
  if [[ -f "$RAW" ]]; then
    C="$(cd "$(dirname "$RAW")" && pwd)/$(basename "$RAW")"
  elif [[ -f "$ROOT/$RAW" ]]; then
    C="$(cd "$(dirname "$ROOT/$RAW")" && pwd)/$(basename "$ROOT/$RAW")"
  else
    echo "config not found: $RAW" >&2
    exit 1
  fi
  npm install
  npm run build
  node "$ROOT/scripts/apply-install.mjs" "$C" "$ROOT"
  exit 0
fi
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
"$SCRIPT_DIR/install-shim.sh" "$SHIM_NAME" "$RUNNER"
echo "Set MULTIAUTH_PROFILE or use --profile. Config: $DEST" >&2
