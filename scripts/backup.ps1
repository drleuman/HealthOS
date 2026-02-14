# Automated Daily Backup Script for HealthOS (PowerShell)

# Configuration
$BACKUP_DIR = "F:\HEALTHOS\backups"
$RETENTION_DAYS = 30
$DATE = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "$BACKUP_DIR\backup_$DATE.sql"

# Create backup directory if it doesn't exist
if (!(Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

# Perform backup
Write-Host "[$(Get-Date)] Starting backup..."
docker-compose exec -T postgres pg_dump -U healthos healthos > $BACKUP_FILE

if ($LASTEXITCODE -ne 0) {
    Write-Host "[$(Get-Date)] ERROR: Backup failed!" -ForegroundColor Red
    exit 1
}

# Compress backup
Compress-Archive -Path $BACKUP_FILE -DestinationPath "$BACKUP_FILE.zip" -Force
Remove-Item $BACKUP_FILE
Write-Host "[$(Get-Date)] Backup created: $BACKUP_FILE.zip" -ForegroundColor Green

# Delete old backups
Get-ChildItem -Path $BACKUP_DIR -Filter "backup_*.zip" | 
Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RETENTION_DAYS) } | 
Remove-Item -Force

Write-Host "[$(Get-Date)] Old backups cleaned (retention: $RETENTION_DAYS days)" -ForegroundColor Gray

# Verify backup exists and has content
$backupInfo = Get-Item "$BACKUP_FILE.zip"
if ($backupInfo.Length -gt 1KB) {
    Write-Host "[$(Get-Date)] Backup verified successfully ($([math]::Round($backupInfo.Length/1MB, 2)) MB)" -ForegroundColor Green
}
else {
    Write-Host "[$(Get-Date)] ERROR: Backup file too small!" -ForegroundColor Red
    exit 1
}

Write-Host "[$(Get-Date)] Backup complete" -ForegroundColor Cyan
