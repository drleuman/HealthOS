# Subscription Control Guide

## Overview

Simple subscription enforcement system that blocks free users from accessing protected content.

## How It Works

### Plan Hierarchy
```
free (0) < member (1) < premium (2)
```

- **free**: No access to protected features
- **member**: Access to basic program features
- **premium**: Access to all features

### User Plan Storage

Plan is stored in the `User` model:
```prisma
model User {
  id    String @id @default(uuid())
  email String @unique
  plan  String @default("free")  // 'free', 'member', 'premium'
}
```

## Usage

### Option 1: Apply to Specific Endpoints (Recommended)

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SubscriptionGuard } from './subscription.guard';
import { RequiredPlan } from './public.decorator';

@Controller('user')
@UseGuards(JwtAuthGuard, SubscriptionGuard)  // Apply both guards
export class HealthController {
  
  // Requires 'member' plan (default)
  @Get('today')
  async getToday() {
    return { day: 1, tasks: [...] };
  }

  // Requires 'premium' plan
  @Get('advanced-analytics')
  @RequiredPlan('premium')
  async getAnalytics() {
    return { stats: {...} };
  }

  // Allow free users (explicitly)
  @Get('preview')
  @RequiredPlan('free')
  async getPreview() {
    return { preview: {...} };
  }
}
```

### Option 2: Apply Globally (More Restrictive)

In `app.module.ts`:
```typescript
providers: [
  // ... other providers
  {
    provide: APP_GUARD,
    useClass: JwtAuthGuard,  // First: authenticate
  },
  {
    provide: APP_GUARD,
    useClass: SubscriptionGuard,  // Second: check subscription
  },
]
```

Then mark public endpoints:
```typescript
@Public()
@Get('login')
async login() { ... }
```

## Setting User Plan

### Via Webhook (Recommended)

When a user purchases, update their plan:

```typescript
// In webhooks.service.ts
async processOrder(order: any) {
  // Process purchase
  await this.prisma.purchase.create({...});

  // Upgrade user plan
  await this.prisma.user.update({
    where: { email: order.email },
    data: { plan: 'member' },  // or 'premium'
  });
}
```

### Via Admin API (Manual)

```bash
# Update user plan
curl -X PATCH http://localhost:4000/admin/users/:userId/plan \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"plan":"member"}'
```

### Via Database (Emergency)

```sql
-- Upgrade user to member
UPDATE "User" SET plan = 'member' WHERE email = 'user@example.com';

-- Downgrade to free
UPDATE "User" SET plan = 'free' WHERE email = 'user@example.com';
```

## Error Responses

### No Subscription
```json
{
  "statusCode": 403,
  "message": "Active member subscription required. Current plan: free",
  "error": "Forbidden"
}
```

### Insufficient Plan
```json
{
  "statusCode": 403,
  "message": "Active premium subscription required. Current plan: member",
  "error": "Forbidden"
}
```

## Testing

### Test Free User (Blocked)
```bash
# Create free user
curl -X POST http://localhost:4000/auth/login \
  -d '{"email":"free@example.com"}'

# Try to access protected endpoint
curl http://localhost:4000/user/today \
  -H "X-User-Email: free@example.com"

# Response: 403 Forbidden
```

### Test Member User (Allowed)
```bash
# Upgrade user to member
psql -c "UPDATE \"User\" SET plan = 'member' WHERE email = 'free@example.com'"

# Try again
curl http://localhost:4000/user/today \
  -H "X-User-Email: free@example.com"

# Response: 200 OK
```

## Integration with WordPress

### Sync Plan from WordPress

When user logs in via SSO, sync their plan:

```typescript
// In auth.service.ts
async generateSsoToken(email: string) {
  // Fetch user from WordPress
  const wpUser = await this.fetchWordPressUser(email);
  
  // Sync plan
  await this.prisma.user.upsert({
    where: { email },
    update: { plan: wpUser.subscription_status === 'active' ? 'member' : 'free' },
    create: { email, plan: wpUser.subscription_status === 'active' ? 'member' : 'free' },
  });

  // Generate token
  return this.jwtService.sign({ email });
}
```

### Webhook from WordPress

```typescript
// POST /webhooks/wordpress/subscription
async handleSubscriptionChange(data: any) {
  await this.prisma.user.update({
    where: { email: data.user_email },
    data: { 
      plan: data.status === 'active' ? 'member' : 'free' 
    },
  });
}
```

## Current Implementation Status

### ✅ Implemented
- SubscriptionGuard created
- Plan hierarchy defined
- RequiredPlan decorator
- Error messages

### ⚠️ Not Yet Applied
- Guard is NOT applied globally
- All endpoints currently accessible
- No WordPress sync

### 🔄 Next Steps

1. **Decide enforcement strategy**:
   - Option A: Apply to specific endpoints (safer)
   - Option B: Apply globally (more secure)

2. **Integrate with WordPress**:
   - Sync plan on SSO login
   - Handle subscription webhooks

3. **Test with real users**:
   - Create test accounts with different plans
   - Verify access control works

## Recommended Rollout

### Phase 1: Soft Launch (Current)
- Guard exists but not enforced
- All users can access everything
- Monitor for issues

### Phase 2: Selective Enforcement
- Apply to premium features only
- Keep core features open
- Gather feedback

### Phase 3: Full Enforcement
- Apply to all protected endpoints
- Only free preview available without subscription
- Monitor conversion rates

## FAQ

### Q: What happens to existing users?
A: All existing users have `plan = 'free'` by default. You need to manually upgrade active subscribers.

### Q: Can users downgrade?
A: Yes, just update their plan to 'free'. Their progress is preserved.

### Q: What if WordPress is down?
A: Guard only checks local database. If WordPress is down, existing users keep their plan until next sync.

### Q: How to handle trial periods?
A: Add a `trialEndsAt` field to User model and check in guard:
```typescript
if (user.trialEndsAt && user.trialEndsAt > new Date()) {
  return true;  // Trial active
}
```

---

## Summary

Subscription control is ready but **NOT enforced** yet. This allows you to:
1. Test the system safely
2. Migrate existing users
3. Set up WordPress integration
4. Roll out gradually

**To enforce**: Apply `SubscriptionGuard` to controllers or globally in `app.module.ts`.
