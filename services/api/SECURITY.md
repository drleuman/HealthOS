# Security Hardening Guide

## Overview
Iteration 6 implements comprehensive security measures for production deployment.

## Implemented Security Features

### 1. Rate Limiting (IP + User-Based)
**Implementation**: `@nestjs/throttler` with custom guard

**Configuration**:
- **Limit**: 100 requests per minute
- **Tracking**: By IP address + userId (if authenticated)
- **Scope**: Global (all endpoints)

**Exceptions**:
- Health endpoints (`/health`, `/ready`, `/metrics`) skip throttling for monitoring

**Testing**:
```bash
# Test rate limiting
for i in {1..110}; do curl http://localhost:4000/user/today; done
# After 100 requests, you'll get: "Too many requests. Please try again later."
```

### 2. CORS (Strict Origin Checking)
**Implementation**: Custom CORS configuration in `main.ts`

**Features**:
- Validates origin against `APP_ORIGIN` environment variable
- Supports multiple origins (comma-separated)
- Logs blocked origins for security monitoring
- Allows credentials (cookies, auth headers)

**Configuration**:
```bash
# Single origin
APP_ORIGIN=https://app.healthos.com

# Multiple origins
APP_ORIGIN=https://app.healthos.com,https://staging.healthos.com
```

**Testing**:
```bash
# Allowed origin
curl -H "Origin: http://localhost:3000" http://localhost:4000/health

# Blocked origin
curl -H "Origin: https://evil.com" http://localhost:4000/health
# Logs: CORS blocked origin
```

### 3. Helmet (Security Headers)
**Implementation**: `helmet` middleware with custom configuration

**Headers Applied**:
- **Content-Security-Policy**: Restricts resource loading
- **HSTS**: Forces HTTPS (1 year, includeSubDomains, preload)
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-XSS-Protection**: Enables XSS filtering

**Configuration**:
```typescript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
})
```

### 4. Secrets Validation
**Implementation**: `SecretsValidator` service

**Validates at Startup**:
- **Required**: `DATABASE_URL`, `API_JWT_SECRET`
- **Recommended**: `WEBHOOK_SECRET`, `APP_ORIGIN`
- **Strength**: JWT secret minimum 32 characters
- **Format**: Database URL protocol validation

**Behavior**:
- **Errors**: Application fails to start
- **Warnings**: Logged but allows startup

**Testing**:
```bash
# Missing required secret
unset API_JWT_SECRET
npm start
# Error: Secrets validation failed: Missing required secret: API_JWT_SECRET

# Weak secret
API_JWT_SECRET=weak npm start
# Warning: API_JWT_SECRET should be at least 32 characters for production
```

### 5. Authentication Coverage Audit
**Implementation**: Security audit script

**Endpoint Classification**:

**🌐 Public Endpoints** (No auth required):
- `POST /auth/login` - Login endpoint
- `GET /auth/sso-token` - SSO token generation
- `GET /health` - Health check
- `GET /ready` - Readiness probe
- `GET /metrics` - Metrics

**🔒 Protected Endpoints** (JWT required):
- `POST /assessment` - User data submission
- `GET /user/today` - User-specific data
- `GET /user/route` - User-specific data
- `POST /user/day-log` - User data submission
- `POST /jobs/trigger/*` - Administrative actions
- `GET /jobs/results/:userId` - User-specific data
- `POST /jobs/results/:id/dismiss` - User action

**✍️ Signature Verified**:
- `POST /webhooks/mithohacks/order` - HMAC-SHA256 verification

**Run Audit**:
```bash
npx ts-node src/security-audit.ts
```

## Security Checklist

### ✅ Implemented
- [x] Rate limiting by IP + userId
- [x] CORS strict to APP_ORIGIN
- [x] Helmet + secure headers
- [x] Secrets validation at startup
- [x] JWT authentication on user endpoints
- [x] Webhook signature verification
- [x] Request ID tracing
- [x] Global exception handling
- [x] Structured logging
- [x] Input validation (Prisma)

### 🔄 Recommended for Production
- [ ] HTTPS enforcement (reverse proxy)
- [ ] DDoS protection (Cloudflare/AWS Shield)
- [ ] API key authentication for admin endpoints
- [ ] IP whitelisting for sensitive operations
- [ ] Request size limits
- [ ] Audit logging for sensitive operations
- [ ] Security headers testing (securityheaders.com)
- [ ] Penetration testing
- [ ] Dependency vulnerability scanning

## Environment Variables

### Required
```bash
DATABASE_URL=mysql://user:pass@localhost:3306/healthos
API_JWT_SECRET=<minimum-32-character-secret>
```

### Recommended
```bash
APP_ORIGIN=https://app.healthos.com
WEBHOOK_SECRET=<webhook-signing-secret>
NODE_ENV=production
LOG_LEVEL=info
PORT=4000
```

### Optional
```bash
SSO_JWT_SECRET=<separate-sso-secret>
```

## Production Deployment Checklist

### Before Deployment
1. **Generate Strong Secrets**:
   ```bash
   # Generate 64-character secret
   openssl rand -base64 64
   ```

