# HealthOS Closed Beta — Metrics & Analytics Documentation

This documentation defines the minimum activation funnel telemetry, event tracking contexts, privacy sanitization definitions, and database queries for tracking the HealthOS Closed Beta launch.

---

## 1. Minimal Activation Funnel Events

Below is the list of core events that construct the launch analytics funnel:

### A. `login_success`
- **Emit Trigger**: User successfully enters magic link/verification token and is authenticated.
- **Location**: Backend (`AuthController.login` / `AuthController.ssoLogin`).
- **Safe Context**: `userId`, `sessionId`, `role`, `plan`, `platform`.
- **PROHIBITED Context**: Plain text credentials, cookie details.
- **MySQL Query**:
  ```sql
  SELECT count(*) FROM Event WHERE event = 'login_success';
  ```
- **Beta Success Target**: 100% of allowlisted cohort members execute at least one successful login.

### B. `onboarding_started`
- **Emit Trigger**: User accesses the onboarding survey questionnaire for the first time.
- **Location**: Frontend (`OnboardingView.tsx` initialization).
- **Safe Context**: `userId`, `sessionId`, `platform`, `version`.
- **PROHIBITED Context**: Clinical symptoms, sleep goals, bedtime hours.
- **MySQL Query**:
  ```sql
  SELECT count(distinct userId) FROM Event WHERE event = 'onboarding_started';
  ```
- **Beta Success Target**: $\ge 90\%$ of logged-in cohort members start onboarding.

### C. `onboarding_completed`
- **Emit Trigger**: User completes and submits the onboarding survey.
- **Location**: Backend (`BehaviorController.submitAssessment`).
- **Safe Context**: `userId`, `sessionId`, `profileType`, `programId`.
- **PROHIBITED Context**: Survey answers (e.g. bedtime, diner_time, caffeine_time, symptoms lists).
- **MySQL Query**:
  ```sql
  SELECT count(distinct userId) FROM Event WHERE event = 'onboarding_completed';
  ```
- **Beta Success Target**: $\ge 80\%$ completion rate (ratio of `onboarding_completed` / `onboarding_started`).

### D. `today_opened`
- **Emit Trigger**: User loads the main circadian rhythm dashboard `/app/today`.
- **Location**: Frontend (`TodayView.tsx` mount) or Backend (`BehaviorController.getToday`).
- **Safe Context**: `userId`, `sessionId`, `dayIndex`, `streak`, `uiMode`.
- **PROHIBITED Context**: Circadian actions checklist text, medical logs.
- **MySQL Query**:
  ```sql
  SELECT count(*) FROM Event WHERE event = 'today_opened';
  ```
- **Beta Success Target**: Users open the today dashboard an average of $\ge 5$ times in their first week.

### E. `day_log_submitted`
- **Emit Trigger**: User completes their circadian log for the day and posts the results.
- **Location**: Backend (`BehaviorController.logDay`).
- **Safe Context**: `userId`, `sessionId`, `dayIndex`, `action_completed`.
- **PROHIBITED Context**: Self-report text comments or feedback details.
- **MySQL Query**:
  ```sql
  SELECT count(*) FROM Event WHERE event = 'day_log_submitted';
  ```
- **Beta Success Target**: $\ge 60\%$ of users submit at least 5 logs in their first 7 days.

### F. `duplicate_submission`
- **Emit Trigger**: User tries to log circadian data for a day that already has an existing log.
- **Location**: Backend (`BehaviorController.logDay` error branch).
- **Safe Context**: `userId`, `sessionId`, `dayIndex`, `duplicateDay`.
- **PROHIBITED Context**: Any payload details or input parameters.
- **MySQL Query**:
  ```sql
  SELECT count(*) FROM Event WHERE event = 'duplicate_submission';
  ```
- **Beta Success Target**: Monitored for error rates; should decrease with better client caching.

### G. `trial_expired_seen`
- **Emit Trigger**: An expired trial user attempts to view a gated view and is redirected to the paywall.
- **Location**: Frontend (`TodayView.tsx` or `TodayViewWrapper.tsx` paywall branch).
- **Safe Context**: `userId`, `sessionId`, `plan`, `expiredAt`.
- **PROHIBITED Context**: Payment credentials, personal clinical metrics.
- **MySQL Query**:
  ```sql
  SELECT count(distinct userId) FROM Event WHERE event = 'trial_expired_seen';
  ```
- **Beta Success Target**: Triggers activation for trial conversion reviews.

### H. `admin_overview_opened`
- **Emit Trigger**: Administrative/Clinician user loads the admin monitoring panel `/admin/overview`.
- **Location**: Frontend (`AdminOverview.tsx` mount) or Backend (`AdminController.getOverview`).
- **Safe Context**: `userId`, `sessionId`, `role` (must be admin).
- **PROHIBITED Context**: Cohort names, patient emails, health reports.
- **MySQL Query**:
  ```sql
  SELECT count(*) FROM Event WHERE event = 'admin_overview_opened';
  ```
- **Beta Success Target**: Restricted to authorized clinical administrative emails.

---

## 2. Privacy Gating Rules
The backend `TrackingService` automatically enforces safety rules when processing events:
1. **Key Strip-Out list**: The following fields are completely removed from `context` and `meta` before saving:
   - `feedback`, `comment`, `message`, `note`, `input`, `answers`
   - `symptoms`, `sleep_issue_type`, `primary_goal`, `self_report_effect`
   - `caffeine_time`, `bedtime`, `dinner_time`
   - Any key matching or containing `clinical`, `medical`, or `description`
2. **Text Field Truncation**: Any text string exceeding 100 characters in event parameters is discarded.
