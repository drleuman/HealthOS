# Event Tracking System - Complete Guide

## Overview

Behavioral event tracking system that converts user actions into actionable insights.

## Philosophy

> An event describes an "attempt to change a habit", not a UI interaction.

This system tracks **behavioral events**, not clicks. Every event represents a meaningful step in the user's habit formation journey.

---

## Official Event Taxonomy

### A — Inicio del proceso
```
onboarding_started       # User begins onboarding
onboarding_completed     # User finishes assessment
profile_generated        # System assigns program
```

### B — Ejecución diaria (núcleo del producto)
```
day_viewed               # User opens today's tasks
day_started              # User begins daily action
action_marked_done       # User completes action
action_marked_failed     # User marks action as failed
day_completed            # Full day completed
streak_extended          # Streak increases
streak_broken            # Streak resets to 0
```

**👉 These are the most valuable business events**

### C — Fricción (oro puro)
```
lesson_replayed          # User re-reads instructions
help_opened              # User requests help
skipped_day              # User skips a day
auto_simplified          # System simplifies task
return_after_drop        # User returns after 48h+ absence
```

**This tells you WHY users abandon**

### D — Herramientas (Mithohacks)
```
tool_recommended         # System recommends a tool
tool_opened_store        # User clicks to Mithohacks
tool_purchased           # User completes purchase
tool_guide_opened        # User opens tool guide
```

**This is where monetization happens**

### E — Retención
```
week_completed           # User completes 7 days
program_completed        # User finishes full program
second_program_started   # User starts another program
```

**This is where LTV lives**

---

## Standard Event Schema

Every event MUST follow this structure:

```typescript
{
  "event": "day_completed",           // Required: event name
  "userId": "uuid",                   // Optional: user identifier
  "sessionId": "uuid",                // Optional: session identifier
  "timestamp": "2026-02-13T20:00:00Z", // Auto-generated if not provided
  "context": {                        // Optional: event-specific data
    "program": "circadian_reset_14",
    "day": 3,
    "streak": 2,
    "profile": "circadian_dysregulation"
  },
  "meta": {                           // Optional: platform metadata
    "platform": "web",
    "version": "1.0.0"
  }
}
```

### Why This Structure?

- **Consistent**: All events have the same shape
- **Queryable**: Easy to filter by context fields
- **Cohort-ready**: Can group by program, day, profile
- **Future-proof**: Meta allows platform-specific data

---

## API Endpoints

### POST /events
Track a single event (fire-and-forget):

```bash
curl -X POST http://localhost:4000/events \
  -H "Content-Type: application/json" \
  -d '{
    "event": "day_completed",
    "userId": "user-123",
    "sessionId": "session-456",
    "context": {
      "program": "circadian_reset_14",
      "day": 3,
      "streak": 2
    },
    "meta": {
      "platform": "web",
      "version": "1.0.0"
    }
  }'
```

Response:
```json
{
  "ok": true
}
```

### POST /events/batch
Track multiple events at once:

```bash
curl -X POST http://localhost:4000/events/batch \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "event": "day_started",
        "userId": "user-123",
        "context": { "day": 3 }
      },
      {
        "event": "action_marked_done",
        "userId": "user-123",
        "context": { "day": 3, "action": "get_light_10min" }
      }
    ]
  }'
```

### GET /events/analytics/activation
Get activation rate (users who completed day 2):

```bash
curl http://localhost:4000/events/analytics/activation
```

Response:
```json
{
  "total": 100,
  "activated": 45,
  "rate": 45.0
}
```

### GET /events/analytics/dropoff?day=3
Get drop-off at specific day:

```bash
curl http://localhost:4000/events/analytics/dropoff?day=3
```

Response:
```json
{
  "usersAtPrevDay": 50,
  "usersAtDay": 35,
  "dropOff": 15
}
```

### GET /events/analytics/conversion
Get tool conversion rate:

```bash
curl http://localhost:4000/events/analytics/conversion
```

Response:
```json
{
  "opened": 100,
  "purchased": 12,
  "rate": 12.0
}
```

