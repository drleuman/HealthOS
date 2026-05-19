# HealthOS — Staging Deployment Guide

This document outlines the step-by-step procedures for deploying, migrating, and verifying the HealthOS monorepo on a staging environment.

---

## 1. Required Environment Configuration

Ensure the following variables are configured in the staging host panel or container config before running builds:

### General & Routing
- `NODE_ENV=production`
- `PORT=4001`
- `APP_ORIGIN=https://staging.healthos.app` (Staging Frontend URL)
- `API_ORIGIN=https://staging-api.healthos.app` (Staging API URL)

### Database Configuration
- `DATABASE_URL=mysql://db_user:db_password@db_host:3306/healthos_staging`

### Auth & JWT secrets
- `API_JWT_SECRET=<<<Generate long cryptographically secure random string>>>`
- `SSO_JWT_SECRET=<<<Generate long cryptographically secure random string>>>`
- `WEBHOOK_SECRET=<<<Generate long cryptographically secure random string>>>`

### Closed Beta Security Controls
- `BETA_ALLOWLIST_REQUIRED=true`
- `BETA_ALLOWLIST=invited_beta_user1@gmail.com,invited_beta_user2@gmail.com`
- `ADMIN_EMAILS=doctorleuman@gmail.com`

### Observability Metrics
- `X_INTERNAL_SECRET=<<<Generate secure string for /metrics>>>`
- `INTERNAL_HEALTH_SECRET=<<<Generate secure string for /internal/health-check>>>`
- `ANALYTICS_SECRET=<<<Generate secure string for analytics endpoints>>>`

### Third-Party Services
- `NEXT_PUBLIC_SENTRY_DSN=https://sentry.io/etc`
- `NEXT_PUBLIC_POSTHOG_KEY=phc_xxx`
- `NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com`

---

## 2. Installation and Build Execution

Run the following commands in the monorepo root directory of the build runner:

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Push/migrate database schema changes
pnpm db:push

# 3. Compile all packages and Next.js/NestJS apps
pnpm rc:build
```

---

## 3. Staging Deployment Verification

Once containers/processes are started:

### A. Run Automatic Verification Commands
```bash
# 1. Start NestJS API server on the host/container
pnpm --filter @healthos/api run start:prod

# 2. Run NestJS Smoke Test Suite
pnpm rc:smoke

# 3. Run Observability Endpoint Verification Check
pnpm rc:verify
```

### B. Manual Browser Checks
1. Navigate to the Staging Web App (`https://staging.healthos.app`).
2. Verify page displays the Closed Beta login prompt.
3. Try logging in with a non-allowlisted email (e.g. `stranger@gmail.com`).
   * *Expected*: Login fails with a clear message: `"This email is not on the beta allowlist."`
4. Log in with an allowlisted email.
   * *Expected*: Token is issued, redirects to onboarding, today dashboard, and logs submit successfully.

---

## 4. Rollback and Recovery Plan

If verification checks fail or a regression is detected:

1. **Rollback App Code**: Revert deployment target to the previous stable release commit hash.
2. **Rollback Database Changes**:
   If schema was modified, restore the database backup taken immediately prior to the deployment deployment task.
3. **Purge Cache**: Clear CDN/Vercel edge caches to ensure old assets are not served to users.
