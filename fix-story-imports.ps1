# Fix imports in story scenes to use absolute paths from /src
$storyPath = "c:\Users\james\OneDrive\Documents\Repositories\SCI-HIGH_THESIS\docs\src\scenes\storyScenes"

Get-ChildItem -Path $storyPath -Recurse -Filter "*.js" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    
    # Fix relative imports to use absolute paths from /src
    $content = $content -replace "import \{ createBackButton \} from '[\.\/]*components/buttons/backbutton\.js';", "import { createBackButton } from '/src/components/buttons/backbutton.js';"
    $content = $content -replace "import \{ (.*) \} from '[\.\/]*gameManager\.js';", "import { `$1 } from '/src/gameManager.js';"
    $content = $content -replace "import VNDialogueBox from '[\.\/]*ui/VNDialogueBox\.js';", "import VNDialogueBox from '/src/ui/VNDialogueBox.js';"
    
    Set-Content -Path $_.FullName -Value $content -NoNewline
    Write-Host "Fixed imports in $($_.Name)"
}
