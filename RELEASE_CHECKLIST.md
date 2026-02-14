# Release Checklist (HealthOS Beta)

## 1. Local Build Verification
- [ ] Backend: `cd services/api && pnpm build` (Must succeed)
- [ ] Frontend: `cd apps/web && pnpm build` (Must succeed)
- [ ] Git: `git status` must be clean (no tracked secrets/artifacts).

## 2. Local Migration Check
- [ ] Run `npx prisma migrate dev` locally to ensure schema is sync'd.
- [ ] Verify `prisma/migrations` folder is committed.

## 3. Environment Config
- [ ] Frontend: `NEXT_PUBLIC_API_URL` points to Production API.
- [ ] Backend: `APP_ORIGIN` matches Production Frontend URL.
- [ ] Backend: `ANALYTICS_SECRET` is set to a long, secure string.
- [ ] Backend: `API_JWT_SECRET` is strong (min 32 chars).

## 4. Smoke Tests (Staging/Prod)
Run the smoke test script against the target URL:
```bash
# Example
API_URL=https://api.healthos.com ./test-beta-smoke.sh
```
- [ ] Health Check (200 OK)
- [ ] Login (Token received)
- [ ] Assessment (201 Created)
- [ ] Today Plan (200 OK) - **Requires Plan >= Member**
- [ ] Tracking (201 Created)
- [ ] Analytics (200 OK with correct secret)

## 5. Webhook Verification
- [ ] Compute HMAC signature of `{ "test": true }` using `WEBHOOK_SECRET`.
- [ ] Send POST to `/webhooks/mithohacks` with `x-mh-signature`.
- [ ] Expect 200/201 (or 400 if invalid body, but never 500).

## 6. Final Go/No-Go
- [ ] If all above PASS -> DEPLOY.
- [ ] After Deploy -> Recruit 5 Beta Users.
