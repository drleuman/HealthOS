# API Endpoints (MVP)
- POST `/assessment`
- GET `/user/today`
- GET `/user/route`
- POST `/user/day-log`
- GET `/auth/sso-token?tool=...`
- POST `/webhooks/mithohacks/order` (HMAC `x-mh-signature: sha256=...`)
Auth for MVP dev is header-based: `X-User-Email`.
Replace with real JWT session in Sprint 2.
