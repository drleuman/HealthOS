# HealthOS Closed Beta — Launch Plan

This document outlines the operational plan for launching the HealthOS Closed Beta release. The goal is to conduct a controlled launch with a small allowlisted cohort of users to validate product mechanics, system performance, and user retention.

---

## 1. Launch Objectives
- Validate core user progression mechanics (Onboarding -> Daily Circadian Dashboard -> Daily Log Submission).
- Harden the runtime environment against unexpected error states (e.g. duplicate logs, system network drops).
- Confirm the effectiveness of server-side data sanitization to prevent sensitive medical or personal notes from leaking into third-party telemetry (PostHog, Sentry).
- Assess operational metrics (Uptime, API latency, cohort engagement) to prepare for a larger scale Phase 2 rollout.

---

## 2. Cohort Details
- **Cohort Size**: 10–20 invite-only participants.
- **Target Audience**: Early-stage health coaching clients and clinical trial participants seeking circadian rhythm alignment under supervision.
- **Invite Strategy**: Manual email invite delivery with direct WooCommerce login links.

---

## 3. Entry & Exit Criteria

### Beta Entry Criteria
- All release candidate verification (`pnpm rc:verify`) and smoke tests (`pnpm rc:smoke`) passing.
- Database schemas applied and matched between MySQL staging and development.
- Environment variables configured with strong random secrets (JWTs, signature checks).
- Sentry and PostHog listeners initialized with staging environment keys.
- Closed Beta Allowlist populated with target cohort emails.

### Beta Exit Criteria
- **Stability**: Uptime $\ge 99.5\%$ with no unhandled 500 Server Errors in core actions.
- **Performance**: P95 API Latency for `/user/today` and `/user/day-log` endpoints remains below 500ms under standard usage.
- **Security & Privacy**: Zero sensitive health records, symptoms lists, or clinical comments leaked to external analytics channels.
- **Activation Funnel**: $\ge 80\%$ of allowlisted cohort successfully complete onboarding and record daily logs for a minimum of 7 consecutive days.

---

## 4. Launch Timeline

| Phase | Milestone | Responsible | Key Action |
| :--- | :--- | :--- | :--- |
| **Day -2** | Pre-Launch Staging Dry Run | Dev / Ops | Build check (`pnpm rc:build`), test execution (`pnpm rc:smoke`), and verification check (`pnpm rc:verify`). |
| **Day -1** | Target Environment Setup | Ops | Apply schema migration and populate production/staging database allowlist. |
| **Day 0** | Launch Day | Ops / Clinical | Send invite emails to the first cohort. Monitor backend `/metrics` and PostHog activation event funnels. |
| **Day 1-7**| Cohort Monitoring Period | Operator | Perform daily health check reviews, telemetry verification, and database checks. |
| **Day 8** | Retrospective & Assessment | Product / Clinical | Review activation funnel targets. |

---

## 5. Operator Responsibilities
- **Continuous Monitoring**: Daily inspect Sentry dashboard for 500 Server Errors. Check `/metrics` uptime.
- **Allowlist Management**: Add or remove user emails manually on staging/production environments following operational protocols.
- **Database Maintenance**: Manage backups and monitor storage/query execution performance.
- **User Support**: Triage login blocks and manual cohort resets.

---

## 6. Support & Escalation Procedures
1. **Tier 1 (Blocked Access)**: User reports unable to log in. Operator checks `BETA_ALLOWLIST` and verifies if the email is allowlisted.
2. **Tier 2 (Bug / Visual Anomalies)**: User experiences visual loop crash or stuck loading state. Operator checks Sentry/PostHog and gets the specific `request_id`.
3. **Tier 3 (Clinical / Data Mismatch)**: User complains today schedule doesn't sync. Escalate to Engineering to review the program state synchronization logs.

---

## 7. Rollback Criteria
An immediate rollback to the previous stable release version must be triggered if any of the following occur:
- **Core Loop Break**: Users cannot submit their daily circadian log, resulting in continuous crashes or infinite loops.
- **Security / Privacy Breach**: Sensitive health information (e.g. user comments, symptoms lists) is detected in external analytics (PostHog / Sentry logs).
- **Service Degradation**: Database connection drops causing extended API downtime ($> 15$ continuous minutes).

---

## 8. Privacy & Data Integrity
- Free-text fields, assessment inputs, circadian sleep patterns, symptoms list, or clinical evaluations must remain encrypted or localized within the primary database.
- Any event sent via `/events` to external networks must be stripped of patient data.
- Operators must never log in as a user (impersonate) to read private circadian journals or feedback records.
