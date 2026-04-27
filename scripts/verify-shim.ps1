#Requires -Version 5.1
# Idempotent check: build, install a test shim, prepend PATH, run `multiauth-run --help`.
param(
  [string] $ShimName = "u",
  [string] $PackageRoot = ""
)

$ErrorActionPreference = "Stop"
$repo = if ($PackageRoot) { (Resolve-Path -LiteralPath $PackageRoot).Path } else { Split-Path -Parent $PSScriptRoot }
Set-Location $repo
$binDir = Join-Path $env:USERPROFILE ".multiauth-cli\bin"
$def = Join-Path $repo "dist\run-config-cli.js"
if (-not (Test-Path -LiteralPath $def)) { throw "dist\run-config-cli.js missing — run npm run build" }
& "$PSScriptRoot\install-shim.ps1" -ShimName $ShimName -RunnerJs (Resolve-Path -LiteralPath $def).Path -BinDir $binDir -SkipPath
$env:Path = "$binDir;" + $env:Path
$cmd = Get-Command $ShimName -ErrorAction SilentlyContinue
if (-not $cmd) { throw "$ShimName not on PATH after prepend" }
Write-Host "=== Get-Command $ShimName ===" 
$cmd | Format-List Name, CommandType, Source, Definition
Write-Host "=== $ShimName --help ==="
& $ShimName --help
if ($LASTEXITCODE -ne 0) { throw "shim --help failed with $LASTEXITCODE" }
