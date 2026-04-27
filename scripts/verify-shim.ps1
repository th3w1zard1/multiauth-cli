#Requires -Version 5.1
# After `npm run build`: install generic or legacy shims, prepend process PATH, run a test command.
param(
  [string] $ShimName = "firecrawl",
  [string] $TestArgs = "--version",
  [string] $PackageRoot = "",
  [string] $RunnerJs = ""
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo
$binDir = Join-Path $env:USERPROFILE ".multiauth-cli\bin"

if ($RunnerJs) {
  if (-not (Test-Path -LiteralPath $RunnerJs)) { throw "RunnerJs not found: $RunnerJs" }
} elseif ($ShimName -eq "firecrawl") {
  if (-not (Test-Path "dist\firecrawl-main.js")) { throw "dist\firecrawl-main.js missing — run npm run build" }
  & "$PSScriptRoot\Install-FirecrawlShim.ps1" -PackageRoot $repo -BinDir $binDir -SkipPath
} else {
  if (-not $PackageRoot) { $PackageRoot = $repo }
  $def = Join-Path $PackageRoot "dist\run-config-cli.js"
  if (-not (Test-Path -LiteralPath $def)) { throw "dist\run-config-cli.js missing — run npm run build" }
  & "$PSScriptRoot\install-shim.ps1" -ShimName $ShimName -RunnerJs (Resolve-Path -LiteralPath $def).Path -BinDir $binDir -SkipPath
}

$env:Path = "$binDir;" + $env:Path
$bin = (Join-Path $binDir $ShimName)
$cmd = Get-Command $ShimName -ErrorAction SilentlyContinue
if (-not $cmd) { throw "$ShimName not on PATH after prepend" }
Write-Host "=== Get-Command $ShimName ===" 
$cmd | Format-List Name, CommandType, Source, Definition
$parts = $TestArgs -split '\s+'
Write-Host "=== $ShimName $TestArgs (via shim) ==="
& $ShimName @parts
