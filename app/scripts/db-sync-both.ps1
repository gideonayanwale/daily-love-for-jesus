# db-sync-both.ps1
# Pushes the Drizzle schema to BOTH Neon and Supabase in one command.
# Run from the `app/` directory: .\scripts\db-sync-both.ps1

param(
  [switch]$Force
)

$ErrorActionPreference = "Continue"

# Load .env file
$envFile = "$PSScriptRoot\..\.env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and ($line -match "^([^=]+)=(.*)$")) {
      $key = $Matches[1].Trim()
      $val = $Matches[2].Trim()
      [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
    }
  }
  Write-Host "[db-sync-both] Successfully loaded environment variables from .env" -ForegroundColor Cyan
}

$neonUrl = [System.Environment]::GetEnvironmentVariable("NEON_DATABASE_URL")
$supabaseUrl = [System.Environment]::GetEnvironmentVariable("DATABASE_URL")

if (-not $neonUrl -and -not $supabaseUrl) {
  Write-Error "Neither NEON_DATABASE_URL nor DATABASE_URL is set in your .env!"
  exit 1
}

# 1. Push schema to Neon
if ($neonUrl) {
  Write-Host ""
  Write-Host "=========================================" -ForegroundColor Green
  Write-Host "[1/2] Pushing schema to NEON Database..." -ForegroundColor Green
  Write-Host "=========================================" -ForegroundColor Green
  $env:DRIZZLE_DB_TARGET = "neon"
  npx drizzle-kit push
  if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Neon schema pushed successfully." -ForegroundColor Green
  } else {
    Write-Warning "[WARN] Neon push completed with exit code $LASTEXITCODE."
  }
} else {
  Write-Warning "NEON_DATABASE_URL is not set - skipping Neon push."
}

# 2. Push schema to Supabase
if ($supabaseUrl) {
  Write-Host ""
  Write-Host "=============================================" -ForegroundColor Blue
  Write-Host "[2/2] Pushing schema to SUPABASE Database..." -ForegroundColor Blue
  Write-Host "=============================================" -ForegroundColor Blue
  $env:DRIZZLE_DB_TARGET = "supabase"
  npx drizzle-kit push
  if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Supabase schema pushed successfully." -ForegroundColor Blue
  } else {
    Write-Warning "[WARN] Supabase push completed with exit code $LASTEXITCODE."
  }
} else {
  Write-Warning "DATABASE_URL is not set - skipping Supabase push."
}

# Reset target
$env:DRIZZLE_DB_TARGET = ""

Write-Host ""
Write-Host "=========================================" -ForegroundColor Yellow
Write-Host "Schema push complete for both databases!" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow
