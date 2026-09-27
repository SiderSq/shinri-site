# TEST_READY: Shinri Trial Monopad E2E Test Suite

## Execution Commands

### Primary Test Runner (Automatic Server Spawning & Port Management)
```bash
# Standard run (executes all tiers, verifies implemented features, documents milestone pending tests)
npm test
# OR
node tests/e2e/runner.mjs
```

### Strict Mode (For Milestone FINAL — Fails if any test is pending or skipped)
```bash
npm run test:strict
# OR
node tests/e2e/runner.mjs --strict
```

### Direct Native Node.js Test Runner
```bash
node --test --test-concurrency=1 tests/e2e/tier1-features/*.test.mjs tests/e2e/tier2-boundaries/*.test.mjs tests/e2e/tier3-crossfeature/*.test.mjs tests/e2e/tier4-scenarios/*.test.mjs
```

### Filter by Specific Tier or Feature
```bash
node tests/e2e/runner.mjs tier1
node tests/e2e/runner.mjs map
node tests/e2e/runner.mjs debate
node tests/e2e/runner.mjs verdict
```

---

## Test Suite Execution Summary (Current Baseline)

- **Total Test Cases**: 55
- **Suites Executed**: 10
- **Currently Passing**: 25 (100% of implemented features across R1, Auth, Recovery, Lockout, Zero-Leak, and integration pipelines)
- **Expected Pending**: 30 (Awaiting implementation of Milestone M2: Non-Stop Debate & Milestone M3: Round Sync / Cryptographic Verdict)
- **Unexpected Failures**: 0
- **Execution Duration**: ~5.5s – 11s

---

## Requirement & Feature Coverage Matrix

| Feature / Module | Specification Source | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Cross) | Tier 4 (RP Scenario) | Total Tests | Status |
|---|---|---|---|---|---|---|---|
| **R1: Tactical Map (Sectors A/B/C)** | `ORIGINAL_REQUEST.md §R1`, `PROJECT.md §Contract 1` | 3 | 3 | 1 | 1 | 8 | **PASS** (6 implemented) |
| **R1: СКУД Access Logs & Telemetry** | `ORIGINAL_REQUEST.md §R1`, `PROJECT.md §Contract 1` | 2 | 1 | 1 | 1 | 5 | **PASS** |
| **R1: CCTV Video Stills & Glitch** | `ORIGINAL_REQUEST.md §R1`, `PROJECT.md §Contract 1` | 1 | 1 | 0 | 1 | 3 | **PASS** |
| **R2: Non-Stop Debate & Statements** | `ORIGINAL_REQUEST.md §R2`, `PROJECT.md §Contract 2` | 2 | 2 | 1 | 1 | 6 | **PENDING M2** |
| **R2: Rotary Truth Bullet Cylinder** | `ORIGINAL_REQUEST.md §R2`, `PROJECT.md §Contract 2` | 2 | 2 | 1 | 1 | 6 | **PENDING M2** |
| **R2: Weak Point & Truth Break AV** | `ORIGINAL_REQUEST.md §R2`, `PROJECT.md §Contract 2` | 2 | 2 | 1 | 1 | 6 | **PENDING M2** |
| **R3: Round Countdown Timer** | `ORIGINAL_REQUEST.md §R3`, `PROJECT.md §Contract 3` | 1 | 1 | 0 | 1 | 3 | **PENDING M3** |
| **R3: Monokuma Alarm Siren (<300s)** | `ORIGINAL_REQUEST.md §R3`, `PROJECT.md §Contract 3` | 1 | 1 | 0 | 1 | 3 | **PENDING M3** |
| **R3: Cryptographic HMAC Seal** | `ORIGINAL_REQUEST.md §R3`, `PROJECT.md §Contract 4-5`| 2 | 2 | 1 | 1 | 6 | **PENDING M3** |
| **R3: Discord Report Generator** | `ORIGINAL_REQUEST.md §R3`, `PROJECT.md §Contract 4-5`| 2 | 2 | 1 | 1 | 6 | **PENDING M3** |
| **Zero-Leak DevTools Security** | `ORIGINAL_REQUEST.md §AC`, `PROJECT.md §Feature 8` | 5 | 0 | 1 | 1 | 7 | **PASS** |
| **Authentication & IP Lockout** | `server/routes/auth.js`, `storage.js` | 0 | 5 | 1 | 1 | 7 | **PASS** |
| **TOTAL** | — | **23** | **22** | **6** | **4** | **55** | **READY** |

---

## Detailed Test Case Catalog

### Tier 1: Feature Coverage (23 Tests)
- `R1-1`: Sector A (Server Room) schema, status, and telemetry verification [PASS]
- `R1-2`: Sector B (Workshop) schema, status, and sensor telemetry verification [PASS]
- `R1-3`: Sector C (Archive Crime Scene) schema, sealed door, and CAM-04 glitch state [PASS]
- `R1-4`: СКУД Access Logs telemetry structure and record completeness [PASS]
- `R1-5`: Environmental & thermal presence sensor telemetry string formats [PASS]
- `R1-6`: Zero-Leak verification on Sector Map payload (No suspect culpability in raw telemetry) [PASS]
- `R2-1`: Successful Truth Bullet shot produces TRUTH_BREAK verdict and counter-statement [PENDING M2]
- `R2-2`: Mismatched Truth Bullet shot produces RICOCHET verdict and penalty [PENDING M2]
- `R2-3`: Firing at wrong Weak Point produces RICOCHET rejection [PENDING M2]
- `R2-4`: Successful TRUTH_BREAK unlocks contradiction clue artifact [PENDING M2]
- `R2-5`: Multiple alternative evidence bullets verify bullet specificity (no false positives) [PENDING M2]
- `R2-6`: Consecutive ricochet penalties decrement properly [PENDING M2]
- `R3-1`: Class Trial round synchronization endpoint schema and timing values [PENDING M3]
- `R3-2`: Monokuma Alarm threshold configuration (300 seconds / 5 minutes) [PENDING M3]
- `R3-3`: Cryptographic verdict certificate generation returns formatted code [PENDING M3]
- `R3-4`: Cryptographic verdict certificate contains valid HMAC-SHA256 seal [PENDING M3]
- `R3-5`: Verdict certificate includes ANSI/Markdown formatted Discord report [PENDING M3]
- `R3-6`: Server verification endpoint validates genuine verdict certificate [PENDING M3]
- `ZL-1`: Protected /data endpoint blocks unauthenticated/unrecovered sessions with 403 [PASS]
- `ZL-2`: /data payload completely strips confidential killer answer for unsolved sessions [PASS]
- `ZL-3`: Suspect puzzle answers are stripped from /data payload to prevent client-side inspection [PASS]
- `ZL-4`: Unsolved suspect profiles maintain masked names and roles [PASS]
- `ZL-5`: Incorrect killer reconstruction failure message does not reveal target identity [PASS]

