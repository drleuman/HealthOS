# Automated Backup Setup Guide

## Quick Setup

### Windows (Task Scheduler)

1. **Open Task Scheduler**:
   ```
   Win + R → taskschd.msc
   ```

2. **Create Task**:
   - Name: "HealthOS Daily Backup"
   - Trigger: Daily at 2:00 AM
   - Action: Start a program
     - Program: `powershell.exe`
     - Arguments: `-File F:\HEALTHOS\scripts\backup.ps1`
     - Start in: `F:\HEALTHOS`

3. **Test**:
   ```powershell
   cd F:\HEALTHOS
   .\scripts\backup.ps1
   ```

### Linux/Mac (Cron)

1. **Edit crontab**:
   ```bash
   crontab -e
   ```

2. **Add line** (runs daily at 2 AM):
   ```
   0 2 * * * cd /app/healthos && ./scripts/backup.sh >> /var/log/healthos-backup.log 2>&1
   ```

3. **Make executable**:
   ```bash
   chmod +x scripts/backup.sh
   ```

4. **Test**:
   ```bash
   cd /app/healthos
   ./scripts/backup.sh
   ```

### Docker Compose (Recommended for Production)

Add backup service to `docker-compose.yml`:

```yaml
services:
  backup:
    image: postgres:15-alpine
    depends_on:
      - postgres
    environment:
      PGHOST: postgres
      PGUSER: ${POSTGRES_USER:-healthos}
      PGDATABASE: ${POSTGRES_DB:-healthos}
      PGPASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - ./backups:/backups
      - ./scripts:/scripts
    command: >
      sh -c "
      while true; do
        sleep 86400;
        pg_dump -U ${POSTGRES_USER:-healthos} ${POSTGRES_DB:-healthos} | gzip > /backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz;
        find /backups -name 'backup_*.sql.gz' -mtime +30 -delete;
      done
      "
    restart: unless-stopped
```

Then start:
```bash
docker-compose up -d backup
```

## Backup Configuration

### Retention Policy
- **Default**: 30 days
- **Change**: Edit `RETENTION_DAYS` in script

### Backup Location
- **Windows**: `F:\HEALTHOS\backups\`
- **Linux**: `/app/healthos/backups/`
- **Docker**: `./backups/` (mounted volume)

### Backup Size
- **Typical**: 1-10 MB (compressed)
- **Monitor**: Check disk space regularly

## Restore Procedure

### From Compressed Backup

**Windows**:
```powershell
# Extract
Expand-Archive backups\backup_20260213_020000.zip -DestinationPath temp

# Restore
Get-Content temp\backup_20260213_020000.sql | docker-compose exec -T postgres psql -U healthos healthos
```

**Linux**:
```bash
# Extract and restore
gunzip -c backups/backup_20260213_020000.sql.gz | \
  docker-compose exec -T postgres psql -U healthos healthos
```

### Verify Restore
```bash
# Check user count
docker-compose exec postgres psql -U healthos healthos -c "SELECT COUNT(*) FROM \"User\";"

# Check latest activity
docker-compose exec postgres psql -U healthos healthos -c "SELECT * FROM \"UserState\" ORDER BY \"lastActive\" DESC LIMIT 5;"
```

## Monitoring

### Check Last Backup
**Windows**:
```powershell
Get-ChildItem F:\HEALTHOS\backups | Sort-Object LastWriteTime -Descending | Select-Object -First 1
```

**Linux**:
```bash
ls -lht /app/healthos/backups/ | head -n 2
```

### Backup Logs
**Windows**: Check Task Scheduler history

**Linux**: 
```bash
tail -f /var/log/healthos-backup.log
```

## Troubleshooting

### Backup Fails
```bash
# Check Docker is running
docker ps

# Check PostgreSQL is accessible
docker-compose exec postgres psql -U healthos -c "SELECT 1"

# Check disk space
df -h  # Linux
Get-PSDrive  # Windows
```

### Backup File Empty
```bash
# Check PostgreSQL credentials
docker-compose exec postgres env | grep PG

# Test manual backup
docker-compose exec postgres pg_dump -U healthos healthos > test_backup.sql
```

### Restore Fails
```bash
# Check backup file integrity
gunzip -t backup_file.sql.gz  # Linux
Test-Archive backup_file.zip  # Windows

# Check PostgreSQL is ready
docker-compose exec postgres pg_isready
```

## Best Practices

1. **Test restores monthly**: Don't trust untested backups
2. **Monitor backup size**: Sudden changes indicate issues
3. **Off-site backups**: Copy to S3/cloud storage weekly
4. **Alert on failures**: Set up email/Slack notifications

## Off-Site Backup (Optional)

### AWS S3
```bash
# Install AWS CLI
# Configure: aws configure

# Add to backup script
aws s3 cp backups/backup_$(date +%Y%m%d).sql.gz s3://healthos-backups/
```

### Google Cloud Storage
```bash
# Install gcloud CLI
# Configure: gcloud auth login

# Add to backup script
gsutil cp backups/backup_$(date +%Y%m%d).sql.gz gs://healthos-backups/
```

## Automated Testing

Create a test restore script:

```bash
#!/bin/bash
# test-restore.sh

# Get latest backup
LATEST_BACKUP=$(ls -t backups/*.sql.gz | head -1)

# Create test database
docker-compose exec postgres createdb -U healthos healthos_test

# Restore to test database
gunzip -c $LATEST_BACKUP | docker-compose exec -T postgres psql -U healthos healthos_test

# Verify
COUNT=$(docker-compose exec postgres psql -U healthos healthos_test -t -c "SELECT COUNT(*) FROM \"User\";")

if [ $COUNT -gt 0 ]; then
    echo "✅ Restore test passed: $COUNT users found"
    docker-compose exec postgres dropdb -U healthos healthos_test
    exit 0
else
    echo "❌ Restore test failed: No users found"
    exit 1
fi
```

Run monthly:
```bash
chmod +x scripts/test-restore.sh
./scripts/test-restore.sh
```

---

## ✅ Backup System Ready

Once configured, your backups will:
- Run automatically every day at 2 AM
- Compress to save space
- Keep 30 days of history
- Can be restored in minutes

**Next**: Test the backup script manually before scheduling.
