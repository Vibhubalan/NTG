# Migrate Neon prod data → Supabase (Windows)
# PostgreSQL 17 is installed at C:\Program Files\PostgreSQL\17\bin (auto-detected).
#
# Usage (from repo root):
#   $env:NEON_SOURCE_URL = "postgresql://neondb_owner:PASS@ep-frosty-field-aod7z5rt....neon.tech/neondb?sslmode=require"
#   .\scripts\migrate-neon-to-supabase.ps1
#
# SUPABASE_TARGET_URL is read from DIRECT_URL in .env.local if not set.

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$EnvFile = Join-Path $RepoRoot ".env.local"
$DumpFile = Join-Path $RepoRoot "ntg-neon-backup.dump"

function Find-PgBin {
    param([string]$Exe)
    $cmd = Get-Command $Exe -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $candidates = @(
        "C:\Program Files\PostgreSQL\18\bin\$Exe.exe",
        "C:\Program Files\PostgreSQL\17\bin\$Exe.exe",
        "C:\Program Files\PostgreSQL\16\bin\$Exe.exe"
    )
    foreach ($p in $candidates) {
        if (Test-Path $p) { return $p }
    }
    return $null
}

function Read-EnvVar {
    param([string]$Name, [string]$Path)
    if (-not (Test-Path $Path)) { return $null }
    foreach ($line in Get-Content $Path) {
        if ($line -match "^\s*#") { continue }
        if ($line -match "^\s*$Name\s*=\s*(.+)$") {
            $v = $Matches[1].Trim()
            if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length - 2) }
            if ($v.StartsWith("'") -and $v.EndsWith("'")) { $v = $v.Substring(1, $v.Length - 2) }
            return $v
        }
    }
    return $null
}

$pgDump = Find-PgBin "pg_dump"
$pgRestore = Find-PgBin "pg_restore"
$psql = Find-PgBin "psql"

if (-not $pgDump -or -not $pgRestore) {
    Write-Host ""
    Write-Host "pg_dump not found." -ForegroundColor Red
    Write-Host "Install: winget install PostgreSQL.PostgreSQL.17"
    Write-Host "Or add to PATH: `$env:Path += ';C:\Program Files\PostgreSQL\17\bin'"
    exit 1
}

$neonUrl = $env:NEON_SOURCE_URL
if (-not $neonUrl) {
    Write-Host "Set NEON_SOURCE_URL first (Neon prod DIRECT_URL, non-pooler):" -ForegroundColor Red
    Write-Host '  $env:NEON_SOURCE_URL = "postgresql://neondb_owner:YOUR_PASS@ep-frosty-field-aod7z5rt.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"'
    exit 1
}

$supabaseUrl = $env:SUPABASE_TARGET_URL
if (-not $supabaseUrl) {
    $supabaseUrl = Read-EnvVar "DIRECT_URL" $EnvFile
}

if (-not $supabaseUrl) {
    Write-Host "Missing SUPABASE_TARGET_URL or DIRECT_URL in .env.local" -ForegroundColor Red
    exit 1
}

Write-Host "pg_dump:    $pgDump"
Write-Host "pg_restore: $pgRestore"
Write-Host "Dump file:  $DumpFile"
Write-Host ""
Write-Host "Step 1/3 - Dumping Neon prod (read-only)..." -ForegroundColor Cyan

& $pgDump $neonUrl --no-owner --no-acl --format=custom --file=$DumpFile
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Step 2/3 - Restoring into Supabase..." -ForegroundColor Cyan

& $pgRestore --no-owner --no-acl --clean --if-exists -d $supabaseUrl $DumpFile
if ($LASTEXITCODE -ne 0) {
    Write-Host "pg_restore exit $LASTEXITCODE - often harmless if objects already exist." -ForegroundColor Yellow
}

if ($psql) {
    Write-Host "Step 3/3 - Verifying User count on Supabase..." -ForegroundColor Cyan
    & $psql $supabaseUrl -c 'SELECT COUNT(*) AS users FROM "User";'
}

Write-Host ""
Write-Host "Done. Run: npm run dev  and test login." -ForegroundColor Green