### Tier 2: Boundary & Corner Cases (22 Tests)
- `B1-1`: Request with unknown sector query parameter is handled without crashing [PASS]
- `B1-2`: Request with unusual/corrupted headers does not trigger 500 unhandled exception [PASS]
- `B1-3`: Sector endpoints return consistent structure with all three sectors (A, B, C) [PASS]
- `B1-4`: Camera glitch state boolean flag strictly holds boolean primitive [PASS]
- `B1-5`: Concurrent bursts to sector endpoint maintain data integrity and responsiveness [PASS]
- `B2-1`: Empty JSON payload to /debate/fire rejected with 400 Bad Request [PENDING M2]
- `B2-2`: Missing bulletId in firing payload rejected with 400 Bad Request [PENDING M2]
- `B2-3`: Missing weakPointId in firing payload rejected with 400 Bad Request [PENDING M2]
- `B2-4`: Non-existent statementId or bulletId returns handled error/ricochet (no 500 crash) [PENDING M2]
- `B2-5`: Anti-brute-force penalty decrement down to zero triggers terminal lockout [PENDING M2]
- `B2-6`: Injection / meta-characters in bulletId sanitized without code evaluation error [PENDING M2]
- `B3-1`: Empty playerTag in verdict certificate request rejected with 400 [PENDING M3]
- `B3-2`: Empty suspectId in verdict certificate request rejected with 400 [PENDING M3]
- `B3-3`: Tampered HMAC seal is rejected by verification endpoint (valid: false) [PENDING M3]
- `B3-4`: Tampered verdictCode fails cryptographic signature verification [PENDING M3]
- `B3-5`: Missing parameters to /verify-verdict rejected with 400 Bad Request [PENDING M3]
- `B3-6`: Countdown timer boundary returns non-negative remainingSeconds and active phase [PENDING M3]
- `B4-1`: Empty or whitespace access code rejected with 400 Bad Request [PASS]
- `B4-2`: Non-matching access code rejected with 401 Unauthorized [PASS]
- `B4-3`: Empty recovery key rejected with 400 Bad Request [PASS]
- `B4-4`: Incorrect killer reconstruction submission enforces 600s lockout (HTTP 423) [PASS]
- `B4-5`: Subsequent requests during active lockout are blocked with remaining countdown [PASS]

### Tier 3: Cross-Feature Combinations & State Transitions (6 Tests)
- `XF-1`: Pipeline: Recovery -> Data Retrieval -> Sector Map Telemetry Integration [PASS]
- `XF-2`: Pipeline: Suspect Dossier Decoding -> Evidence Extraction -> Debate Truth Break [PENDING M2]
- `XF-3`: Pairwise: Debate Ricochet Miss -> Penalty Deduction -> Session Continuity [PENDING M2]
- `XF-4`: Pipeline: Culprit Verification -> Solved State Transition -> Killer Exposure [PASS]
- `XF-5`: Pipeline: Solved Case -> Verdict Certificate Generation -> Tamper-Proof GM Verification [PENDING M3]
- `XF-6`: Pipeline: Session Reset Isolation & Re-Lock Verification [PASS]

### Tier 4: Real-World RP Application Scenarios (4 Tests)
- `RP-1`: The Absolute Hope Deduction (Complete Happy Path Investigation) [PENDING M2]
- `RP-2`: The Despair Trap (Intruder Brute-Force Lockout & Recovery) [PASS]
- `RP-3`: Class Trial Countdown Rush & Klaxon Threshold Verification [PENDING M3]
- `RP-4`: Game Master & Discord Bot Seal Verification Audit [PENDING M3]

---

## Milestone Implementation Roadmap

To achieve 100% pass on `npm run test:strict`:

1. **Milestone M2 Implementation**:
   - Implement `POST /api/investigation/debate/fire` with statement/weakpoint/bullet evaluation and penalty decrements.
   - Automatically unlocks `XF-2`, `XF-3`, `RP-1`, and all `B2-*` and `R2-*` tests.
2. **Milestone M3 Implementation**:
   - Implement `GET /api/investigation/round-time` with countdown schedule and 300s alarm threshold.
   - Implement `POST /api/investigation/verdict-certificate` generating HMAC-SHA256 seal and ANSI Discord report.
   - Implement `GET /api/investigation/verify-verdict` validating submitted seals.
   - Automatically unlocks `XF-5`, `RP-3`, `RP-4`, and all `B3-*` and `R3-*` tests.
3. **Milestone FINAL**:
   - Run `npm run test:strict` — expect 55 / 55 passing (100%).
