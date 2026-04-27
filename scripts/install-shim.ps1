#Requires -Version 5.1
<#
.SYNOPSIS
  Idempotent: writes user-local <ShimName>.cmd and <ShimName>.ps1 that run a Node entry, optionally prepends BinDir to User PATH.

.DESCRIPTION
  - Same inputs produce the same files and PATH: matching content rewrites are skipped; PATH is only prepended when the bin dir is missing.
  - Node must be on PATH. Runner is any multiauth-cli .js (e.g. dist\run-config-cli.js or a legacy dist\*.js).

.PARAMETER ShimName
  Name without extension (e.g. `multiauth`, `mycustom`).

.PARAMETER RunnerJs
  Absolute path to a Node entry script to execute.

.PARAMETER BinDir
  Default: $env:USERPROFILE\.multiauth-cli\bin

.PARAMETER SkipPath
  If set, only write shims; do not change User PATH.
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $ShimName,
  [Parameter(Mandatory = $true)]
  [string] $RunnerJs,
  [string] $BinDir = (Join-Path $env:USERPROFILE ".multiauth-cli\bin"),
  [switch] $SkipPath
)

$ErrorActionPreference = "Stop"

$resolvedRunner = (Resolve-Path -LiteralPath $RunnerJs).Path
$node = (Get-Command node -ErrorAction Stop).Source
New-Item -ItemType Directory -Path $BinDir -Force | Out-Null

$cmdPath = Join-Path $BinDir "$ShimName.cmd"
$ps1Path = Join-Path $BinDir "$ShimName.ps1"

$cmdBody = @"
@echo off
"$node" "$resolvedRunner" %*
exit /b %ERRORLEVEL%
"@

$ps1Body = @"
#!/usr/bin/env pwsh
`$ErrorActionPreference = 'Stop'
& `"$node`" `"$resolvedRunner`" @args
exit `$LASTEXITCODE
"@

function Test-SameFileContent {
  param($Path, $NewBody)
  if (-not (Test-Path -LiteralPath $Path)) { return $false }
  (Get-Content -LiteralPath $Path -Raw) -eq $NewBody
}

if (-not (Test-SameFileContent -Path $cmdPath -NewBody $cmdBody)) {
  Set-Content -LiteralPath $cmdPath -Value $cmdBody -Encoding ascii
} else { Write-Verbose "Unchanged: $cmdPath" }

if (-not (Test-SameFileContent -Path $ps1Path -NewBody $ps1Body)) {
  Set-Content -LiteralPath $ps1Path -Value $ps1Body -Encoding utf8
} else { Write-Verbose "Unchanged: $ps1Path" }

Write-Host "Shims: $cmdPath, $ps1Path"
Write-Host "Runner: $resolvedRunner"

if (-not $SkipPath) {
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $normBin = (Resolve-Path -LiteralPath $BinDir).Path.TrimEnd('\')
  $parts = $userPath -split ';' | Where-Object { $_ -and $_.Trim() }
  $already = $parts | Where-Object { $_.TrimEnd('\') -eq $normBin }
  if (-not $already) {
    $newPath = "$normBin;$userPath"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "Prepended User PATH: $normBin"
    Write-Host "Open a new terminal (or re-login) for PATH in new processes."
  } else {
    Write-Host "User PATH already contains: $normBin"
  }
} else {
  Write-Host "SkipPath: PATH not modified. Add the bin dir to PATH yourself: $BinDir"
}
