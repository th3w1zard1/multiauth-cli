#Requires -Version 5.1
# Revert install from ~/.config/multiauth/install-state.json, or pass an explicit state file path.
param(
  [string] $StateFile = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$node = Join-Path $root "scripts\uninstall.mjs"
if ($StateFile) {
  & node $node (Resolve-Path -LiteralPath $StateFile).Path
} else {
  & node $node
}
