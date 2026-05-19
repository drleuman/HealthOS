# HealthOS — Beta Operator Runbook

This runbook guides operators through administrative, testing, and troubleshooting workflows for the HealthOS Closed Beta launch.

---

## 1. Environment and Access Configurations

### Configuring the Closed Beta Allowlist
The allowlist is managed via the environment variable `BETA_ALLOWLIST` (comma-separated email list).

- **Locating Configuration**:
  - Local Dev: `services/api/.env`
  - Production/Staging: Set via host panel environment configuration (e.g. Vercel, Railway, AWS ECS).
- **Adding/Removing Cohort Members**:
  To add `patient_test@healthos.app`, append it to the comma-separated list:
  ```bash
  BETA_ALLOWLIST="beta_member@healthos.app,user_test@healthos.app,patient_test@healthos.app"
  ```
  Restart the API service for changes to take effect.
- **Enabling/Disabling Allowlist Check**:
  To disable allowlist checking (e.g., in open sandbox), set:
  ```bash
  BETA_ALLOWLIST_REQUIRED=false
  ```

### Configuring Admin Clinicians
The list of admin emails is configured via the environment variable `ADMIN_EMAILS` (comma-separated email list):
```bash
ADMIN_EMAILS="doctorleuman@gmail.com,admin@healthos.app"
```

---

## 2. Cohort Diagnostics (MySQL & Prisma Commands)

For these commands, ensure you have access to the database via Prisma Studio (`pnpm db:studio`) or a MySQL client.

### Verify a User's Account is Created
To check if a user is created and see their role:
```sql
SELECT id, email, role, plan, createdAt FROM User WHERE email = 'user_test@healthos.app';
```
Or via Prisma client:
```javascript
await prisma.user.findUnique({ where: { email: 'user_test@healthos.app' } });
```

### Check Onboarding/State Status
To inspect whether onboarding is complete (`completedAssessment` or presence of a profile type):
```sql
SELECT userId, completedAssessment, currentDay, profileType FROM UserState 
JOIN User ON User.id = UserState.userId 
WHERE User.email = 'user_test@healthos.app';
```

### Inspect Daily Circadian State (Today Dashboard)
To inspect the user's circadian state index synchronization:
```sql
SELECT userId, dayIndex, lastLoggedAt FROM UserBehaviorState 
JOIN User ON User.id = UserBehaviorState.userId 
WHERE User.email = 'user_test@healthos.app';
```

### Read daily circadian Logs
To audit a user's submitted logs:
```sql
SELECT User.email, DailyLog.day, DailyLog.action_completed, DailyLog.createdAt 
FROM DailyLog 
JOIN User ON User.id = DailyLog.userId 
WHERE User.email = 'user_test@healthos.app' 
ORDER BY DailyLog.day DESC;
```

### Safely Reset a Test User
To reset a user back to Day 1 (for testing Onboarding or Today log flows), execute this Prisma script (or SQL query):
```sql
-- 1. Get User ID
SELECT id FROM User WHERE email = 'user_test@healthos.app'; -- Let's assume ID is 'USR123'

-- 2. Clear Daily logs
DELETE FROM DailyLog WHERE userId = 'USR123';

-- 3. Clear Behavior state
DELETE FROM UserBehaviorState WHERE userId = 'USR123';

-- 4. Reset UserState back to day 1, incomplete assessment, and clear profile
UPDATE UserState SET currentDay = 1, completedAssessment = false, profileType = NULL, programId = 'circadian-reset' WHERE userId = 'USR123';
```

---

## 3. Investigating Runtime Issues

### Detecting Duplicate Submission Blocks
If a user complains of seeing a "Duplicate submission warning" overlay:
1. Search database for existing logs matching the user and day index:
   ```sql
   SELECT id, day, createdAt FROM DailyLog WHERE userId = 'USR123' AND day = 1;
   ```
2. If multiple logs exist, remove the duplicate and keep the earliest entry:
   ```sql
   DELETE FROM DailyLog WHERE id = 'DUPLICATED_LOG_ID';
   ```

### Check API Health & Readiness
Perform direct health queries to confirm services are running:
- **Public Health Probe**:
  ```bash
  curl -i http://localhost:4001/health
  ```
- **Readiness Probe**:
  ```bash
  curl -i http://localhost:4001/ready
  ```

### Check Protected Observability Metrics
To fetch prometheus performance stats, you must pass the secret header:
```bash
curl -H "x-internal-secret: dev_secret" http://localhost:4001/metrics
```

---

## 4. Launch Automation Commands
Operators can run these commands from the monorepo root to build and verify candidates:

* **Compile Workspace**:
  ```bash
  pnpm rc:build
  ```
* **Run API Smoke Checks**:
  ```bash
  pnpm rc:smoke
  ```
* **Launch Staging Health Checks**:
  ```bash
  pnpm rc:verify
  ```
* **Inject Deterministic Test Seed Data**:
  ```bash
  pnpm rc:seed
  ```

---

## 5. Rollback Procedures

### App Rollback
1. **Frontend (Vercel)**: Select the last successful production deployment in the dashboard and click **Promote to Production**.
2. **Backend (API)**: Re-route API traffic (load balancer or hosting panel) back to the target container running the stable build image.

### Database Rollback
If a database rollback is required and schema modifications must be undone:
```bash
# Force prisma to synchronize database structure to current schema.prisma configuration
npx prisma db push --force-reset
```
*Caution: `--force-reset` will delete database content. For production data preservation, restore the pre-deployment MySQL physical snapshot backup.*
