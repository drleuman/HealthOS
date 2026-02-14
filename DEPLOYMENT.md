# Deployment Guide

## Quick Start

### Local Development
```bash
# Install dependencies
pnpm install

# Start database
docker-compose up -d postgres

# Run migrations
cd services/api
npx prisma migrate dev

# Start API
pnpm --filter @healthos/api dev
```

### Production Deployment
```bash
# 1. Set environment variables
cp .env.production.example .env.production
# Edit .env.production with your values

# 2. Start services
docker-compose --env-file .env.production up -d

# 3. Run migrations
docker-compose exec api npx prisma migrate deploy

# 4. Verify
curl http://localhost:4000/health
```

---

## Environment Separation

### Development
- **Database**: Local PostgreSQL
- **Secrets**: `.env` file
- **Hot reload**: Enabled
- **Logging**: Debug level
- **CORS**: Permissive

### Staging
- **Database**: Staging PostgreSQL (separate instance)
- **Secrets**: Environment variables
- **Hot reload**: Disabled
- **Logging**: Info level
- **CORS**: Strict (staging domain)
- **URL**: `https://api-staging.healthos.com`

### Production
- **Database**: Production PostgreSQL (managed service)
- **Secrets**: Secrets manager (AWS Secrets Manager, etc.)
- **Hot reload**: Disabled
- **Logging**: Warn/Error level
- **CORS**: Strict (production domain)
- **URL**: `https://api.healthos.com`

---

## Docker Deployment

### Build Image
```bash
# Build API image
docker build -t healthos-api:latest -f services/api/Dockerfile .

# Test image locally
docker run -p 4000:4000 \
  -e DATABASE_URL=postgresql://... \
  -e API_JWT_SECRET=... \
  healthos-api:latest
```

### Docker Compose (Production)
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Update and restart
docker-compose pull
docker-compose up -d
```

### Docker Compose (Staging)
```bash
# Use staging environment file
docker-compose --env-file .env.staging up -d
```

---

## Cloud Deployment

### AWS (ECS + RDS)

#### 1. Setup RDS PostgreSQL
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier healthos-prod \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username healthos \
  --master-user-password <password> \
  --allocated-storage 20
```

#### 2. Push Docker image to ECR
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag and push
docker tag healthos-api:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/healthos-api:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/healthos-api:latest
```

#### 3. Create ECS Task Definition
```json
{
  "family": "healthos-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/healthos-api:latest",
      "portMappings": [
        {
          "containerPort": 4000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:...:secret:healthos/database-url"
        },
        {
          "name": "API_JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:...:secret:healthos/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/healthos-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "api"
        }
      }
    }
  ]
}
```

#### 4. Create ECS Service
```bash
aws ecs create-service \
  --cluster healthos-cluster \
  --service-name healthos-api \
  --task-definition healthos-api \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Google Cloud (Cloud Run + Cloud SQL)

#### 1. Setup Cloud SQL
```bash
gcloud sql instances create healthos-prod \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1
```

#### 2. Build and push to GCR
```bash
# Build
gcloud builds submit --tag gcr.io/PROJECT_ID/healthos-api

# Deploy to Cloud Run
gcloud run deploy healthos-api \
  --image gcr.io/PROJECT_ID/healthos-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=healthos-database-url:latest \
  --set-secrets API_JWT_SECRET=healthos-jwt-secret:latest
```

### DigitalOcean (App Platform)

#### 1. Create app.yaml
```yaml
name: healthos
services:
  - name: api
    github:
      repo: your-org/healthos
      branch: main
      deploy_on_push: true
    dockerfile_path: services/api/Dockerfile
    http_port: 4000
    instance_count: 2
    instance_size_slug: basic-xxs
    envs:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        type: SECRET
      - key: API_JWT_SECRET
        type: SECRET
    health_check:
      http_path: /health

databases:
  - name: healthos-db
    engine: PG
    version: "15"
```

#### 2. Deploy
```bash
doctl apps create --spec app.yaml
```

---

## CI/CD Setup

### GitHub Actions (Already configured)

#### Required Secrets
Add these to GitHub repository secrets:
- `DOCKER_USERNAME` - Docker Hub username
- `DOCKER_PASSWORD` - Docker Hub password/token
- `STAGING_SSH_KEY` - SSH key for staging server
- `PROD_SSH_KEY` - SSH key for production server

#### Workflow Triggers
- **Push to `develop`**: Deploy to staging
- **Push to `main`**: Deploy to production
- **Pull requests**: Run tests only

