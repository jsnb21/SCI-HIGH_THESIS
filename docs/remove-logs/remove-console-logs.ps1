# Console Log Cleaner - PowerShell Version
# Removes console.log statements from JavaScript and HTML files

param(
    [string]$Path = "",
    [switch]$DryRun,
    [switch]$Backup,
    [switch]$Help
)

# Set default path based on current directory
if ($Path -eq "") {
    $CurrentDir = Split-Path -Leaf (Get-Location)
    if ($CurrentDir -eq "remove-logs") {
        $Path = ".."
    } else {
        $Path = "."
    }
}

if ($Help) {
    Write-Host @"
Console Log Cleaner - Remove console.log statements from JS and HTML files

Usage: .\remove-console-logs.ps1 [options]

Options:
  -Path <path>      Target directory or file (default: current directory)
  -DryRun          Show what would be changed without modifying files
  -Backup          Create backup files before modifying
  -Help            Show this help message

Examples:
  .\remove-console-logs.ps1                     # Clean current directory
  .\remove-console-logs.ps1 -DryRun             # Preview changes
  .\remove-console-logs.ps1 -Path src -Backup   # Clean src with backups
"@
    exit
}

$Stats = @{
    FilesProcessed = 0
    FilesChanged = 0
    LogsRemoved = 0
}

function Remove-ConsoleLogs {
    param([string]$Content)
    
    $OriginalContent = $Content
    $RemovedCount = 0
    
    # Patterns to match console.log statements
    $Patterns = @(
        # Single line console.log
        '(\s*)console\.log\s*\([^;]*\)\s*;?\s*(\r?\n)?',
        # Multi-line console.log
        '(\s*)console\.log\s*\([\s\S]*?\)\s*;?\s*(\r?\n)?'
    )
    
    foreach ($Pattern in $Patterns) {
        $Matches = [regex]::Matches($Content, $Pattern)
        $RemovedCount += $Matches.Count
        $Content = [regex]::Replace($Content, $Pattern, '')
    }
    
    # Clean up extra blank lines
    $Content = [regex]::Replace($Content, '\r?\n\s*\r?\n\s*\r?\n', "`r`n`r`n")
    
    return @{
        Content = $Content
        RemovedCount = $RemovedCount
    }
}

function Process-File {
    param([string]$FilePath)
    
    try {
        $Content = Get-Content -Path $FilePath -Raw -Encoding UTF8
        $Result = Remove-ConsoleLogs -Content $Content
        
        $Stats.FilesProcessed++
        
        if ($Result.RemovedCount -gt 0) {
            $Stats.FilesChanged++
            $Stats.LogsRemoved += $Result.RemovedCount
            
            Write-Host "📝 $FilePath`: Removed $($Result.RemovedCount) console.log(s)" -ForegroundColor Green
            
            if (-not $DryRun) {
                if ($Backup) {
                    Copy-Item -Path $FilePath -Destination "$FilePath.backup"
                }
                Set-Content -Path $FilePath -Value $Result.Content -Encoding UTF8
            }
        }
    }
    catch {
        Write-Host "❌ Error processing $FilePath`: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Process-Directory {
    param([string]$DirPath)
    
    $ExcludeDirs = @('node_modules', '.git', 'dist', 'build', 'remove-logs')
    $Extensions = @('.js', '.html', '.htm')
    
    Get-ChildItem -Path $DirPath -Recurse | ForEach-Object {
        $IsExcluded = $false
        foreach ($ExcludeDir in $ExcludeDirs) {
            if ($_.FullName -like "*\$ExcludeDir\*") {
                $IsExcluded = $true
                break
            }
        }
        
        if (-not $IsExcluded -and $_.PSIsContainer -eq $false -and $Extensions -contains $_.Extension) {
            Process-File -FilePath $_.FullName
        }
    }
}

# Main execution
Write-Host "🧹 Console Log Cleaner Starting..." -ForegroundColor Cyan
Write-Host "📁 Target: $(Resolve-Path $Path)" -ForegroundColor Yellow
Write-Host "🎯 Extensions: .js, .html, .htm" -ForegroundColor Yellow

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - No files will be modified" -ForegroundColor Magenta
}

Write-Host ("─" * 50) -ForegroundColor Gray

$StartTime = Get-Date

if (Test-Path $Path -PathType Container) {
    Process-Directory -DirPath $Path
} elseif (Test-Path $Path -PathType Leaf) {
    Process-File -FilePath $Path
} else {
    Write-Host "❌ Path not found: $Path" -ForegroundColor Red
    exit 1
}

$EndTime = Get-Date
$Duration = ($EndTime - $StartTime).TotalMilliseconds

Write-Host ("─" * 50) -ForegroundColor Gray
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   Files processed: $($Stats.FilesProcessed)" -ForegroundColor White
Write-Host "   Files modified: $($Stats.FilesChanged)" -ForegroundColor White
Write-Host "   Console.logs removed: $($Stats.LogsRemoved)" -ForegroundColor White
Write-Host "   Time taken: $([math]::Round($Duration))ms" -ForegroundColor White

if ($DryRun -and $Stats.LogsRemoved -gt 0) {
    Write-Host ""
    Write-Host "💡 Run without -DryRun to actually remove the console.log statements" -ForegroundColor Yellow
}