---

## Usage in Code

### Track from Service

```typescript
import { TrackingService } from './tracking.service';

@Injectable()
export class HealthService {
  constructor(private tracking: TrackingService) {}

  async completeDay(userId: string, day: number) {
    // Business logic
    await this.prisma.dailyLog.create({...});

    // Track event (non-blocking)
    await this.tracking.track({
      event: 'day_completed',
      userId,
      context: {
        program: user.programId,
        day,
        streak: user.streak + 1,
      },
      meta: {
        platform: 'api',
        version: '1.0.0',
      },
    });

    return { ok: true };
  }
}
```

### Track from Controller

```typescript
@Post('assessment')
async submitAssessment(@Body() data: any, @Req() req: any) {
  const result = await this.healthService.processAssessment(data);

  // Track completion
  await this.tracking.track({
    event: 'onboarding_completed',
    userId: req.user.id,
    sessionId: req.headers['x-session-id'],
    context: {
      profile: result.profileType,
      program: result.programId,
    },
  });

  return result;
}
```

### Track from Webhook

```typescript
@Post('webhooks/mithohacks/order')
async handleOrder(@Body() order: any) {
  await this.webhooksService.processOrder(order);

  // Track purchase
  await this.tracking.track({
    event: 'tool_purchased',
    userId: order.userId,
    context: {
      product: order.items[0].product_slug,
      price: order.total,
    },
  });

  return { ok: true };
}
```

---

## Database Schema

```prisma
model Event {
  id        String   @id @default(uuid())
  event     String   // Event name
  userId    String?  // Optional user ID
  sessionId String?  // Optional session ID
  timestamp DateTime @default(now())
  context   Json?    // Event-specific context
  meta      Json?    // Platform metadata
  createdAt DateTime @default(now())
  
  @@index([event, timestamp])
  @@index([userId, event])
  @@index([sessionId])
}
```

---

## Analytics Queries

### Activation Rate
```sql
-- Users who completed day 2
SELECT COUNT(DISTINCT "userId")
FROM "Event"
WHERE event = 'day_completed'
AND context->>'day' = '2';
```

### Drop-off at Day 3
```sql
-- Users at day 2
WITH day2 AS (
  SELECT DISTINCT "userId"
  FROM "Event"
  WHERE event = 'day_completed'
  AND context->>'day' = '2'
),
-- Users at day 4
day4 AS (
  SELECT DISTINCT "userId"
  FROM "Event"
  WHERE event = 'day_completed'
  AND context->>'day' = '4'
)
SELECT 
  (SELECT COUNT(*) FROM day2) AS users_at_day2,
  (SELECT COUNT(*) FROM day4) AS users_at_day4,
  (SELECT COUNT(*) FROM day2) - (SELECT COUNT(*) FROM day4) AS dropoff;
```

### Tool Conversion
```sql
-- Conversion rate: tool_opened_store → tool_purchased
SELECT 
  (SELECT COUNT(*) FROM "Event" WHERE event = 'tool_opened_store') AS opened,
  (SELECT COUNT(*) FROM "Event" WHERE event = 'tool_purchased') AS purchased,
  (SELECT COUNT(*)::float FROM "Event" WHERE event = 'tool_purchased') / 
  NULLIF((SELECT COUNT(*) FROM "Event" WHERE event = 'tool_opened_store'), 0) * 100 AS rate;
```

### Cohort Analysis
```sql
-- Users by program and completion rate
SELECT 
  context->>'program' AS program,
  COUNT(DISTINCT "userId") AS users,
  COUNT(DISTINCT CASE WHEN event = 'program_completed' THEN "userId" END) AS completed,
  (COUNT(DISTINCT CASE WHEN event = 'program_completed' THEN "userId" END)::float / 
   COUNT(DISTINCT "userId") * 100) AS completion_rate
FROM "Event"
WHERE context->>'program' IS NOT NULL
GROUP BY context->>'program';
```

---

## Implementation Checklist

