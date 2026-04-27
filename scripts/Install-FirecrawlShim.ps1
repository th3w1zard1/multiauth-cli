#Requires -Version 5.1
<#
.SYNOPSIS
  Legacy name: installs a user-local shim for the optional `multiauth-firecrawl` entry and prepends the bin dir to User PATH.
  Delegates to install-shim.ps1 (same as any other Node runner).

.PARAMETER BinDir, PackageRoot, SkipPath
  See install-shim.ps1. Resolves dist\firecrawl-main.js from a clone, MULTIAUTH_CLI_PACKAGE_ROOT, or global multiauth-cli.
#>
param(
  [string] $BinDir = (Join-Path $env:USERPROFILE ".multiauth-cli\bin"),
  [string] $PackageRoot = $env:MULTIAUTH_CLI_PACKAGE_ROOT,
  [switch] $SkipPath
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $PSCommandPath

if (-not $PackageRoot) {
  $scriptParent = Split-Path -Parent $PSCommandPath
  $siblingDist = Join-Path (Split-Path -Parent $scriptParent) "dist\firecrawl-main.js"
  if (Test-Path -LiteralPath $siblingDist) {
    $PackageRoot = (Resolve-Path (Split-Path -Parent $scriptParent)).Path
  }
}

function Get-FirecrawlMainJs {
  param([string] $Root)
  if ($Root) {
    $candidate = Join-Path $Root "dist\firecrawl-main.js"
    if (Test-Path -LiteralPath $candidate) { return (Resolve-Path -LiteralPath $candidate).Path }
  }
  $npmGlobal = (& npm root -g 2>$null).Trim()
  if (-not $npmGlobal) { throw "npm root -g failed; ensure Node/npm are installed." }
  $g = Join-Path $npmGlobal "multiauth-cli\dist\firecrawl-main.js"
  if (Test-Path -LiteralPath $g) { return (Resolve-Path -LiteralPath $g).Path }
  throw @"
Could not find dist\firecrawl-main.js (optional upstream entry).
Install the package or build from a clone, then re-run, or set MULTIAUTH_CLI_PACKAGE_ROOT to the repo root.
"@
}

$runner = Get-FirecrawlMainJs -Root $PackageRoot
& (Join-Path $scriptDir "install-shim.ps1") -ShimName "firecrawl" -RunnerJs $runner -BinDir $BinDir -SkipPath:$SkipPath
