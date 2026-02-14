# HealthOS: Deployment Prep Guide (Phase 3)

This repository is ready for deployment. The following steps ensure a clean, secure launch.

## 1. Secrets Management
You have rotated secrets in this iteration. Before deploying:
- [ ] **Vercel (Frontend)**: Add `NEXT_PUBLIC_API_URL` to project settings.
- [ ] **Railway/Render (Backend)**: Add all variables from `services/api/.env.example` (using real production values).
- [ ] **Database**: Provision a managed Postgres instance (e.g., Supabase, Neon, or Railway PG). Update `DATABASE_URL`.

## 2. Build Verification
Ensure the monorepo builds correctly in isolation.

```bash
# Frontend Build
cd apps/web
pnpm build

# Backend Build
cd services/api
pnpm build
```

**Common Issue**: If `@healthos/shared` is missing during build, ensure your CI/CD pipeline runs `pnpm install` at the root first.

## 3. Database Migration
Do not use `db:push` in production. Use migrations.

```bash
# Generate migration (locally)
pnpm prisma migrate dev --name init_production

# Apply in production (CI/CD)
pnpm prisma migrate deploy
```

## 4. Analytics Security
- Set `ANALYTICS_SECRET` in your backend environment variables.
- Use this secret in headers (`X-Analytics-Secret`) to access `/events/analytics/*` endpoints without logging in as admin.

## 5. Domain & CORS
- Update `APP_ORIGIN` in backend `.env` to your production frontend domain (e.g., `https://app.healthos.com`).
- Update `NEXT_PUBLIC_API_URL` in frontend to your production API (e.g., `https://api.healthos.com`).

## 6. Smoke Test (Post-Deploy)
Run the manual `QA_CHECKLIST.md` against the **production URL** immediately after deployment.