### GitLab CI
```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  image: node:18
  services:
    - postgres:15
  variables:
    POSTGRES_DB: healthos_test
    POSTGRES_USER: healthos
    POSTGRES_PASSWORD: test
  script:
    - npm install -g pnpm
    - pnpm install
    - cd services/api
    - npx prisma migrate deploy
    - pnpm test

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA -f services/api/Dockerfile .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

deploy:
  stage: deploy
  only:
    - main
  script:
    - ssh user@prod-server 'cd /app && docker-compose pull && docker-compose up -d'
```

---

## Environment Variables

### Generate Secrets
```bash
# Generate strong secrets
openssl rand -base64 64

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

### Required Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# API Secrets
API_JWT_SECRET=<64-char-secret>
WEBHOOK_SECRET=<64-char-secret>

# Application
NODE_ENV=production
APP_ORIGIN=https://app.healthos.com
PORT=4000
```

### Optional Variables
```bash
# Logging
LOG_LEVEL=info

# SSO
SSO_JWT_SECRET=<64-char-secret>

# Redis (for future BullMQ)
REDIS_URL=redis://localhost:6379
```

---

## Health Checks

### Kubernetes Liveness Probe
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 4000
  initialDelaySeconds: 30
  periodSeconds: 10
```

### Kubernetes Readiness Probe
```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 4000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Docker Healthcheck (already in Dockerfile)
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

---

## Monitoring

### Logs
```bash
# Docker
docker-compose logs -f api

# Kubernetes
kubectl logs -f deployment/healthos-api

# AWS ECS
aws logs tail /ecs/healthos-api --follow
```

### Metrics
```bash
# Prometheus scraping
curl http://localhost:4000/metrics

# Example Prometheus config
scrape_configs:
  - job_name: 'healthos-api'
    static_configs:
      - targets: ['api:4000']
    metrics_path: '/metrics'
```

---

## Rollback

### Docker Compose
```bash
# Rollback to previous image
docker-compose down
docker-compose pull healthos-api:previous-tag
docker-compose up -d
```

### Kubernetes
```bash
# Rollback deployment
kubectl rollout undo deployment/healthos-api

# Rollback to specific revision
kubectl rollout undo deployment/healthos-api --to-revision=2
```

### AWS ECS
```bash
# Update service to previous task definition
aws ecs update-service \
  --cluster healthos-cluster \
  --service healthos-api \
  --task-definition healthos-api:PREVIOUS_REVISION
```

---

## Troubleshooting

### API won't start
```bash
# Check logs
docker-compose logs api

# Common issues:
# 1. Missing environment variables
# 2. Database connection failed
# 3. Secrets validation failed
```

### Database connection issues
```bash
# Test connection
docker-compose exec api npx prisma db execute --stdin <<< "SELECT 1"

# Check DATABASE_URL
docker-compose exec api printenv DATABASE_URL
```

### Migration failures
```bash
# Check migration status
docker-compose exec api npx prisma migrate status

# Resolve migration issues
docker-compose exec api npx prisma migrate resolve --help
```

---

## Security Checklist

Before deploying to production:
- [ ] All secrets generated with strong randomness
- [ ] DATABASE_URL uses SSL (`?sslmode=require`)
- [ ] APP_ORIGIN set to production domain
- [ ] NODE_ENV=production
- [ ] Secrets stored in secrets manager (not .env files)
- [ ] HTTPS enabled (reverse proxy/load balancer)
- [ ] Firewall configured (only ports 80/443 open)
- [ ] Database backups configured
- [ ] Monitoring and alerting set up
- [ ] Rate limiting tested
- [ ] CORS tested with production domain

---

## Performance Optimization

### Database Connection Pooling
```typescript
// Prisma already handles this, but you can configure:
// In schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Add connection pool settings to DATABASE_URL:
  // ?connection_limit=10&pool_timeout=20
}
```

### Horizontal Scaling
```bash
# Docker Compose
docker-compose up -d --scale api=3

# Kubernetes
kubectl scale deployment healthos-api --replicas=3
```

### Caching
```typescript
// Already implemented: ProgramRegistry with 5-minute cache
// For more aggressive caching, add Redis
```

---

## Backup and Recovery

### Database Backup
```bash
# Manual backup
docker-compose exec postgres pg_dump -U healthos healthos > backup.sql

# Automated backup (cron)
0 2 * * * docker-compose exec -T postgres pg_dump -U healthos healthos > /backups/healthos_$(date +\%Y\%m\%d).sql
```

### Restore
```bash
# Restore from backup
docker-compose exec -T postgres psql -U healthos healthos < backup.sql
```

---

## Cost Optimization

### Development
- Use local PostgreSQL (free)
- Single API instance

### Staging
- Smallest instance sizes
- Shared database instance
- Scale down during off-hours

### Production
- Right-size instances based on metrics
- Use managed databases (auto-scaling)
- Enable auto-scaling for API
- Use CDN for static assets
- Monitor costs with cloud provider tools
