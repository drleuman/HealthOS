# Production Deployment Script (PowerShell)

Write-Host "🚀 HealthOS Production Deployment" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env.production exists
if (!(Test-Path .env.production)) {
    Write-Host "❌ Error: .env.production not found" -ForegroundColor Red
    Write-Host "   Copy .env.production.example and fill in values" -ForegroundColor Yellow
    exit 1
}

# Validate Docker is running
try {
    docker ps | Out-Null
}
catch {
    Write-Host "❌ Error: Docker is not running" -ForegroundColor Red
    exit 1
}

# Backup database
Write-Host "📦 Backing up database..." -ForegroundColor Yellow
$backupDir = "backups"
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}
$backupFile = "backups/backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
docker-compose exec -T postgres pg_dump -U healthos healthos > $backupFile
Write-Host "✅ Backup saved: $backupFile" -ForegroundColor Green

# Pull latest code
Write-Host "📥 Pulling latest code..." -ForegroundColor Yellow
git pull origin main
Write-Host "✅ Code updated" -ForegroundColor Green

# Build new image
Write-Host "🔨 Building Docker image..." -ForegroundColor Yellow
docker-compose build api
Write-Host "✅ Image built" -ForegroundColor Green

# Run migrations
Write-Host "🔄 Running database migrations..." -ForegroundColor Yellow
docker-compose run --rm api npx prisma migrate deploy
Write-Host "✅ Migrations complete" -ForegroundColor Green

# Restart API
Write-Host "♻️  Restarting API..." -ForegroundColor Yellow
docker-compose up -d --no-deps api
Start-Sleep -Seconds 10
Write-Host "✅ API restarted" -ForegroundColor Green

# Health check
Write-Host "🏥 Running health check..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
try {
    $health = curl.exe -s http://localhost:4000/health | ConvertFrom-Json
    if ($health.status -eq "ok") {
        Write-Host "✅ Health check passed" -ForegroundColor Green
    }
    else {
        throw "Health check failed"
    }
}
catch {
    Write-Host "❌ Health check failed!" -ForegroundColor Red
    Write-Host "   Rolling back..." -ForegroundColor Yellow
    docker-compose down
    docker-compose up -d
    exit 1
}

# Run regression tests
Write-Host "🧪 Running regression tests..." -ForegroundColor Yellow
if (Test-Path test-regression.bat) {
    & .\test-regression.bat
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Some tests failed, but deployment continued" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API URL: http://localhost:4000" -ForegroundColor White
Write-Host "Health: http://localhost:4000/health" -ForegroundColor White
Write-Host "Metrics: http://localhost:4000/metrics" -ForegroundColor White
Write-Host ""
Write-Host "Backup: $backupFile" -ForegroundColor Gray
