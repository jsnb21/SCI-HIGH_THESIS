# PowerShell script to replace Phaser imports with global Phaser comments
Write-Host "Updating Phaser imports in dist/src files..." -ForegroundColor Green

# Get all JavaScript files in dist/src and subdirectories
$jsFiles = Get-ChildItem -Path "dist/src" -Recurse -Filter "*.js"

foreach ($file in $jsFiles) {
    Write-Host "Processing: $($file.FullName)" -ForegroundColor Yellow
    
    # Read the file content
    $content = Get-Content -Path $file.FullName -Raw
    
    # Replace the Phaser import line
    $newContent = $content -replace "import Phaser from 'phaser';", "// Phaser is loaded globally from CDN`n// import Phaser from 'phaser';"
    
    # Also fix the relative imports to use absolute paths
    $newContent = $newContent -replace "from '/src/", "from '/SCI-HIGH_THESIS/src/"
    $newContent = $newContent -replace "from './", "from '/SCI-HIGH_THESIS/src/"
    $newContent = $newContent -replace "from '../", "from '/SCI-HIGH_THESIS/src/"
    
    # Write the updated content back
    Set-Content -Path $file.FullName -Value $newContent -NoNewline
}

Write-Host "Finished updating Phaser imports!" -ForegroundColor Green
