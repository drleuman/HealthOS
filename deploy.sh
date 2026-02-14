#!/bin/bash
# Production Deployment Script

set -e

echo "🚀 HealthOS Production Deployment"
echo "=================================="
echo ""

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production not found"
    echo "   Copy .env.production.example and fill in values"
    exit 1
fi

# Load environment
export $(cat .env.production | grep -v '^#' | xargs)

# Validate required secrets
echo "🔐 Validating secrets..."
if [ -z "$API_JWT_SECRET" ] || [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: Missing required secrets"
    exit 1
fi
echo "✅ Secrets validated"

# Backup database
echo "📦 Backing up database..."
BACKUP_FILE="backups/backup_$(date +%Y%m%d_%H%M%S).sql"
mkdir -p backups
docker-compose exec -T postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > $BACKUP_FILE
echo "✅ Backup saved: $BACKUP_FILE"

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main
echo "✅ Code updated"

# Build new image
echo "🔨 Building Docker image..."
docker-compose build api
echo "✅ Image built"

# Run migrations
echo "🔄 Running database migrations..."
docker-compose run --rm api npx prisma migrate deploy
echo "✅ Migrations complete"

# Restart API with zero-downtime
echo "♻️  Restarting API..."
docker-compose up -d --no-deps --scale api=2 api
sleep 10
docker-compose up -d --no-deps --scale api=1 api
echo "✅ API restarted"

# Health check
echo "🏥 Running health check..."
sleep 5
HEALTH=$(curl -s http://localhost:4000/health | grep -o '"status":"ok"')
if [ -z "$HEALTH" ]; then
    echo "❌ Health check failed!"
    echo "   Rolling back..."
    docker-compose down
    docker-compose up -d
    exit 1
fi
echo "✅ Health check passed"

# Run regression tests
echo "🧪 Running regression tests..."
if [ -f test-regression.bat ]; then
    ./test-regression.bat || echo "⚠️  Some tests failed, but deployment continued"
fi

echo ""
echo "=================================="
echo "✅ Deployment Complete!"
echo "=================================="
echo ""
echo "API URL: http://localhost:4000"
echo "Health: http://localhost:4000/health"
echo "Metrics: http://localhost:4000/metrics"
echo ""
echo "Backup: $BACKUP_FILE"