2. **Set Environment Variables**:
   ```bash
   export API_JWT_SECRET=$(openssl rand -base64 64)
   export WEBHOOK_SECRET=$(openssl rand -base64 64)
   export APP_ORIGIN=https://app.healthos.com
   export NODE_ENV=production
   ```

3. **Validate Configuration**:
   ```bash
   npm start
   # Check logs for: "Secrets validation passed"
   ```

4. **Test Security**:
   ```bash
   # Run security audit
   npx ts-node src/security-audit.ts
   
   # Test rate limiting
   ab -n 200 -c 10 http://localhost:4000/user/today
   
   # Test CORS
   curl -H "Origin: https://evil.com" http://localhost:4000/user/today
   ```

### After Deployment
1. **Monitor Logs**:
   ```bash
   # Check for CORS violations
   grep "CORS blocked" logs/api.log
   
   # Check for rate limit hits
   grep "Too many requests" logs/api.log
   
   # Check for auth failures
   grep "Unauthorized" logs/api.log
   ```

2. **Security Headers Test**:
   ```bash
   curl -I https://api.healthos.com/health
   # Verify: Strict-Transport-Security, X-Frame-Options, etc.
   ```

3. **Penetration Testing**:
   - SQL injection attempts
   - XSS attempts
   - CSRF attempts
   - Rate limit bypass attempts

## Common Security Issues

### Issue: CORS Errors in Production
**Symptom**: Frontend can't connect to API

**Solution**:
```bash
# Check APP_ORIGIN matches frontend domain
echo $APP_ORIGIN
# Should be: https://app.healthos.com

# Check logs for blocked origins
grep "CORS blocked" logs/api.log
```

### Issue: Rate Limiting Too Aggressive
**Symptom**: Legitimate users getting blocked

**Solution**:
```typescript
// In app.module.ts, increase limits
ThrottlerModule.forRoot([{
  ttl: 60000,
  limit: 200, // Increase from 100
}])
```

### Issue: Secrets Validation Failing
**Symptom**: App won't start

**Solution**:
```bash
# Check all required secrets are set
env | grep -E '(DATABASE_URL|API_JWT_SECRET)'

# Check secret strength
echo $API_JWT_SECRET | wc -c
# Should be >= 32
```

## Security Monitoring

### Metrics to Track
1. **Rate Limit Hits**: Track how often users hit limits
2. **CORS Violations**: Monitor blocked origins
3. **Auth Failures**: Track failed login attempts
4. **Webhook Signature Failures**: Monitor invalid webhooks

### Alerting Rules
```yaml
# Example Prometheus alerts
- alert: HighRateLimitHits
  expr: rate(http_requests_rate_limited[5m]) > 10
  annotations:
    summary: High rate of rate limit hits

- alert: CORSViolations
  expr: rate(http_requests_cors_blocked[5m]) > 5
  annotations:
    summary: Potential CORS attack

- alert: AuthFailures
  expr: rate(http_requests_auth_failed[5m]) > 20
  annotations:
    summary: High rate of authentication failures
```

## Additional Security Measures

### 1. Request Size Limits
```typescript
// In main.ts
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
```

### 2. IP Whitelisting (Admin Endpoints)
```typescript
// Create IP whitelist guard
@Injectable()
export class IpWhitelistGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip;
    const whitelist = process.env.ADMIN_IP_WHITELIST?.split(',') || [];
    return whitelist.includes(ip);
  }
}

// Apply to admin endpoints
@UseGuards(IpWhitelistGuard)
@Post('jobs/trigger/inactivity-check')
async triggerJob() { ... }
```

### 3. Audit Logging
```typescript
// Log sensitive operations
logger.info({
  userId: user.id,
  action: 'assessment_submitted',
  ip: request.ip,
  timestamp: new Date(),
}, 'Sensitive operation');
```

## Compliance

### GDPR Considerations
- User data encrypted at rest (database level)
- User data encrypted in transit (HTTPS)
- Audit logging for data access
- Right to deletion (implement user deletion endpoint)

### HIPAA Considerations (if applicable)
- All communications over HTTPS
- Audit logging enabled
- Access controls implemented
- Encryption at rest and in transit

## Security Incident Response

### If Breach Detected
1. **Immediate**: Rotate all secrets
2. **Investigate**: Check logs for unauthorized access
3. **Notify**: Inform affected users
4. **Patch**: Fix vulnerability
5. **Monitor**: Increase monitoring for 30 days

### Emergency Secret Rotation
```bash
# Generate new secrets
NEW_JWT_SECRET=$(openssl rand -base64 64)
NEW_WEBHOOK_SECRET=$(openssl rand -base64 64)

# Update environment
export API_JWT_SECRET=$NEW_JWT_SECRET
export WEBHOOK_SECRET=$NEW_WEBHOOK_SECRET

# Restart API
pm2 restart api

# Invalidate all existing JWTs (users must re-login)
```

---

## Summary

Iteration 6 has hardened the API with production-grade security:
- ✅ Rate limiting prevents abuse
- ✅ CORS prevents unauthorized origins
- ✅ Helmet adds security headers
- ✅ Secrets validation prevents misconfigurations
- ✅ All user endpoints protected with JWT
- ✅ Webhooks verified with signatures

The API is now ready for production deployment with comprehensive security measures in place.
