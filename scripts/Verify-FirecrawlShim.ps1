#Requires -Version 5.1
# Run from repo root after `npm run build`. Writes shims (default bin), prepends process PATH, proves resolution.
$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo
if (-not (Test-Path "dist\firecrawl-main.js")) {
  throw "dist\firecrawl-main.js missing — run npm run build"
}
& npm run build 2>&1 | Out-Null
$binDir = Join-Path $env:USERPROFILE ".multiauth-cli\bin"
& "$PSScriptRoot\Install-FirecrawlShim.ps1" -PackageRoot $repo -BinDir $binDir -SkipPath
$env:Path = "$binDir;" + $env:Path
$cmd = Get-Command firecrawl -ErrorAction SilentlyContinue
if (-not $cmd) { throw "firecrawl not on PATH after prepend" }
Write-Host "=== Get-Command firecrawl ==="
$cmd | Format-List Name, CommandType, Source, Definition
Write-Host "=== firecrawl --version (via shim) ==="
& firecrawl --version
