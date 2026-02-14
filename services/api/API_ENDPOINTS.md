# API Endpoints Reference

## Authentication Endpoints

### POST /auth/login
**Purpose**: Issue JWT access token  
**Auth**: None (public)  
**Payload**:
```json
{
  "email": "user@example.com"
}
```
**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "plan": "member"
  }
}
```

### GET /auth/sso-token
**Purpose**: Generate SSO token for external tools  
**Auth**: None (public)  
**Query**: `?email=user@example.com&tool=notion`  
**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "redirect_url": "https://mithohacks.com/sso-login?token=..."
}
```

### GET /auth/debug-token
**Purpose**: Debug token verification (REMOVE IN PRODUCTION)  
**Auth**: None  
**Query**: `?token=...`

---

## User Endpoints (Protected)

### POST /assessment
**Purpose**: Submit user assessment and get program assignment  
**Auth**: JWT or X-User-Email  
**Payload**:
```json
{
  "primary_goal": "sleep",
  "sleep_issue_type": ["trouble_falling_asleep"],
  "low_energy_window": "afternoon",
  "bedtime": "23:00",
  "caffeine_time": "08:00",
  "dinner_time": "20:00",
  "symptoms": ["fatigue", "brain_fog"],
  "constraints": ["no_supplements"]
}
```
**Response**:
```json
{
  "profile_type": "circadian_misaligned",
  "program_id": "circadian_reset_14",
  "starting_day": 1,
  "daily_time_minutes": 15,
  "priority_actions": ["get_light_10min", "early_dinner"]
}
```

### GET /user/today
**Purpose**: Get today's tasks and progress  
**Auth**: JWT or X-User-Email  
**Response**:
```json
{
  "day": 1,
  "program_id": "circadian_reset_14",
  "tasks": ["get_light_10min", "simple_meal_today", "breathing_3min"],
  "progress_week": 0,
  "community_group": "circadian_reset_14_day_1",
  "recommendation": null,
  "banners": [
    {
      "id": "uuid",
      "type": "weekly_summary",
      "message": "Resumen semanal: 5/7 días completados (71%)",
      "data": { "completedDays": 5, "totalDays": 7 }
    }
  ]
}
```

### GET /user/route
**Purpose**: Get user's program route/progress  
**Auth**: JWT or X-User-Email  
**Response**:
```json
{
  "program_id": "circadian_reset_14",
  "current_day": 1,
  "duration_days": 14,
  "days": [
    { "day": 1, "title": "Luz de mañana", "status": "current" },
    { "day": 2, "title": "Cena temprana", "status": "locked" }
  ]
}
```

### POST /user/day-log
**Purpose**: Log daily activity completion  
**Auth**: JWT or X-User-Email  
**Payload**:
```json
{
  "day": 1,
  "action_completed": true,
  "self_report_effect": "better"
}
```
**Response**:
```json
{
  "ok": true,
  "streak": 1,
  "currentDay": 2
}
```

---

## Webhook Endpoints

### POST /webhooks/mithohacks/order
**Purpose**: Process order fulfillment from external store  
**Auth**: HMAC-SHA256 signature (x-mh-signature header)  
**Payload**:
```json
{
  "order_id": "ORDER-123",
  "email": "user@example.com",
  "items": [
    { "product_slug": "blue_light_glasses", "qty": 1 }
  ]
}
```
**Response**:
```json
{
  "ok": true,
  "status": "processed"
}
```

---

## Job Management Endpoints (Protected)

### POST /jobs/trigger/inactivity-check
**Purpose**: Manually trigger inactivity check job  
**Auth**: JWT (should add admin role check)  
**Response**:
```json
{
  "ok": true,
  "processed": 2
}
```

### POST /jobs/trigger/weekly-summary
**Purpose**: Manually trigger weekly summary job  
**Auth**: JWT (should add admin role check)  
**Response**:
```json
{
  "ok": true,
  "processed": 5
}
```

### GET /jobs/results/:userId
**Purpose**: Get job results for user  
**Auth**: JWT  
**Response**:
```json
[
  {
    "id": "uuid",
    "jobType": "weekly_summary",
    "status": "success",
    "message": "Resumen semanal: 5/7 días completados (71%)",
    "data": { "completedDays": 5 },
    "createdAt": "2026-02-13T20:00:00.000Z"
  }
]
```

### POST /jobs/results/:id/dismiss
**Purpose**: Dismiss a job result banner  
**Auth**: JWT  
**Response**:
```json
{
  "ok": true
}
```

---

## Health/Monitoring Endpoints (Public)

### GET /health
**Purpose**: Basic health check  
**Auth**: None (skip throttle)  
**Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-02-13T20:00:00.000Z",
  "uptime": 3600.5,
  "memory": {
    "rss": 88829952,
    "heapTotal": 19914752,
    "heapUsed": 17257752
  }
}
```

### GET /ready
**Purpose**: Readiness probe (checks DB)  
**Auth**: None (skip throttle)  
**Response**:
```json
{
  "status": "ready",
  "database": "connected",
  "timestamp": "2026-02-13T20:00:00.000Z"
}
```

### GET /metrics
**Purpose**: Prometheus-style metrics  
**Auth**: None (skip throttle)  
**Response**:
```json
{
  "uptime_seconds": 3600.5,
  "memory_heap_used_bytes": 17257752,
  "memory_heap_total_bytes": 19914752,
  "memory_rss_bytes": 88829952,
  "memory_external_bytes": 2630732,
  "timestamp": "2026-02-13T20:00:00.000Z"
}
```
