#Requires -Version 5.1
<#
.SYNOPSIS
  One-shot, deterministic: npm install, npm run build, copy default profile if missing, install user-local PATH shim.

.PARAMETER PackageRoot
  Root of the multiauth-cli clone (default: parent of scripts/)

.PARAMETER ShimName
  Basename of the command on PATH (default: u). Use the name you want to type instead of `multiauth-run`.

.PARAMETER SkipPath
  Pass to install-shim.ps1: do not modify User PATH.
#>
param(
  [string] $PackageRoot = "",
  [string] $ShimName = "u",
  [switch] $SkipNpm,
  [switch] $SkipPath
)

$ErrorActionPreference = "Stop"
$root = if ($PackageRoot) { (Resolve-Path -LiteralPath $PackageRoot).Path } else { Split-Path -Parent $PSScriptRoot }
Set-Location $root
if (-not $SkipNpm) {
  npm install
}
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
