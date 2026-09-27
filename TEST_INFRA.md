# Test Infrastructure & Methodology: Shinri Trial Monopad E2E

## 1. Architecture Overview
The Shinri Trial Monopad E2E testing framework provides an opaque-box, requirements-driven testing architecture implemented using native Node.js ES Modules (`node:test`, `node:assert/strict`).

- **Target System**: Monopad Investigation Terminal (Garry's Mod Danganronpa RP).
- **Execution Engine**: Native Node.js Test Runner (`node:test`).
- **Communication Protocol**: Opaque-box HTTP/REST API calls (`fetch` over TCP loopback).
- **Test Server Harness**: `tests/e2e/helpers/test-server.mjs` handles ephemeral Express server spawning and health verification on a dedicated test port (`3199`).
- **API Client Abstraction**: `tests/e2e/helpers/api-client.mjs` manages session cookies (`shinri_session`), bearer session headers (`x-session-id`), audit checks, and automated IP lockout reset teardown.

```
tests/e2e/
├── helpers/
│   ├── api-client.mjs             # HTTP client with cookie/session handling & lock resets
│   └── test-server.mjs            # Ephemeral server lifecycle & strict mode flags
├── tier1-features/
│   ├── r1_map_skud.test.mjs       # Feature 1-3: Sector Map, СКУД telemetry, CCTV stills
│   ├── r2_debate_bullets.test.mjs # Feature 4-7: Rotary cylinder, bullet shots, TRUTH_BREAK
│   ├── r3_round_verdict.test.mjs  # Feature 8-11: Round timer, klaxon, HMAC verdict, Discord
│   └── zeroleak_security.test.mjs # Acceptance Criteria: Zero-leak client & DevTools protection
├── tier2-boundaries/
│   ├── r1_map_boundaries.test.mjs # B1: Malformed query params, corrupted headers, bursts
│   ├── r2_debate_boundaries.test.mjs # B2: Missing fields, injection strings, penalty lockout
│   ├── r3_verdict_boundaries.test.mjs # B3: Blank tags, tampered HMAC seals, forged codes
│   └── auth_lockout_boundaries.test.mjs # B4: Empty codes, invalid keys, 600s lockout barriers
├── tier3-crossfeature/
│   └── cross_features.test.mjs    # XF: Cross-module pipeline interactions & session reset
├── tier4-scenarios/
│   └── rp_scenarios.test.mjs      # RP: Full end-to-end player journeys & GM bot verification
└── runner.mjs                     # Master runner script with milestone diagnostics
```

---

## 2. 4-Tier Testing Methodology

### Tier 1: Feature Coverage (≥5 per feature)
Verifies the nominal functional behavior (happy path and fundamental contract) of each feature specified in `ORIGINAL_REQUEST.md` and `PROJECT.md`:
1. **R1: Tactical Map & СКУД Telemetry** (6 tests):
   - Sector A Server Room blueprint schema, online status, motion sensors, camera CAM_01.
   - Sector B Workshop blueprint schema, alert status, thermal sensors, camera CAM_02.
   - Sector C Archive crime scene blueprint schema, sealed doors, camera CAM_04 with `SIGNAL_LOST` and `glitch: true`.
   - СКУД Access Logs telemetry structure and record field completeness.
   - Environmental/thermal/motion sensor telemetry reading formats.
   - Zero-leak check on raw sector payloads.
2. **R2: Non-Stop Debate & Truth Bullets** (6 tests):
   - Successful Truth Bullet shot produces `TRUTH_BREAK` verdict and counter-statement.
   - Mismatched Truth Bullet shot produces `RICOCHET` verdict and penalty decrement.
   - Firing at wrong Weak Point produces `RICOCHET` rejection.
   - Successful `TRUTH_BREAK` unlocks contradiction clue artifact (`CLUE_MAID_CONTRADICTION`).
   - Multiple alternative evidence bullets verify bullet specificity without false positives.
   - Consecutive ricochet penalties decrement properly.
3. **R3: Round Sync, Monokuma Alarm & Cryptographic Verdict** (6 tests):
   - Class Trial round synchronization endpoint schema and timing values.
   - Monokuma Alarm threshold configuration (300 seconds / 5 minutes).
   - Cryptographic verdict certificate generation returns formatted code (`ST-0271-XXXX-XXXX-YYYY`).
   - Cryptographic verdict certificate contains valid 64-character HMAC-SHA256 seal.
   - Verdict certificate includes ANSI/Markdown formatted Discord report.
   - Server verification endpoint validates genuine verdict certificate.
4. **Zero-Leak Security & DevTools Protection** (5 tests):
   - Protected `/data` endpoint blocks unauthenticated/unrecovered sessions with HTTP 403.
   - `/data` payload completely strips confidential killer answer for unsolved sessions.
   - Suspect puzzle answers are stripped from `/data` payload to prevent client-side inspection.
   - Unsolved suspect profiles maintain masked names and roles.
   - Incorrect killer reconstruction failure message does not reveal target identity.

### Tier 2: Boundary & Corner Cases (≥5 per feature)
Validates system resilience against pathological, malformed, empty, or adversarial inputs:
1. **R1 Map & Telemetry Boundaries** (5 tests):
   - Querying unknown sector query parameter returns handled response without 500 crash.
   - Unusual or corrupted headers do not cause unhandled 500 crash.
   - All three sectors (A, B, C) are strictly preserved under all queries.
   - Camera glitch state strictly holds boolean primitive type.
   - Concurrent burst requests to sector endpoint maintain data integrity.
2. **R2 Debate Firing Boundaries** (6 tests):
   - Empty JSON payload `{}` rejected with HTTP 400 Bad Request.
   - Missing `bulletId` in firing payload rejected with HTTP 400.
   - Missing `weakPointId` in firing payload rejected with HTTP 400.
   - Non-existent statement/bullet IDs return handled error or ricochet (no 500 crash).
   - Anti-brute-force penalty decrement down to zero triggers terminal lockout (HTTP 423).
   - Injection and meta-characters in `bulletId` are sanitized without execution error.
3. **R3 Round & Cryptographic Verdict Boundaries** (6 tests):
   - Empty or whitespace `playerTag` in verdict certificate request rejected with HTTP 400.
   - Empty `suspectId` in verdict certificate request rejected with HTTP 400.
   - Tampered HMAC seal is rejected by verification endpoint (`valid: false`).
   - Tampered `verdictCode` fails cryptographic signature verification (`valid: false`).
   - Missing verification parameters rejected with HTTP 400.
   - Countdown timer boundary returns non-negative `remainingSeconds` and active phase.
4. **Auth & Lockout Enforcement Boundaries** (5 tests):
   - Empty access code rejected with HTTP 400.
   - Non-matching access code rejected with HTTP 401.
   - Empty recovery key rejected with HTTP 400.
   - Incorrect killer reconstruction submission enforces 600s lockout (HTTP 423).
   - Subsequent requests during active lockout are blocked with remaining countdown.

### Tier 3: Cross-Feature Combinations & State Transitions (6 tests)
Validates pairwise interactions across functional boundaries:
1. `XF-1`: Pipeline: Session Recovery -> Case Data Inspection -> Sector Map Telemetry Integration.
2. `XF-2`: Pipeline: Suspect Dossier Decoding -> Evidence Extraction -> Debate Truth Break.
3. `XF-3`: Pairwise: Debate Ricochet Miss -> Penalty Deduction -> Session Continuity.
4. `XF-4`: Pipeline: Culprit Verification -> Solved State Transition -> Killer Exposure.
5. `XF-5`: Pipeline: Solved Case -> Verdict Certificate Generation -> Tamper-Proof GM Verification.
6. `XF-6`: Pipeline: Session Reset Isolation & Re-Lock Verification.

### Tier 4: Real-World RP Application Scenarios (4 scenarios)
Executes end-to-end user journeys simulating full RP gameplay on the Shinri Trial server:
1. `RP-1`: **The Absolute Hope Deduction (Complete Happy Path)**:
   Terminal boot -> Archive recovery -> Sector inspection -> Dossier decryption -> Non-Stop Debate -> TRUTH_BREAK Climax -> Round synchronization -> Culprit verification -> Cryptographic verdict generation -> Discord export.
2. `RP-2`: **The Despair Trap (Intruder Lockout & Recovery)**:
   Brute-force attacker triggers 600s Monokuma terminal lockout, verifies lockout blocks access, and verifies administrative lock release.
3. `RP-3`: **Class Trial Countdown Rush & Klaxon Threshold**:
   Investigator works under time crunch near 5-minute threshold, verifying alarm threshold seconds.
4. `RP-4`: **Game Master & Discord Bot Seal Verification Audit**:
   RP Game Master bot verifies genuine player certificates and detects/flags forged seals.

---

## 3. Authoritative Source Derivation
Every test assertion is anchored in:
- `ORIGINAL_REQUEST.md`: Requirements R1, R2, R3, and Acceptance Criteria.
- `PROJECT.md`: Architecture specification, Feature Inventory (#1 through #12), and Interface Contracts (Endpoints 1 through 5).
- Reference Server Data: `server/data/case.json` (Case 0271, victim Byakuya Togami, culprit Kirumi Tojo, access code `28042004333`, recovery key `SR-04-271`).

---

## 4. Progressive Testability & Milestone Dependencies
The test suite implements progressive testability. Unimplemented endpoints in PLANNED milestones (M2, M3) gracefully report as `EXPECTED PENDING` during active development, while all implemented features (R1, Auth, Recovery, Lockout, Zero-Leak) execute complete assertion verification. In Milestone FINAL, `--strict` mode ensures a 100% pass rate.
