$Log = Join-Path -Path (Get-Location) -ChildPath 'npm-install-verbose.log'
Write-Output "Logging to: $Log"
npm cache clean --force
# Run npm install and capture stdout/stderr
npm install --no-audit --no-fund --legacy-peer-deps --unsafe-perm --loglevel verbose *> $Log 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Output "npm install exited with code $LASTEXITCODE" | Out-File -FilePath $Log -Append
  exit $LASTEXITCODE
}
Write-Output "npm install completed successfully" | Out-File -FilePath $Log -Append
exit 0
