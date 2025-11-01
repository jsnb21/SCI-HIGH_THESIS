<#
docs/tools/fix-paths.ps1
PowerShell helper to find and optionally apply path updates after docs/ reorganization.

Usage (dry-run default):
  .\fix-paths.ps1
Apply changes:
  .\fix-paths.ps1 -Apply

What it does (dry-run):
- Scans files under docs/ (html, js, css, json, webmanifest, md, txt)
- Proposes replacements based on detected top-level HTML files and common folder moves (js -> assets/js, css -> assets/css, public/data -> assets/data)
- Prints file paths and sample matched lines to review

What it does (with -Apply):
- Backs up files to docs/migration-backup-<timestamp>/
- Writes updated files in place
- Prints a summary of modified files

CAUTION: This script makes broad replacements. Inspect the dry-run output carefully before using -Apply.
#>

param(
    [switch]$Apply
)

function Write-Info($msg){ Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Warn($msg){ Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg){ Write-Host "[ERROR] $msg" -ForegroundColor Red }

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$docsRoot = Resolve-Path (Join-Path $scriptDir "..")
$docsRoot = $docsRoot.Path

if (-not (Test-Path $docsRoot)){
    Write-Err "Could not find docs root at $docsRoot"
    exit 1
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $docsRoot "migration-backup-$timestamp"

# File types to process
$includes = @('*.html','*.js','*.css','*.json','*.webmanifest','*.md','*.txt')
$files = Get-ChildItem -Path $docsRoot -Recurse -Include $includes -File

# Determine top-level HTML basenames (except index and 404)
$topHtmls = Get-ChildItem -Path $docsRoot -Filter "*.html" -File | Where-Object { $_.Name -notin @('index.html','404.html') } | ForEach-Object { $_.BaseName }

# Replacement rules (ordered)
$rules = @()

# Rule: top-level html -> pages/<basename>/
foreach ($name in $topHtmls){
    $pattern = "\b$([regex]::Escape($name))\.html\b"
    $replacement = "pages/$name/"
    $rules += [pscustomobject]@{name="$name.html -> $replacement"; pattern=$pattern; replacement=$replacement }
}

# Rule: attribute-aware js/ -> assets/js/
$rules += [pscustomobject]@{name="assets-js"; pattern='((?:src|href)\s*=\s*"|\'')([^"'']*?)\bjs/' ; replacement='${1}${2}assets/js/' }

# Rule: attribute-aware css/ -> assets/css/
$rules += [pscustomobject]@{name="assets-css"; pattern='((?:href)\s*=\s*"|\'')([^"'']*?)\bcss/' ; replacement='${1}${2}assets/css/' }

# Rule: public/data -> assets/data
$rules += [pscustomobject]@{name="public-data"; pattern='public/data/'; replacement='assets/data/' }

# Rule: leading slash to ./assets (only when referring to /assets/)
$rules += [pscustomobject]@{name="slash-assets"; pattern='(?<=\=\s*["''])/assets/'; replacement='./assets/' }

# Function to show sample matches
function Show-SampleMatches($filePath, $pattern){
    $matches = Select-String -Path $filePath -Pattern $pattern -SimpleMatch -List -AllMatches -ErrorAction SilentlyContinue
    if ($matches){
        $count = ($matches | Measure-Object).Count
        Write-Host "  Found $count matches in $filePath"
        $preview = $matches | Select-Object -First 3
        foreach ($m in $preview){
            $line = $m.Line.Trim()
            Write-Host "    -> $line"
        }
    }
}

# Dry-run: report
Write-Info "Running dry-run search under $docsRoot"
foreach ($rule in $rules){
    Write-Host "\nRule: $($rule.name) - pattern: $($rule.pattern) -> replacement: $($rule.replacement)"
    foreach ($f in $files){
        try{
            $found = Select-String -Path $f.FullName -Pattern $rule.pattern -AllMatches -ErrorAction SilentlyContinue
            if ($found){
                Write-Host "- File: $($f.FullName)"
                $found | Select-Object -First 5 | ForEach-Object { Write-Host "    $($_.Line.Trim())" }
            }
        } catch {
            # ignore binary files or read errors
        }
    }
}

if (-not $Apply){
    Write-Info "Dry-run finished. No files modified. Rerun with -Apply to execute replacements (backups will be created)."
    exit 0
}

# Apply mode: backup files and write changes
Write-Info "Apply mode: backing up files to $backupRoot and applying replacements"
Ensure-Dir $backupRoot

$modifiedCount = 0
foreach ($f in $files){
    $content = Get-Content -Raw -Path $f.FullName -ErrorAction SilentlyContinue
    if (-not $content){ continue }
    $new = $content
    foreach ($rule in $rules){
        $new = [regex]::Replace($new, $rule.pattern, $rule.replacement)
    }
    if ($new -ne $content){
        $rel = Resolve-Path -Relative -Path $f.FullName
        Copy-Item -Path $f.FullName -Destination $backupRoot -Force
        Set-Content -Path $f.FullName -Value $new -Force
        Write-Info "Updated: $rel"
        $modifiedCount++
    }
}

Write-Info "Apply complete. Files modified: $modifiedCount. Backups at: $backupRoot"
Write-Info "Next: serve docs/ locally and run a link checker."

# Helper create dir if not exists
function Ensure-Dir([string]$p){ if (-not (Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null } }
