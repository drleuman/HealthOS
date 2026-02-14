# Observability Guide

## Overview
The API now includes comprehensive observability features:
- **Structured Logging** with Pino
- **Request Tracing** via requestId
- **Health Endpoints** for monitoring
- **Global Exception Handling** for consistent errors

## Endpoints

### Health Check
```bash
curl http://localhost:4000/health
```
Returns: API status, uptime, memory usage

### Readiness Check
```bash
curl http://localhost:4000/ready
```
Returns: Database connectivity status (for K8s readiness probes)

### Metrics
```bash
curl http://localhost:4000/metrics
```
Returns: Memory and uptime metrics in JSON format

## Logging

### Development Mode
Logs are pretty-printed with colors for easy reading:
```bash
# Start the API
npm run dev

# Logs will show:
[21:00:00.000] INFO: API started successfully
    port: 4000
    appOrigin: "http://localhost:3000"
```

### Production Mode
Set `NODE_ENV=production` for JSON-formatted logs suitable for log aggregation:
```bash
NODE_ENV=production npm start
```

### Log Levels
Control verbosity with `LOG_LEVEL` environment variable:
```bash
LOG_LEVEL=debug npm run dev  # Show all logs
LOG_LEVEL=warn npm run dev   # Only warnings and errors
```

## Request Tracing

Every request gets a unique `requestId`:
- Auto-generated if not provided
- Returned in response headers as `x-request-id`
- Included in all log entries
- Can be passed by clients via `x-request-id` header

Example:
```bash
curl -H "x-request-id: my-trace-123" http://localhost:4000/user/today
```

## Error Handling

All errors return consistent JSON format:
```json
{
  "statusCode": 401,
  "message": "Invalid webhook signature",
  "requestId": "abc-123-def",
  "timestamp": "2026-02-13T21:00:00.000Z",
  "path": "/webhooks/mithohacks/order"
}
```

Errors are automatically logged with full context:
```
[21:00:00.000] ERROR: Request failed
    requestId: "abc-123-def"
    method: "POST"
    url: "/webhooks/mithohacks/order"
    status: 401
    message: "Invalid webhook signature"
```

## Monitoring Integration

### Prometheus (Future)
The `/metrics` endpoint can be extended to Prometheus format using `prom-client`.

### Log Aggregation
In production, pipe JSON logs to:
- **CloudWatch** (AWS)
- **Stackdriver** (GCP)
- **Elasticsearch** (ELK stack)
- **Datadog**, **New Relic**, etc.

Example with Docker:
```dockerfile
CMD ["node", "dist/main.js", "2>&1", "|", "tee", "/var/log/api.log"]
```

## Testing Observability

### Test Health Endpoints
```bash
# Health
curl http://localhost:4000/health

# Readiness (requires DB)
curl http://localhost:4000/ready

# Metrics
curl http://localhost:4000/metrics
```

### Test Error Logging
```bash
# Trigger an error to see structured logging
curl -X POST http://localhost:4000/webhooks/mithohacks/order \
  -H "x-mh-signature: invalid" \
  -H "Content-Type: application/json" \
  -d '{"order_id":"test"}'
```

### Test Request Tracing
```bash
# Send request with custom requestId
curl -H "x-request-id: trace-001" http://localhost:4000/health

# Check response headers
curl -i http://localhost:4000/health | grep x-request-id
```
