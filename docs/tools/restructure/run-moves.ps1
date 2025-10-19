param(
  [switch]$DryRun,
  [string]$Group = ""
)

$ErrorActionPreference = 'Stop'

# $PSScriptRoot => docs/tools/restructure
$docsRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot) # docs/
$projectRoot = Split-Path -Parent $docsRoot
$moveMapPath = Join-Path $PSScriptRoot 'move-map.json'

if (!(Test-Path $moveMapPath)) {
  Write-Error "move-map.json not found at $moveMapPath"
}

$mappings = (Get-Content $moveMapPath -Raw | ConvertFrom-Json).mappings
if ($Group -ne "") {
  $mappings = $mappings | Where-Object { $_.group -eq $Group }
  if (-not $mappings) { Write-Error "No mappings found for group '$Group'" }
}

# Ensure destination directories exist
function New-DirectoryIfNeeded($path) {
  $dir = Split-Path $path -Parent
  if ($dir -and !(Test-Path $dir)) {
    if ($DryRun) { Write-Host "[DRY-RUN] mkdir $dir" }
    else { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  }
}

$summary = @()
foreach ($m in $mappings) {
  $fromPath = Join-Path $projectRoot $m.from
  $toPath = Join-Path $projectRoot $m.to
  if (-not (Test-Path $fromPath)) {
    Write-Warning "Skip (missing): $($m.from)"
    continue
  }
  New-DirectoryIfNeeded $toPath
  if ($DryRun) {
    Write-Host "[DRY-RUN] MOVE '$fromPath' -> '$toPath'"
  } else {
    Move-Item -LiteralPath $fromPath -Destination $toPath -Force
    Write-Host "Moved: $($m.from) -> $($m.to)"
  }
  $summary += [PSCustomObject]@{ from=$m.from; to=$m.to; group=$m.group }
}

Write-Host "-- Summary --"
$summary | Format-Table -AutoSize
