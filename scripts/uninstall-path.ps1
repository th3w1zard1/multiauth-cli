#Requires -Version 5.1
<#
.SYNOPSIS
  Remove one directory from the User PATH (idempotent: no error if already absent).
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $BinDir
)

$ErrorActionPreference = "Stop"
$norm = (Resolve-Path -LiteralPath $BinDir -ErrorAction Stop).Path.TrimEnd("\")
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$parts = $userPath -split ";" | Where-Object { $_ -and $_.Trim() }
$next = $parts | Where-Object { $_.TrimEnd("\") -ne $norm }
$newPath = $next -join ";"
[Environment]::SetEnvironmentVariable("Path", $newPath, "User")
Write-Host "User PATH: removed $norm if it was present."
