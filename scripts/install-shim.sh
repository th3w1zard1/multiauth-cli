#!/usr/bin/env bash
# Idempotent: writes bin_dir/<name> and suggests PATH if missing.
# Usage: install-shim.sh <shim_basename> <path-to-runner.js> [bin_dir]
# Example:  install-shim.sh multiauth-run ./dist/run-config-cli.js
set -euo pipefail

SHIM_NAME="${1:-}"
RUNNER="${2:-}"
BIN_DIR="${3:-"$HOME/.multiauth-cli/bin"}"

if [[ -z "$SHIM_NAME" || -z "$RUNNER" ]]; then
  echo "Usage: $0 <shim_basename> <path-to-runner.js> [bin_dir]" >&2
  exit 1
fi

if ! command -v node &>/dev/null; then
  echo "node not on PATH" >&2
  exit 1
fi

RUN_DIR=$(cd "$(dirname "$RUNNER")" && pwd)
RUNNER_ABS="$RUN_DIR/$(basename "$RUNNER")"
if [[ ! -f "$RUNNER_ABS" ]]; then
  echo "Runner not found: $RUNNER_ABS" >&2
  exit 1
fi

mkdir -p "$BIN_DIR"
TARGET="$BIN_DIR/$SHIM_NAME"
NODE=$(command -v node)

write_body() {
  cat <<EOF2
#!/usr/bin/env bash
set -euo pipefail
exec "$NODE" "$RUNNER_ABS" "\$@"
EOF2
}

TMP=$(mktemp)
write_body > "$TMP"
if [[ -f "$TARGET" ]] && cmp -s "$TMP" "$TARGET"; then
  echo "Unchanged: $TARGET"
else
  cp "$TMP" "$TARGET"
  chmod +x "$TARGET"
fi
rm -f "$TMP"
echo "Shim: $TARGET (runner: $RUNNER_ABS)"

if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
  echo "Add to PATH: export PATH=\"$BIN_DIR:\$PATH\"" >&2
fi
exit 0
