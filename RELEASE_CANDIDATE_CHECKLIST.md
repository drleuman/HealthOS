# HealthOS Closed Beta — Release Candidate Checklist

This checklist defines the steps required to build, configure, verify, and rollback a release candidate (RC) build for the HealthOS closed beta environment.

---

## 1. Setup & Environment Initialisation
- [ ] **Clone/Checkout**: Ensure you are on the release candidate branch/commit.
- [ ] **Dependencies**: Install workspaces dependencies:
  ```bash
  pnpm install
  ```
- [ ] **Environment Files**: Ensure `.env` is configured in the project root and both applications (`apps/web/.env.local` and `services/api/.env`).
- [ ] **Start Database**: Verify MySQL is running and reachable:
  ```bash
  docker-compose up -d mysql
  ```
- [ ] **Apply Database Schema**:
  ```bash
  pnpm db:push
  ```
- [ ] **Seed Deterministic Data** (Optional for staging/dev checks):
  ```bash
  pnpm rc:seed
  ```

---

## 2. Compile & Programmatic Verification
- [ ] **Build All Workspace Components**:
  ```bash
  pnpm rc:build
  ```
- [ ] **Execute API Smoke Test Suite**:
  ```bash
  pnpm rc:smoke
  ```
- [ ] **Verify Observability/Health Uplinks**:
  ```bash
  pnpm rc:verify
  ```

---

## 3. Manual Functional QA Protocols

### A. Authentication & Allowlist Redirection
- [ ] **Allowlisted Login**: Log in with an allowlisted email (e.g. `user_test@healthos.app`).
  * *Expected Outcome*: Magic link/token sent, redirects user to Onboarding (if incomplete) or Today dashboard.
- [ ] **Non-Allowlisted Block**: Attempt login with a non-allowlisted email (e.g. `external@guest.com`).
  * *Expected Outcome*: Authentication blocked, error code 401 returns, client displays localized alert: `"This email is not on the beta allowlist."`

### B. User Flow Progression
- [ ] **Onboarding Completion**: Log in as a new user with incomplete onboarding.
  * *Expected Outcome*: Client blocks dashboard access and renders Onboarding Survey. Completing it calls `POST /assessment` and redirects to `/app/today`.
- [ ] **Today Dashboard Rendition**: Visit `/app/today` after onboarding.
  * *Expected Outcome*: Active circadian actions and checks render dynamically with no empty placeholders.
- [ ] **Day Log Submission**: Click "Record" or complete daily check on Today page.
  * *Expected Outcome*: Payload containing `{ day, action_completed, self_report_effect }` POSTs to `/user/day-log`. Page redirects/reloads showing completion state.
- [ ] **Duplicate Log Warning**: Reload the dashboard and attempt to log the same circadian day again.
  * *Expected Outcome*: Backend intercepts and returns `{ ok: false, error: 'DUPLICATE_SUBMISSION' }`. Frontend renders the glassmorphic Duplicate warning dialog with localized content and navigation CTAs.

### C. Gating & Roles Authorization
- [ ] **Active Trial State**: Visit `/app/today` with a active trial user.
  * *Expected Outcome*: Normal protocol controls are visible.
- [ ] **Expired Trial Gating**: Visit `/app/today` with an expired trial user.
  * *Expected Outcome*: User interface displays the custom Paywall upgrade view.
- [ ] **Admin vs Member Separation**: Log in as a standard member and attempt to access `/admin/overview` or `/admin/users`.
  * *Expected Outcome*: Route rejects access, redirects back to member panel or throws unauthorized response. Logging in as admin displays the clinical dashboard instrumentation.

### D. Observability & Privacy Checks
- [ ] **Verify Privacy Sanitization**: Trigger actions/checks containing text fields.
  * *Expected Outcome*: Verify that raw entries or medical comments in `context`/`meta` are truncated or excluded by `TrackingService` before DB writes.
- [ ] **Public Observability Check**:
  * Execute `GET /health`. *Expected*: 200 OK.
  * Execute `GET /ready`. *Expected*: 200 Ready.
- [ ] **Protected metrics Check**:
  * Execute `GET /metrics` or `/internal/health-check` without headers. *Expected*: 401 Unauthorized.
  * Execute `GET /metrics` with `x-internal-secret`. *Expected*: 200 JSON metrics data.

---

## 4. Rollback and Disaster Recovery Procedures

In the event of a deployment failure or critical runtime anomaly, execute the following recovery steps:

### Phase A: Revert Application Builds
1. **Frontend Rollback**:
   - In Vercel (or hosting dashboard), select the previous successful build deployment.
   - Click **Promote to Production** to immediately shift traffic away from the faulty release candidate.
2. **Backend Services Revert**:
   - Re-tag the prior stable Docker image as `latest` / production target:
     ```bash
     docker tag healthos-api:previous-stable healthos-api:latest
     docker push healthos-api:latest
     ```
   - Restart the app service cluster container instances to pull the reverted image.

### Phase B: Database Schema Decisions
- If the new RC included a destructive schema migration, evaluate if a schema rollback is required:
  - If backward compatible (e.g. added nullable columns): **Leave database schema as is** to prevent data loss.
  - If a revert is mandatory: Execute the schema migration down-script (or restore the pre-migration snapshot backup).
