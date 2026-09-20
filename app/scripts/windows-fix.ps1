Write-Host "Running Windows repair: cleaning npm cache, removing node_modules and package-lock.json..."
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$appDir = Split-Path -Parent $scriptsDir
Set-Location $appDir

try {
    npm cache clean --force
} catch {
    Write-Host "npm cache clean failed: $_"
}

if (Test-Path node_modules) {
    Write-Host "Removing node_modules..."
    Remove-Item -Recurse -Force node_modules
}

if (Test-Path package-lock.json) {
    Write-Host "Removing package-lock.json..."
    Remove-Item -Force package-lock.json
}

Write-Host "Installing dependencies with legacy peer deps and unsafe-perm..."
npm install --legacy-peer-deps --unsafe-perm

if ($LASTEXITCODE -ne 0) {
    Write-Host "Initial npm install failed with exit code $LASTEXITCODE. Attempting to install @vitejs/plugin-react as devDependency..."
    npm install -D @vitejs/plugin-react --legacy-peer-deps --unsafe-perm
    npm install --legacy-peer-deps --unsafe-perm
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "Install succeeded. You can run: npm run dev"
} else {
    Write-Host "Install still failing. Inspect output above for errors."
}
