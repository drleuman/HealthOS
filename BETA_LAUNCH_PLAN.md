# Beta Launch Plan (HealthOS)

**Objective**: Verify the "Therapeutic Loop" with real users (n=5) for 7 days.
**Constraint**: No code changes during observation.

## 1. Recruitment (Day 0)
*   **Target**: 5 users (Friends/Family or Waiting List).
    *   2 iOS users.
    *   2 Android users.
    *   1 Desktop user.
*   **Onboarding**: Send them the production URL directly. Do not hand-hold.

## 2. Execution (Days 1–7)
*   **Do nothing**. Let the system run.
*   **Daily Check**: Run `scripts/smoke-test.sh` (or manual QA) to ensure uptime.
*   **Monitor**: Check logs for exceptions, but fix only critical crashes.

## 3. Metrics & KPIs
We will measure success by these 3 metrics (using SQL queries on `Event` table):

### KPI 1: Activation (Day 2 Completion)
*   **Goal**: > 60%
*   **Query**:
    ```sql
    SELECT count(DISTINCT "userId") FROM "Event" 
    WHERE event = 'day_completed' AND "context"->>'day' = '2';
    ```

### KPI 2: Retention (Day 4 Return)
*   **Goal**: > 40%
*   **Query**:
    ```sql
    SELECT count(DISTINCT "userId") FROM "Event" 
    WHERE event = 'day_viewed' AND "context"->>'day' = '4';
    ```

### KPI 3: Tool Curiosity (CTR)
*   **Goal**: > 20%
*   **Query**:
    ```sql
    SELECT count(*) FROM "Event" WHERE event = 'tool_opened_store';
    ```

## 4. Post-Mortem (Day 8)
*   Export all `Event` data.
*   Interview 2 users (one active, one dropped out).
*   Create "Iteration 2" feature list based on friction points.
