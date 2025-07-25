# Build and deploy script for GitHub Pages

Write-Host "Building the project..." -ForegroundColor Green

# Navigate to docs folder where package.json is located
Set-Location docs

# Install dependencies if not already installed
if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Build the project
Write-Host "Running Vite build..." -ForegroundColor Yellow
npm run build

# Go back to root
Set-Location ..

# Check if dist folder was created
if (Test-Path "dist") {
    Write-Host "Build successful! dist folder created." -ForegroundColor Green
    Write-Host "You can now deploy the contents of the 'dist' folder to GitHub Pages." -ForegroundColor Cyan
    Write-Host "Make sure to configure GitHub Pages to serve from the 'dist' folder or copy its contents to your docs folder." -ForegroundColor Cyan
} else {
    Write-Host "Build failed! dist folder not found." -ForegroundColor Red
}
