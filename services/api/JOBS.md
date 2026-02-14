# Jobs and Queues System

## Overview
The API now includes a background jobs system for automated tasks:
- **Inactivity Checker**: Reminds users who haven't been active in 48 hours
- **Weekly Summary**: Generates progress summaries every Monday
- **Banner System**: Displays job results on the `/user/today` endpoint

## Architecture

### Cron-Based (Default)
Uses `node-cron` for scheduling - no external dependencies required.

**Advantages:**
- Simple setup, no Redis needed
- Works in development and production
- Automatic startup with the API

**Limitations:**
- Single-process only (not suitable for horizontal scaling)
- Jobs run in the same process as the API

### BullMQ (Optional - Future)
For production environments requiring horizontal scaling:
```bash
# Install Redis and BullMQ
npm install bullmq ioredis
```

## Jobs

### 1. Inactivity Check
**Schedule**: Every 6 hours  
**Cron**: `0 */6 * * *`

Finds users with no activity in 48+ hours and creates a reminder banner.

**Example Banner:**
```json
{
  "id": "abc-123",
  "type": "inactivity_check",
  "message": "¡Te echamos de menos! Han pasado 48 horas desde tu última actividad.",
  "data": {
    "lastActive": "2026-02-11T10:00:00.000Z",
    "currentDay": 5,
    "streak": 3
  }
}
```

### 2. Weekly Summary
**Schedule**: Every Monday at 9 AM  
**Cron**: `0 9 * * 1`

Generates a progress summary for users active in the last 7 days.

**Example Banner:**
```json
{
  "id": "def-456",
  "type": "weekly_summary",
  "message": "Resumen semanal: 5/7 días completados (71%)",
  "data": {
    "completedDays": 5,
    "totalDays": 7,
    "completionRate": 71,
    "currentStreak": 3,
    "currentDay": 8
  }
}
```

## API Endpoints

### Manual Job Triggers (Testing)
```bash
# Trigger inactivity check
curl -X POST http://localhost:4000/jobs/trigger/inactivity-check

# Trigger weekly summary
curl -X POST http://localhost:4000/jobs/trigger/weekly-summary
```

### Get User Job Results
```bash
curl http://localhost:4000/jobs/results/{userId}
```

### Dismiss Banner
```bash
curl -X POST http://localhost:4000/jobs/results/{resultId}/dismiss
```

## Frontend Integration

### Display Banners on Today Screen

The `/user/today` endpoint now includes a `banners` array:

```typescript
interface TodayPayload {
  day: number;
  program_id: string;
  tasks: string[];
  progress_week: number;
  community_group: string;
  recommendation: string | null;
  banners?: Array<{
    id: string;
    type: string;
    message: string | null;
    data: any;
  }>;
}
```

**Example Implementation:**
```tsx
const today = await fetch('/user/today').then(r => r.json());

{today.banners?.map(banner => (
  <div key={banner.id} className="banner">
    <p>{banner.message}</p>
    <button onClick={() => dismissBanner(banner.id)}>
      Dismiss
    </button>
  </div>
))}
```

## Database Schema

### JobResult Model
```prisma
model JobResult {
  id        String   @id @default(uuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  jobType   String   // 'inactivity_check', 'weekly_summary'
  status    String   // 'success', 'error'
  message   String?
  data      Json?    // Job-specific data
  createdAt DateTime @default(now())
  
  @@index([userId, jobType])
}
```

## Testing

### Unit Tests
```bash
cd services/api
npm test jobs.service.spec.ts
```

### Manual Testing
```bash
# 1. Start the API
npm run dev

# 2. Trigger a job manually
curl -X POST http://localhost:4000/jobs/trigger/inactivity-check

# 3. Check the response
{
  "ok": true,
  "processed": 2
}

# 4. View banners on today endpoint
curl http://localhost:4000/user/today
```

## Monitoring

### Job Execution Logs
Jobs log their execution with structured logging:

```
[21:00:00.000] INFO: Running inactivity check job
[21:00:01.234] INFO: Checking inactive users
    count: 2
[21:00:01.567] INFO: Created inactivity reminder
    userId: "abc-123"
    email: "user@example.com"
[21:00:02.000] INFO: Inactivity check completed
    processed: 2
```

### Health Check
Jobs are automatically started when the API starts:
```
[21:00:00.000] INFO: Job scheduler initialized with 2 cron tasks
```

## Production Deployment

### Environment Variables
No additional environment variables required for cron-based jobs.

### Docker Deployment
Jobs run automatically in the same container as the API:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npx prisma generate
CMD ["node", "dist/main.js"]
```

### Horizontal Scaling (Future)
For multi-instance deployments, migrate to BullMQ:

1. Add Redis to docker-compose:
```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

2. Update job scheduler to use BullMQ
3. Run dedicated worker processes

## Customization

### Add New Jobs

1. **Create job method in JobsService:**
```typescript
async myCustomJob() {
  // Job logic here
  logger.info('Running custom job');
}
```

2. **Add to scheduler:**
```typescript
// In job-scheduler.service.ts
const customTask = cron.schedule('0 0 * * *', async () => {
  await this.jobsService.myCustomJob();
});
```

3. **Add manual trigger:**
```typescript
// In jobs.controller.ts
@Post('trigger/my-custom-job')
async triggerCustomJob() {
  return this.jobsService.myCustomJob();
}
```

## Troubleshooting

### Jobs Not Running
Check logs for scheduler initialization:
```
grep "Job scheduler initialized" api.log
```

### Database Errors
Jobs are resilient to database failures and will log errors:
```
[21:00:00.000] ERROR: Error checking inactive users
    error: { ... }
```

### Manual Execution
Use trigger endpoints to test jobs without waiting for cron:
```bash
curl -X POST http://localhost:4000/jobs/trigger/inactivity-check
```
