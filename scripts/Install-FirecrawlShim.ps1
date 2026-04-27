#Requires -Version 5.1
<#
.SYNOPSIS
  Installs a user-local `firecrawl` shim that runs multiauth-wrapped Firecrawl CLI, and prepends it to your User PATH
  so it wins over other `firecrawl` scripts (e.g. earlier PATH entries).

.DESCRIPTION
  - Resolves `dist\firecrawl-main.js` from a global `multiauth-cli` install, or from MULTIAUTH_CLI_PACKAGE_ROOT.
  - Writes `firecrawl.cmd` and `firecrawl.ps1` into -BinDir (default: %USERPROFILE%\.multiauth-cli\bin).
  - Prepends -BinDir to the *User* PATH if missing.

  Prerequisites: Node.js on PATH; `npm install -g multiauth-cli` (or `npm link` from a clone) so the runner exists.

  Keys: use MULTIAUTH_API_KEY / MULTIAUTH_API_KEYS (or accounts file per README), not FIRECRAWL_API_KEYS, in the parent environment.

.PARAMETER BinDir
  Directory for the shim files. Default: $env:USERPROFILE\.multiauth-cli\bin

.PARAMETER PackageRoot
  Optional. Folder that contains dist\firecrawl-main.js (e.g. clone after npm run build). Overrides global lookup.

.PARAMETER SkipPath
  If set, only writes shims; does not modify User PATH.
#>
param(
  [string] $BinDir = (Join-Path $env:USERPROFILE ".multiauth-cli\bin"),
  [string] $PackageRoot = $env:MULTIAUTH_CLI_PACKAGE_ROOT,
  [switch] $SkipPath
)

$ErrorActionPreference = "Stop"

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
Could not find dist\firecrawl-main.js.

Install the package globally, then re-run:
  npm install -g multiauth-cli

Or from a git clone (build + link):
  npm install && npm run build && npm link

Or set MULTIAUTH_CLI_PACKAGE_ROOT to the repo root (folder containing dist\) and re-run this script.
"@
}

$node = (Get-Command node -ErrorAction Stop).Source
$runner = Get-FirecrawlMainJs -Root $PackageRoot

New-Item -ItemType Directory -Path $BinDir -Force | Out-Null
$cmdPath = Join-Path $BinDir "firecrawl.cmd"
$cmdBody = @"
@echo off
"$node" "$runner" %*
exit /b %ERRORLEVEL%
"@
Set-Content -LiteralPath $cmdPath -Value $cmdBody -Encoding ascii

$ps1Path = Join-Path $BinDir "firecrawl.ps1"
$ps1Body = @"
#!/usr/bin/env pwsh
`$ErrorActionPreference = 'Stop'
& `"$node`" `"$runner`" @args
exit `$LASTEXITCODE
"@
Set-Content -LiteralPath $ps1Path -Value $ps1Body -Encoding utf8

Write-Host "Wrote shims:"
Write-Host "  $cmdPath"
Write-Host "  $ps1Path"
Write-Host "Runner: $runner"

if (-not $SkipPath) {
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $normBin = (Resolve-Path -LiteralPath $BinDir).Path.TrimEnd('\')
  $parts = $userPath -split ';' | Where-Object { $_ -and $_.Trim() }
  $already = $parts | Where-Object { $_.TrimEnd('\') -eq $normBin }
  if (-not $already) {
    $newPath = "$normBin;$userPath"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "Prepended User PATH: $normBin"
    Write-Host "Open a new terminal (or log off) so PATH picks up the change."
  } else {
    Write-Host "User PATH already contains $normBin"
  }
} else {
  Write-Host "SkipPath: PATH not modified. Add this directory to the front of PATH yourself: $BinDir"
}
