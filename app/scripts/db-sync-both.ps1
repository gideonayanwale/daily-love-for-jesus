# db-sync-both.ps1
# Pushes the Drizzle schema to BOTH Neon and Supabase in one command.
# Run from the `app/` directory: .\scripts\db-sync-both.ps1

param(
  [switch]$Force  # Pass -Force to skip confirmation prompts
)

$ErrorActionPreference = "Stop"

# Load .env
$envFile = Join-Path $PSScriptRoot ".." ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match "^\s*([^#=]+)=(.*)$") {
      $key = $Matches[1].Trim()
      $val = $Matches[2].Trim()
      if (-not [System.Environment]::GetEnvironmentVariable($key)) {
        [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
      }
    }
  }
  Write-Host "[db-sync-both] Loaded .env" -ForegroundColor Cyan
}

$neonUrl    = $env:NEON_DATABASE_URL
$supabaseUrl = $env:DATABASE_URL

if (-not $neonUrl -and -not $supabaseUrl) {
  Write-Error "Neither NEON_DATABASE_URL nor DATABASE_URL is set in your .env!"
  exit 1
}

# ── Push to Neon ───────────────────────────────────────────────────────────────
if ($neonUrl) {
  Write-Host "`n🟢 Pushing schema to NEON..." -ForegroundColor Green
  $env:NEON_DATABASE_URL = $neonUrl
  npx drizzle-kit push
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Neon push encountered errors (exit code $LASTEXITCODE)"
  } else {
    Write-Host "✅ Neon schema updated" -ForegroundColor Green
  }
} else {
  Write-Warning "NEON_DATABASE_URL not set — skipping Neon push"
}

# ── Push to Supabase (temporarily clear NEON_DATABASE_URL so drizzle picks DATABASE_URL) ──
if ($supabaseUrl) {
  Write-Host "`n🔵 Pushing schema to SUPABASE..." -ForegroundColor Blue
  $savedNeon = $env:NEON_DATABASE_URL
  $env:NEON_DATABASE_URL = ""
  npx drizzle-kit push
  $env:NEON_DATABASE_URL = $savedNeon
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Supabase push encountered errors (exit code $LASTEXITCODE)"
  } else {
    Write-Host "✅ Supabase schema updated" -ForegroundColor Blue
  }
} else {
  Write-Warning "DATABASE_URL not set — skipping Supabase push"
}

Write-Host "`n🎉 Both databases are now in sync!" -ForegroundColor Yellow
