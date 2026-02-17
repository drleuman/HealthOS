# Frontend Integration Guide for Security Hardening

## Overview
The API now enforces **Signed Events** to prevent replay attacks and falsified data.
You must update your API client to include the following headers on all `POST /events` requests:

- `X-Event-Signature`: HMAC-SHA256 of the payload.
- `X-Event-Id`: Unique UUID for the event.
- `X-Timestamp`: Current timestamp (must be within +/- 5 mins of server time).

## Implementation Snippet

### 1. Install Dependencies
```bash
npm install crypto-js uuid
```

### 2. Update `TrackingService` (or equivalent)

```typescript
import { v4 as uuidv4 } from 'uuid';
import HmacSHA256 from 'crypto-js/hmac-sha256';

const SESSION_SECRET = process.env.NEXT_PUBLIC_HMAC_SECRET || 'healthos-production-grade-secret'; // Sync with API

export async function trackEvent(eventBy: any) {
    const eventId = uuidv4();
    const timestamp = Date.now().toString();
    
    // Canonical payload string: eventId + timestamp + eventName
    // Note: This must match the server-side reconstruction strategy.
    const payloadToSign = `${eventId}.${timestamp}.${eventBy.event}`;
    
    const signature = HmacSHA256(payloadToSign, SESSION_SECRET).toString();

    const response = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Event-Id': eventId,
            'X-Timestamp': timestamp,
            'X-Event-Signature': signature
        },
        body: JSON.stringify(eventBy)
    });
}
```

## Environment Variables
Ensure `.env.local` includes:
```bash
NEXT_PUBLIC_HMAC_SECRET=... # Must match API's HMAC_SESSION_SECRET
```
