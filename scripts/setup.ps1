#Requires -Version 5.1
<#
.SYNOPSIS
  One-shot, deterministic: npm install, build, then either a declarative install (YAML) or
  the legacy path: default profile if missing, install user-local PATH shim.

.PARAMETER Config
  Path to an install manifest (YAML). When set, runs scripts/apply-install.mjs and skips
  the legacy single-shim flow. See examples/install.example.yaml and docs/INSTALL.md.

.PARAMETER PackageRoot
  Root of the multiauth-cli clone (default: parent of scripts/)

.PARAMETER ShimName
  Legacy only. Basename of the command on PATH (default: u).

.PARAMETER SkipNpm
.PARAMETER SkipPath
  Pass to install-shim.ps1: do not modify User PATH.
#>
param(
  [string] $Config = "",
  [string] $PackageRoot = "",
  [string] $ShimName = "u",
  [switch] $SkipNpm,
  [switch] $SkipPath
)

$ErrorActionPreference = "Stop"
$root = if ($PackageRoot) { (Resolve-Path -LiteralPath $PackageRoot).Path } else { Split-Path -Parent $PSScriptRoot }
Set-Location $root
$apply = Join-Path $root "scripts\apply-install.mjs"
if ($Config) {
  if (-not (Test-Path -LiteralPath $apply)) { throw "Missing $apply" }
  if (-not $SkipNpm) { npm install }
  npm run build
  $cfg = (Resolve-Path -LiteralPath $Config).Path
  & node $apply $cfg $root
} else {
  if (-not $SkipNpm) { npm install }
  npm run build
  $runner = Join-Path $root "dist\run-config-cli.js"
  if (-not (Test-Path -LiteralPath $runner)) { throw "Build failed: missing $runner" }
  $cfgDir = Join-Path $env:USERPROFILE ".config\multiauth"
  $example = Join-Path $root "examples\profiles.example.yaml"
  $dest = Join-Path $cfgDir "profiles.yaml"
  if ((Test-Path -LiteralPath $example) -and -not (Test-Path -LiteralPath $dest)) {
    New-Item -ItemType Directory -Path $cfgDir -Force | Out-Null
    Copy-Item -LiteralPath $example -Destination $dest
    Write-Host "Created $dest (edit profiles before use)"
  }
  $scriptDir = Split-Path -Parent $PSCommandPath
  & (Join-Path $scriptDir "install-shim.ps1") -ShimName $ShimName -RunnerJs (Resolve-Path -LiteralPath $runner).Path -SkipPath:$SkipPath
  Write-Host "Done. Set MULTIAUTH_PROFILE to a profile name in $dest, or pass --profile on each run."
}
