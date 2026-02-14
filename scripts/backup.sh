#!/bin/bash
# Automated Daily Backup Script for HealthOS

set -e

# Configuration
BACKUP_DIR="/app/healthos/backups"
RETENTION_DAYS=30
POSTGRES_USER="${POSTGRES_USER:-healthos}"
POSTGRES_DB="${POSTGRES_DB:-healthos}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${DATE}.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Perform backup
echo "[$(date)] Starting backup..."
docker-compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"
echo "[$(date)] Backup created: ${BACKUP_FILE}.gz"

# Delete old backups
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] Old backups cleaned (retention: ${RETENTION_DAYS} days)"

# Verify backup integrity
gunzip -t "${BACKUP_FILE}.gz"
if [ $? -eq 0 ]; then
    echo "[$(date)] Backup verified successfully"
else
    echo "[$(date)] ERROR: Backup verification failed!"
    exit 1
fi

echo "[$(date)] Backup complete"
