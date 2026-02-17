# HealthOS Clinical Control Center: Information Architecture & Research Design

## 1. Core Philosophy
The Clinical Control Center is not a management dashboard; it is an **observatory** for a behavioral operating system. Every pixel must serve the goal of **causal understanding** of state change.

## 2. Information Architecture (IA)

### A. Population Observatory
*   **Purpose**: Detect which organism types respond to which interventions.
*   **Key View**: Multi-dimensional clustering map (PCA or t-SNE projection) based on:
    *   Symptoms vector
    *   Circadian stability
    *   Metabolic baseline
*   **Interactive Layers**: Overlay protocol effectiveness on top of clusters.

### B. Protocol Laboratory
*   **Purpose**: Evaluate the "dose-response" and "time-to-stabilization" per protocol.
*   **Metrics**:
    *   **Improvement Distribution**: Violin plots (not just means).
    *   **Regression Analysis**: Percent of users who worsen after completion.
    *   **Dropout Phase Detection**: Identifying "friction points" in the ritual timeline.

### C. Sequence/Pathway Analysis
*   **Purpose**: Discovery of healing vs. destabilizing sequences.
*   **Key View**: Transition Matrix (Protocol A → Protocol B).
*   **Metric**: Weighted Effect Size of the transition.

### D. Adherence Topology
*   **Purpose**: Correlate pattern morphology (consistent vs. bursty) with outcome.
*   **Key View**: Heatmap of Adherence Morphologies vs. State Delta.

### E. Predictive Risk Engine
*   **Purpose**: Early failure detection.
*   **Metrics**: 3-day failure probability, volatility spikes, "drift" from baseline.

---

## 3. Data Aggregation Layer (Derived Metrics)

| Metric | Calculation / Logic | Research Utility |
| :--- | :--- | :--- |
| **State Delta (ΔS)** | `SelfReport_Final - SelfReport_Initial` | Magnitude of change. |
| **Stabilization Score** | `1 / Variance(State_7d)` | Assessment of system resilience. |
| **Volatility Score** | `StandardDeviation(Progress_Daily)` | Detection of nervous system "noise". |
| **Effect Size (g)** | Hedges' g (for small sample cohorts). | Protocol power comparison. |
| **Dropout Velocity** | Rate of change in completion probability. | UX/Content friction analysis. |

---

## 4. Query Definitions (Pseudo-SQL)

### Population Clustering
```sql
SELECT 
  u.id, 
  JSON_EXTRACT(a.symptoms, '$.vector') as symptoms,
  JSON_EXTRACT(a.constraints, '$.metabolism') as metabolic_type,
  AVG(dl.actionCompleted) as adherence
FROM Users u
JOIN Assessments a ON u.id = a.userId
JOIN DailyLogs dl ON u.id = dl.userId
GROUP BY u.id
```

### Transition Effect Size
```sql
SELECT 
  pt.fromProtocol, 
  pt.nextProtocol,
  AVG(pc_after.adherenceRate - pc_before.adherenceRate) as adherence_delta,
  COUNT(*) as n
FROM ProtocolCompletions pc_before
JOIN ProtocolTransitions pt ON pc_before.programId = pt.fromProtocol
JOIN ProtocolCompletions pc_after ON pc_before.userId = pc_after.userId 
  AND pc_after.programId = pt.nextProtocol
GROUP BY pt.fromProtocol, pt.nextProtocol
```

---

## 5. Implementation Roadmap

### Phase 1: Aggregation API (COMPLETE)
*   Develop `ControlCenterService` in the NestJS API.
*   Implement `getPopulationStats`, `getProtocolDeepDive`, and `getTransitionMatrix`.

### Phase 2: Scientific Visualization Layer (COMPLETE)
*   Scaffold `apps/web/app/control-center`.
*   Build the Population Map using SVG/CSS for high-density behavioral data.
*   Implement Distribution Charts (Violin/Box) for Protocol Effectiveness.

### Phase 3: Predictive & Recalibration Engine (IN PROGRESS)
*   Implement the Early Failure Predictor (heuristic-based).
*   Add the Recalibration Analyzer (comparing pre-recal vs. post-recal stabilization).

### Phase 4: Research UI Polish (IN PROGRESS)
*   Add explicit "Biological Conclusions" to every graph.
*   Implement filtering by "Organism Type" (Clusters).
