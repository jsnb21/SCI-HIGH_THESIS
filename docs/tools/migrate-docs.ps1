<#
docs/tools/migrate-docs.ps1
PowerShell migration helper for docs/ reorganization.

Usage (dry-run default):
  # from any folder, run the script; it detects docs/ relative to script location
  .\migrate-docs.ps1

Apply changes (perform moves):
  .\migrate-docs.ps1 -Apply

What it does:
- Creates a timestamped backup folder under `docs/migration-backup-<timestamp>/`
- Moves top-level HTML files (except index.html and 404.html) into `docs/pages/<basename>/index.html`
- Moves `docs/js/` -> `docs/assets/js/`
- Moves `docs/src/` -> `docs/public/src/`
- Moves `docs/remove-logs/` -> `docs/tools/`
- Moves `docs/admin-password.txt` -> `docs/config/admin-password.txt` (if present)
- Creates destination directories as needed
- Prints operations in dry-run mode

IMPORTANT:
- This script only moves files. It does NOT update internal links. Run link fixes and test locally after the migration.
- Review backups before deleting anything.
#>

param(
    [switch]$Apply
)

function Write-Info($msg){ Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Warn($msg){ Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg){ Write-Host "[ERROR] $msg" -ForegroundColor Red }

# Determine docs root based on script location
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$docsRoot = Resolve-Path (Join-Path $scriptDir "..")
$docsRoot = $docsRoot.Path

if (-not (Test-Path $docsRoot)){
    Write-Err "Could not find docs root at $docsRoot"
    exit 1
}

# Backup folder
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $docsRoot "migration-backup-$timestamp"

# Helper to ensure directory exists
function Ensure-Dir([string]$path){ if (-not (Test-Path $path)) { New-Item -ItemType Directory -Force -Path $path | Out-Null } }

# Helper to copy to backup then move (or print dry-run)
function Plan-Or-DoMove([string]$srcPath, [string]$destPath){
    if (-not (Test-Path $srcPath)){
        Write-Warn "Source not found: $srcPath"
        return
    }

    $destDir = Split-Path -Parent $destPath
    Ensure-Dir $destDir
    Ensure-Dir $backupRoot

    $relativeSrc = Resolve-Path $srcPath
    $backupDest = Join-Path $backupRoot (Split-Path -Leaf $srcPath)

    if ($Apply){
        Copy-Item -Path $srcPath -Destination $backupRoot -Recurse -Force
        Move-Item -Path $srcPath -Destination $destPath -Force
        Write-Info "Moved: $srcPath -> $destPath (backup -> $backupRoot)"
    } else {
        Write-Host "DRYRUN: Would copy $srcPath -> $backupRoot and move -> $destPath"
    }
}

# 1) Top-level HTML files (move to pages/<basename>/index.html) except index.html and 404.html
$htmlFiles = Get-ChildItem -Path $docsRoot -Filter "*.html" -File | Where-Object { $_.Name -notin @('index.html','404.html') }
foreach ($f in $htmlFiles){
    $basename = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
    $destDir = Join-Path $docsRoot "pages\$basename"
    $destPath = Join-Path $destDir "index.html"
    Plan-Or-DoMove $f.FullName $destPath
}

# 2) Move admin-password.txt -> docs/config/admin-password.txt
$adminPw = Join-Path $docsRoot "admin-password.txt"
if (Test-Path $adminPw){
    $dest = Join-Path $docsRoot "config\admin-password.txt"
    Plan-Or-DoMove $adminPw $dest
}

# 3) Move js/ -> assets/js/
$jsSrc = Join-Path $docsRoot "js"
if (Test-Path $jsSrc){
    $jsDestDir = Join-Path $docsRoot "assets\js"
    Ensure-Dir $jsDestDir
    if ($Apply){
        Copy-Item -Path $jsSrc -Destination $backupRoot -Recurse -Force
        Move-Item -Path $jsSrc -Destination $jsDestDir -Force
        Write-Info "Moved directory: $jsSrc -> $jsDestDir (backup -> $backupRoot)"
    } else {
        Write-Host "DRYRUN: Would copy $jsSrc -> $backupRoot and move -> $jsDestDir"
    }
}

# 4) Move src/ -> public/src/
$srcSrc = Join-Path $docsRoot "src"
if (Test-Path $srcSrc){
    $srcDest = Join-Path $docsRoot "public\src"
    Ensure-Dir $srcDest
    if ($Apply){
        Copy-Item -Path $srcSrc -Destination $backupRoot -Recurse -Force
        Move-Item -Path $srcSrc -Destination $srcDest -Force
        Write-Info "Moved directory: $srcSrc -> $srcDest (backup -> $backupRoot)"
    } else {
        Write-Host "DRYRUN: Would copy $srcSrc -> $backupRoot and move -> $srcDest"
    }
}

# 5) Move remove-logs/ -> tools/
$removeLogs = Join-Path $docsRoot "remove-logs"
if (Test-Path $removeLogs){
    $toolsDest = Join-Path $docsRoot "tools"
    Ensure-Dir $toolsDest
    $dest = Join-Path $toolsDest "remove-logs"
    if ($Apply){
        Copy-Item -Path $removeLogs -Destination $backupRoot -Recurse -Force
        Move-Item -Path $removeLogs -Destination $toolsDest -Force
        Write-Info "Moved directory: $removeLogs -> $toolsDest (backup -> $backupRoot)"
    } else {
        Write-Host "DRYRUN: Would copy $removeLogs -> $backupRoot and move -> $toolsDest"
    }
}

# 6) js inside assets/ and assets/css remain; config and documentation kept in place by default

# Summary
if ($Apply){
    Write-Info "Migration applied. Backups stored at: $backupRoot"
    Write-Info "Next steps: run search-and-replace to fix paths inside HTML/JS, test locally, then commit changes on a branch."
} else {
    Write-Info "Dry-run finished. No changes made. Rerun with -Apply to execute moves."
}
