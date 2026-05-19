# HealthOS Closed Beta — Release Notes

**Version**: `1.0.0-rc1`  
**Release Date**: `[YYYY-MM-DD]`  
**Target Environment**: Staging & Production Closed Beta  

---

## 1. Summary of Release
This release candidate stabilizes the core runtime engine, implements strict email allowlist gating, handles user progression gracefully, implements strict telemetry privacy filtering, and resolves visual edge cases (e.g. duplicate day submissions) to deliver a polished experience for our closed beta users.

---

## 2. Key Accomplishments & Included Fixes
* **Public/Private Routing**: Corrected JWT Auth guards to strictly respect the `@Public()` routing decorator. Public observability routes (`/health` and `/ready`) are now accessible without authorization headers.
* **Duplicate Submissions Defense**: Hardened duplicate check logic in Prisma writes. Resolved query filtering edge cases where a null day caused validation false-positives. Added dynamic error handling on the frontend with translations (`App.Today.duplicate_title`, etc.) and CTAs.
* **Closed Beta Allowlist Verification**: Locked `/auth/login` and WooCommerce SSO endpoints under an allowlist check. Non-allowlisted users are rejected with `401 Unauthorized`.
* **Telemetry Sanitization**: Added server-side recursive payload filtration to wipe sensitive medical, text, or clinical keywords before writing event metadata/context to database logs.
* **System Observability & Protection**: Secured `/metrics` and `/internal/health-check` endpoints using internal secrets check.

---

## 3. Known Limitations
* **Trial Upgrades**: The paywall screen is static; users must contact system support to manually modify subscription plans or bypass gating.
* **Local Development Seed Requirements**: Developers must execute the db seed script manually to generate test profiles matching different active/expired/incomplete states.

---

## 4. Operator Deployment Checklist
- [ ] Set required environment variables on staging/production (refer to `.env.production.example`).
- [ ] Deploy backend NestJS API cluster.
- [ ] Verify `/health` and `/ready` routes return status `ok` and `ready`.
- [ ] Build and deploy frontend Next.js application.
- [ ] Add testing stakeholders to the `BETA_ALLOWLIST` environment list.

---

## 5. Rollback Notes
If live regression is detected post-deployment:
1. Revert Next.js Vercel frontend targeting to the previous successful production deployment ID.
2. Rollback the API container service registry tag to the previous stable release version.
3. Validate that the `/health` and `/ready` endpoints are reporting stable statuses.

---

## 6. Support & Troubleshooting
* **Logs Inspection**: Check the backend container logs for `SecretsValidator` outputs.
* **Database Verification**: Connect to MySQL database instance and query the `DailyLog` table to verify user submissions:
  ```sql
  SELECT * FROM DailyLog ORDER BY createdAt DESC LIMIT 10;
  ```
* **Metrics Ingestion**: Verify prometheus/internal metrics by executing:
  ```bash
  curl -H "x-internal-secret: <SECRET>" https://<API_URL>/metrics
  ```