### ✅ Phase 1: Infrastructure (Complete)
- [x] Event model in Prisma schema
- [x] TrackingService with standard schema
- [x] POST /events endpoint
- [x] POST /events/batch endpoint
- [x] Analytics endpoints
- [x] Non-blocking tracking (fire-and-forget)

### 🔄 Phase 2: Instrumentation (Next)
Instrument only 6 core events first:

1. **onboarding_completed** - In `POST /assessment`
2. **day_started** - In `GET /user/today`
3. **action_marked_done** - In `POST /user/day-log`
4. **day_completed** - In `POST /user/day-log`
5. **tool_opened_store** - In `GET /auth/sso-token`
6. **tool_purchased** - In `POST /webhooks/mithohacks/order`

### 📊 Phase 3: Observation (Week 1)
- [ ] Deploy to production
- [ ] Collect data for 7 days
- [ ] DO NOT change product
- [ ] DO NOT optimize UX
- [ ] DO NOT add features
- [ ] **ONLY OBSERVE**

### 🔍 Phase 4: Analysis (Week 2)
- [ ] Run activation queries
- [ ] Identify drop-off points
- [ ] Analyze tool conversion
- [ ] Create cohort reports
- [ ] Document findings

---

## Best Practices

### DO
- ✅ Track behavioral events (habit attempts)
- ✅ Use consistent event names
- ✅ Include context (program, day, streak)
- ✅ Make tracking non-blocking
- ✅ Observe before optimizing

### DON'T
- ❌ Track UI clicks (use analytics tools for that)
- ❌ Change event names after launch
- ❌ Block app flow on tracking
- ❌ Optimize before collecting data
- ❌ Track everything (start with 6 events)

---

## Migration

### Create Event Table

```bash
# Run migration
cd services/api
npx prisma migrate dev --name add_event_tracking

# Or manually create table
psql -U healthos healthos <<EOF
CREATE TABLE "Event" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "event" TEXT NOT NULL,
  "userId" TEXT,
  "sessionId" TEXT,
  "timestamp" TIMESTAMP NOT NULL DEFAULT NOW(),
  "context" JSONB,
  "meta" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "Event_event_timestamp_idx" ON "Event"("event", "timestamp");
CREATE INDEX "Event_userId_event_idx" ON "Event"("userId", "event");
CREATE INDEX "Event_sessionId_idx" ON "Event"("sessionId");
EOF
```

### Generate Prisma Client

```bash
npx prisma generate
```

---

## Testing

### Test Event Tracking

```bash
# Track test event
curl -X POST http://localhost:4000/events \
  -H "Content-Type: application/json" \
  -d '{
    "event": "test_event",
    "userId": "test-user",
    "context": { "test": true }
  }'

# Verify in database
psql -U healthos healthos -c "SELECT * FROM \"Event\" ORDER BY timestamp DESC LIMIT 5;"
```

### Test Analytics

```bash
# Create test data
for i in {1..10}; do
  curl -s -X POST http://localhost:4000/events \
    -H "Content-Type: application/json" \
    -d "{\"event\":\"day_completed\",\"userId\":\"user-$i\",\"context\":{\"day\":2}}"
done

# Check activation rate
curl http://localhost:4000/events/analytics/activation
```

---

## Monitoring

### Track Event Volume

```sql
-- Events per hour
SELECT 
  DATE_TRUNC('hour', timestamp) AS hour,
  COUNT(*) AS events
FROM "Event"
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

### Track Event Types

```sql
-- Most common events
SELECT 
  event,
  COUNT(*) AS count
FROM "Event"
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY event
ORDER BY count DESC;
```

---

## Summary

Event tracking system is **ready but not instrumented** yet. This allows you to:
1. Test the infrastructure
2. Verify analytics queries work
3. Instrument gradually (6 events first)
4. Observe real behavior before optimizing

**Next step**: Instrument the 6 core events in the API.

**After that**: Deploy, observe for 1 week, then analyze.

**Remember**: The first real data always breaks your assumptions. Don't optimize until you have it.
