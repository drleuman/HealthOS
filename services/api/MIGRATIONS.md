# Prisma Migration Workflow

## Development Environment

### 1. Create a new migration
```bash
cd services/api
npx prisma migrate dev --name add_job_result_model
```

This will:
- Create a new migration file in `prisma/migrations/`
- Apply the migration to your development database
- Regenerate Prisma Client

### 2. Reset database (development only)
```bash
npx prisma migrate reset
```

⚠️ **Warning**: This will delete all data!

### 3. View migration status
```bash
npx prisma migrate status
```

## Staging Environment

### 1. Deploy pending migrations
```bash
# SSH into staging server
ssh user@staging-server

# Navigate to project
cd /app/healthos

# Pull latest code
git pull origin develop

# Run migrations
cd services/api
npx prisma migrate deploy
```

### 2. Verify migration
```bash
npx prisma migrate status
# Should show: "Database schema is up to date!"
```

## Production Environment

### Pre-deployment Checklist
- [ ] Test migration on staging
- [ ] Backup production database
- [ ] Review migration SQL
- [ ] Plan rollback strategy
- [ ] Schedule maintenance window (if needed)

### 1. Backup database
```bash
# On production server
pg_dump -U healthos -d healthos > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Deploy migration
```bash
# SSH into production server
ssh user@prod-server

# Navigate to project
cd /app/healthos

# Pull latest code
git pull origin main

# Run migrations
cd services/api
npx prisma migrate deploy
```

### 3. Verify deployment
```bash
# Check migration status
npx prisma migrate status

# Test API health
curl https://api.healthos.com/health
curl https://api.healthos.com/ready
```

### 4. Rollback (if needed)
```bash
# Restore from backup
psql -U healthos -d healthos < backup_YYYYMMDD_HHMMSS.sql

# Revert code
git revert <commit-hash>
git push origin main

# Redeploy
docker-compose pull
docker-compose up -d
```

## Docker Deployment

### Using docker-compose
```bash
# In docker-compose.yml, add migration service
services:
  migrate:
    build:
      context: ../..
      dockerfile: services/api/Dockerfile
    command: npx prisma migrate deploy
    environment:
      DATABASE_URL: ${DATABASE_URL}
    depends_on:
      postgres:
        condition: service_healthy
```

### Run migrations
```bash
# Run migration service
docker-compose run --rm migrate

# Start application
docker-compose up -d api
```

## CI/CD Integration

### GitHub Actions (already configured in ci-cd.yml)
```yaml
- name: Run database migrations
  env:
    DATABASE_URL: postgresql://healthos:test@localhost:5432/healthos_test
  run: pnpm --filter @healthos/api exec prisma db push
```

### Production Deployment Script
```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Deploying to production..."

# Backup database
echo "📦 Backing up database..."
docker-compose exec -T postgres pg_dump -U healthos healthos > backup_$(date +%Y%m%d_%H%M%S).sql

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Run migrations
echo "🔄 Running migrations..."
docker-compose run --rm migrate

# Restart API
echo "♻️  Restarting API..."
docker-compose up -d --no-deps api

# Health check
echo "🏥 Health check..."
sleep 5
curl -f http://localhost:4000/health || exit 1

echo "✅ Deployment complete!"
```

## Migration Best Practices

### 1. Always test migrations
```bash
# Create test database
createdb healthos_test

# Test migration
DATABASE_URL=postgresql://user:pass@localhost:5432/healthos_test \
  npx prisma migrate deploy

# Verify
DATABASE_URL=postgresql://user:pass@localhost:5432/healthos_test \
  npx prisma migrate status
```

### 2. Review generated SQL
```bash
# View migration SQL
cat prisma/migrations/YYYYMMDDHHMMSS_migration_name/migration.sql
```

### 3. Handle data migrations
```typescript
// For complex data migrations, create a script
// scripts/migrate-data.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Example: Migrate old data to new structure
  const users = await prisma.user.findMany();
  
  for (const user of users) {
    await prisma.userState.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        programId: 'circadian_reset_14',
        currentDay: 1,
        streak: 0,
      },
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### 4. Zero-downtime migrations
For large tables, use these strategies:

**Add column (safe)**:
```sql
ALTER TABLE users ADD COLUMN new_field TEXT;
```

**Remove column (requires 2-step deploy)**:
```sql
-- Step 1: Deploy code that doesn't use the column
-- Step 2: Remove column
ALTER TABLE users DROP COLUMN old_field;
```

**Rename column (requires 3-step deploy)**:
```sql
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN new_name TEXT;

-- Step 2: Copy data
UPDATE users SET new_name = old_name;

-- Step 3: Remove old column
ALTER TABLE users DROP COLUMN old_name;
```

## Troubleshooting

### Migration failed mid-way
```bash
# Mark migration as rolled back
npx prisma migrate resolve --rolled-back MIGRATION_NAME

# Fix the issue and re-run
npx prisma migrate deploy
```

### Migration applied but not recorded
```bash
# Mark migration as applied
npx prisma migrate resolve --applied MIGRATION_NAME
```

### Database out of sync
```bash
# View current state
npx prisma migrate status

# Reset (development only!)
npx prisma migrate reset

# Production: Manual intervention required
# 1. Backup database
# 2. Review migration history
# 3. Apply missing migrations manually
```

## Environment-Specific Configurations

### Development (.env)
```bash
DATABASE_URL=postgresql://localhost:5432/healthos_dev
```

### Staging (.env.staging)
```bash
DATABASE_URL=postgresql://staging-db:5432/healthos_staging
```

### Production (.env.production)
```bash
DATABASE_URL=postgresql://prod-db:5432/healthos_production
```

## Monitoring Migrations

### Log migration events
```typescript
// In your deployment script
const { execSync } = require('child_process');

try {
  console.log('[Migration] Starting...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('[Migration] Success!');
  
  // Send notification (Slack, email, etc.)
  notifySuccess('Migrations deployed successfully');
} catch (error) {
  console.error('[Migration] Failed!', error);
  notifyFailure('Migration deployment failed');
  process.exit(1);
}
```

### Track migration history
```sql
-- View Prisma migration history
SELECT * FROM "_prisma_migrations" ORDER BY finished_at DESC;
```

---

## Quick Reference

```bash
# Development
npx prisma migrate dev --name <name>    # Create & apply migration
npx prisma migrate reset                # Reset database
npx prisma studio                       # Open database GUI

# Production
npx prisma migrate deploy               # Apply pending migrations
npx prisma migrate status               # Check migration status
npx prisma migrate resolve              # Resolve migration issues

# Database
npx prisma db push                      # Sync schema without migration
npx prisma db pull                      # Pull schema from database
npx prisma db seed                      # Run seed script

# Client
npx prisma generate                     # Generate Prisma Client
npx prisma format                       # Format schema file
```
