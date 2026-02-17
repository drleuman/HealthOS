# HealthOS Research-Grade Security & Connectivity Hardening

> **Critical Mission**: Protect the integrity of biological state inference.
> Prevent alteration of scientific conclusions and reconstruction of physiological identity.

This document outlines the specialized security architecture for HealthOS as a clinical instrument. It goes beyond standard OWASP compliance to ensure **data provenance, non-repudiability, and cohort privacy**.

---

## 1. Architecture: The "Clinical Instrument" Model

The system is divided into three isolated zones.

```mermaid
graph TD
    subgraph "Zone A: Public Instrument"
        Client[Client App (PWA)]
        PublicAPI[Public Ingestion API]
    end

    subgraph "Zone B: Processing Core"
        StateEngine[State Engine]
        Database[(Clinical Data Store)]
        Redis[(Event Deduplication Log)]
    end

    subgraph "Zone C: Research Isolation"
        ControlCenter[Control Center API]
        ResearchDash[Research Dashboard]
    end

    Client -->|Signed Events| PublicAPI
    PublicAPI -->|Validated Payload| StateEngine
    StateEngine -->|Immutable Snapshots| Database
    StateEngine -->|Deduplication Check| Redis
    
    ResearchDash -->|Read-Only Aggregates| ControlCenter
    ControlCenter -->|K-Anonymous Query| Database
```

*   **Zone A (Public Instrument)**: Accepts behavioral signals. Zero trust. All inputs must be cryptographically verifiable.
*   **Zone B (Processing Core)**: The "Black Box". Calculates state. No direct human access.
*   **Zone C (Research Isolation)**: Observations. Can only see what Zone B has finalized. Cannot mutate state.

---

## 2. Event Authenticity & Replay Protection

To prevent **falsification of adherence** (e.g., a script sending "completed" events) and **replay attacks** (resending a legitimate "completed" packet), we implement a **Signed Event Protocol**.

### Protocol
1.  **Session Handshake**: Upon login, server issues a short-lived `session_secret` separate from the JWT.
2.  **Event Signing**: Client computes a signature for every critical event.
    ```
    Payload = {
      eventId: UUID,       // Unique per event
      timestamp: ISO8601,  // Client time
      type: "day_completed",
      data: { ... }
    }
    
    Signature = HMAC_SHA256(session_secret, eventId + timestamp + type + sorted_json(data))
    ```
    The request includes `X-Event-Signature` and `X-Event-Id`.

3.  **Server Verification**:
    *   **Signature Check**: Recomputes HMAC. Invalid signature = 403.
    *   **Timestamp Window**: `server_time - 5 mins < event_time < server_time + 5 mins`. Prevents old events.
    *   **Replay Check**: `Redis.set(eventId, 1, 'NX', 'EX', 600)`. If key exists, reject as replay.
    *   **Device Fingerprint**: Bind session to `User-Agent` + `Client-Hint` hash.

---

## 3. State Snapshot Integrity (Tamper-Evident Chain)

To prevent **Snapshot Manipulation** (DB admins or hackers altering a user's biological state history), we implement **Hash Chaining**.

### Mechanism
The `UserBehaviorSnapshot` table essentially becomes a private blockchain for each user.

*   New Field: `previousSnapshotHash` (Hash of the previous day's snapshot record)
*   New Field: `integrityHash` (Hash of current record)

```typescript
// Calculation
integrityHash = SHA256(
    prevSnapshotHash + 
    userId + 
    date + 
    startedDaysLast7 + 
    completedDaysLast7 + 
    repeatedOpeningsSameDay + 
    inactive48h + 
    SERVER_INTEGRITY_SECRET
)
```

**Verification Job**: A nightly job recalculates the chain. If any hash mismatches, the user's data is flagged as **CORRUPTED** and excluded from research cohorts.

---

## 4. Research Endpoint Isolation & Cohort Privacy

Research endpoints in `ControlCenterService` must NOT expose raw user data.

### Constraints
1.  **K-Anonymity**: Aggregates must always include at least `K=5` users. If a cluster has fewer than 5 users, it is merged into "Other" or suppressed.
2.  **Differential Privacy**: Numerical aggregates (e.g., avg adherence) receive injected noise (Laplace mechanism) so removing one user doesn't reveal their exact value.
3.  **No PII**: Names, emails, and exact IP addresses are strictly forbidden in Research responses. Only `userId` (if needed for debugging) or `cohortId`.

### Network Isolation
*   **Public API**: Accessible via `app.healthos.com`
*   **Research API**: Accessible via `research.healthos.internal` (VPN/Private Link only).
*   **Research Auth**: Requires `X-Research-Key` (Rotated daily) AND Valid Researcher JWT.

---

## 5. Temporal Obfuscation

To prevent **Time-Based Identity Inference** (e.g., knowing a target user exercises at 6:00 AM), the Research API fuzzes timestamps.

*   **Public API**: Stores exact `createdAt`.
*   **Research API**: Returns `aligned_timestamp` rounded to the nearest hour or randomized within a +/- 15 min window for specific event logs visualization.

---

## 6. Consultant Access Model

Consultants need to see "trends" but not raw data ownership.

*   **View-Only Access**: Consultants view a derived "Clinical Dashboard".
*   **No Export**: The UI strictly disables CSV/JSON export features.
*   **Watermarking**: All clinical views render invisible watermarks with the Consultant's ID to trace leaks (screenshots).

---

## 7. Production Key Strategy

Strict key management to prevent catastrophic compromise.

1.  **No `.env` in Code**: Secrets injected via Secret Manager (AWS Secrets Manager / Vault) at runtime.
2.  **Key Rotation**:
    *   `JWT_SECRET`: Rotates weekly. (Requires re-login).
    *   `HMAC_SESSION_SECRET`: Unique per user session.
    *   `DATABASE_ENCRYPTION_KEY`: For encrypting PII at rest.
3.  **Scope**:
    *   **Research Keys** are read-only database users.
    *   **App Keys** are write-enabled but cannot `DROP` tables.

---

## Implementation Checklist

### Immediate (Codebase)
- [ ] Add `eventId` and `signature` processing to `TrackingController`.
- [ ] Implement `Redis` (or in-memory for MVP) replay cache.
- [ ] Add `integrityHash` column to `UserBehaviorSnapshot`.
- [ ] Refactor `ControlCenterService` to enforce K=5 aggregation.

### Deployment (Ops)
- [ ] Set up Private VPC for Control Center.
- [ ] Configure IP Whitelisting for Research endpoints.
- [ ] Enable Database Audit Logging.

