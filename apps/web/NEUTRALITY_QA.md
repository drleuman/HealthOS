# HealthOS Frontend Neutrality Check

This checklist must be reviewed before every frontend deployment to ensure the UI remains a scientific instrument, not a persuasive product.

## A. Neutrality & Tone
- [ ] **No Motivational Language**: No "Good job", "Keep it up", "You're doing great".
- [ ] **No Reward Metaphors**: No streaks, badges, confetti, or "level up" animations.
- [ ] **No Judgment**: States are "[OBSERVED]" or "—" (dash), never "Failed", "Missed" or "Pending".
- [ ] **Sentence Case Actions**: Buttons say "Capture state", not "CAPTURE STATE".
- [ ] **Technical Metadata**: Labels like "FREQ: SPONTANEOUS" used instead of "Daily Goal".

## B. Experimental Integrity (Blindness)
- [ ] **Control Group Blindness**: Control users see the same layout structure as Treatment users.
- [ ] **Empty States**: If no intervention is present, render "NO CONTEXTUAL DATA", never "CONTEXT_UNAVAILABLE" (implies something is missing).
- [ ] **Uniform Interactions**: Latency and interaction costs are identical for all groups.

## C. Visual Hygiene
- [ ] **Monochromatic**: No color used to signal emotion (e.g., Red = Bad). Color only signals system status or selection.
- [ ] **Hardware Feel**: No bounce animations, elastic easing, or gradients.
- [ ] **Typography**: Headers in Inter (Neutral), Data in Mono (Technical).

## D. Friction & Usability
- [ ] **Instrument Status**: The primary screen states "INSTRUMENT_STATUS: AVAILABLE" (not READY, which induces usage).
- [ ] **Help Access**: A neutral "Technical details" collapsible is available (max 2 descriptive sentences).
- [ ] **Optionality**: Core actions are framed as "No action required", eliminating demand characteristics.
- [ ] **Silence**: The interface never implies a correct usage frequency (e.g., daily).

## E. Perceptual Persistence (Controlled Drift)
- [ ] **Deterministic Rotation**: The "System available" anchor rotates deterministically based on the calendar day (not session).
- [ ] **Stable Within Day**: The same variation is shown for all visits within the same 24h window (prevents vigilance triggers).
- [ ] **Synchronized Drift**: Vertical offset (±2px) is tied to the phrase rotation to maintain the illusion of a single physical object drifting.
- [ ] **No Animation**: Changes occur only on page load, never animated.

## F. Interpretive Drift Prevention
- [ ] **System Property Statement**: A persistent "Physical Law" statement (e.g., "Records are independent") is visible but unobtrusive.
- [ ] **No Hidden Rules**: All constraints are explicit (hardware limits), never implied (social norms).
- [ ] **Passive Affordance**: Actions are framed as possibilities (`[ record ]`), not commands.
