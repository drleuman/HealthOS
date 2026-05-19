# HealthOS Hybrid MVP — Monorepo

**Stack**: Next.js (Web) + NestJS (API) + Prisma (MySQL) + pnpm

## 🚨 Security & Hygiene
This repository enforces strict rules for secrets and artifacts.
- **NEVER** commit `.env` or build artifacts (`.next`, `dist`).
- **ALWAYS** use `.env.example` as a template.
- **SECRETS**: If a secret is committed, rotate it immediately. See `SECURITY_NOTE.md`.

## 🚀 Quick Start
### 1. Prerequisites
- Node.js >= 18
- pnpm >= 8
- Docker Desktop (for DB)

### 2. Setup (First Run)
```bash
# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local
cp services/api/.env.example services/api/.env

# Start Database
docker-compose up -d

# Push Schema
pnpm db:push
```

### 3. Run Development
```bash
pnpm dev
# Web: http://localhost:3000
# API: http://localhost:4000
```

## 🧪 Testing & Verification
We focus on the "Therapeutic Loop" (Login -> Onboarding -> Today -> Route).

### Run Backend Tests (Event Tracking)
```bash
# Requires DB running
npx ts-node services/api/src/test-tracking.ts
```

### Manual QA
Refer to `QA_CHECKLIST.md` for the full manual verification process of the therapeutic loop.

## 📊 Analytics & Events
Event tracking is implemented via `POST /events`.
- **Public**: Anonymous/Authenticated tracking (rate limited).
- **Protected**: Analytics endpoints require Admin Plan or `X-Analytics-Secret`.

## 📦 Deployment
See `DEPLOYMENT.md` (if available) or standard Vercel/Railway docs.
- **Web**: Deploy to Vercel.
- **API**: Deploy to Railway/Render/AWS.
- **DB**: Managed MySQL (Aiven/AWS RDS).
