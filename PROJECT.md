# Project: Shinri Trial Monopad Investigation Terminal

## Architecture
The Shinri Trial Monopad is a full-stack tactical investigation terminal designed for the Shinri Trial Danganronpa RP setting with Nagito Komaeda persona.

- **Frontend (`/client`)**: React 19, Vite 8, Tailwind CSS v4, Lucide React icons, and Web Audio API procedural synthesis.
  - `TacticalMap.jsx`: SVG blueprint of Academy sectors (A, B, C), interactive door/sensor nodes, camera cones, CCTV static filters, and СКУД telemetry deck.
  - `NonStopDebate.jsx`: Floating statement carousel (linear/wave/perspective trajectories), 6-chamber rotary Truth Bullet revolver cylinder, Weak Point hover lock-on, firing reticle, and 5-stage Truth Break AV climax (canvas glass fracture, shard explosion, "BREAK!" chromatic banner, Nagito refutation cut-in).
  - `SoundFX.js`: Web Audio API sound generator (no external audio assets; synthesizes clicks, access granted/denied, Truth Break sub-bass + shatter noise, revolver spin, laser crack, ricochet, and Monokuma two-tone alarm klaxon).
  - `Header.jsx`: Monopad status bar with server-synchronized Class Trial countdown timer (`MM:SS`) and Monokuma alarm alert trigger.
  - `VictoryScreen.jsx`: Displays solved case verdict with HMAC-SHA256 tamper-evident seal (`ST-0271-XXXX-XXXX-XXXX`) and one-click Discord ANSI/Markdown formatted report generator.
  - `Navigation.jsx` & `App.jsx`: Top-level router with tabs (`map`, `debate`, `documents`, `messages`, `journal`, `media`, `reconstruction`, `hints`).
- **Backend (`/server`)**: Node.js ES Modules Express 4 server.
  - `routes/investigation.js`:
    - `GET /api/investigation/sectors`: Serves Sector A/B/C blueprints, СКУД access logs, sensor states, and CCTV camera metadata without leaking suspect guilt.
    - `POST /api/investigation/debate/fire`: Remote zero-leak evaluation of Truth Bullet on Weak Point. Rate-limited with anti-brute-force lockout.
    - `GET /api/investigation/round-time`: Synchronized Class Trial countdown timestamp and phase.
    - `POST /api/investigation/verdict-certificate`: Generates HMAC-SHA256 cryptographic seal and Discord report.
    - `GET /api/investigation/verify-verdict`: Verification endpoint for RP game masters / Discord bots.
  - `storage.js`: Atomic JSON persistence (`case.json`, `locks.json`, `audit.json`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Interactive Tactical Map | SVG blueprint for Sector A (Server), Sector B (Workshop), Sector C (Archive) with selectable sectors, airlocks, and camera cones | M1 | ORIGINAL_REQUEST §R1 |
| 2 | СКУД Access Logs & Telemetry | Inspector panel showing timestamps, card IDs, student titles, door access events, and live thermal/motion presence sensors | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Camera CCTV Stills & Static | CCTV frame display for sector surveillance cameras (including CAM-04 glitch/static state at crime scene) | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Non-Stop Debate Floating Statements | Suspect testimonies floating across screen with dynamic trajectories, speed, and angles Danganronpa-style | M2 | ORIGINAL_REQUEST §R2 |
| 5 | Rotary Truth Bullet Cylinder | 6-chamber revolver cylinder UI with keyboard/wheel/click selection of case evidence bullets | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Weak Point Aiming & Firing | Interactive targeting reticle and Weak Point lock-on over suspicious testimony statements | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Truth Break Audiovisual Climax | Screen freeze, glass fracture canvas, shard explosion, chromatic "BREAK!" banner, and procedural sound FX on successful refutation | M2 | ORIGINAL_REQUEST §R2, §AC |
| 8 | Zero-Leak Debate Verification | Server-side validation via `POST /debate/fire`, opaque IDs, uniform DOM classes, and zero hints/answers in client code/DevTools | M2 | ORIGINAL_REQUEST §AC |
| 9 | Class Trial Header Countdown | Live countdown timer in terminal header synchronized with server round schedule | M3 | ORIGINAL_REQUEST §R3 |
| 10 | Monokuma Alarm Siren | Synthesized two-tone emergency warning siren when timer drops under critical threshold (<5 min) | M3 | ORIGINAL_REQUEST §R3 |
| 11 | Cryptographic Verdict Generator | HMAC-SHA256 tamper-evident verdict seal and one-click Discord/RP chat markdown report with verification endpoint | M3 | ORIGINAL_REQUEST §R3, §AC |
| 12 | Terminal Shell & Navigation | Navigation tabs, Nagito Komaeda commentary, Monopad CRT scanlines, and seamless tab transitions | M1, M2, M3 | ORIGINAL_REQUEST §R1-R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Suite | Requirements-driven test runner and test cases (Tiers 1-4: Map, Debate, Round Sync, Zero-Leak) | none | IN_PROGRESS |
| M1 | Tactical Map & СКУД Telemetry | Sector A, B, C SVG map, СКУД logs, presence sensors, CCTV stills, terminal integration | none | PLANNED |
| M2 | Non-Stop Debate & Truth Break | Floating statements engine, revolver cylinder, weak points, Truth Break AV sequence, zero-leak server verification | none | PLANNED |
| M3 | Round Sync & Cryptographic Verdict | Header countdown timer, synthesized Monokuma alarm, HMAC-SHA256 verdict generator, Discord report | none | PLANNED |
| FINAL | E2E 100% Pass & Adversarial Hardening | Pass all E2E tests (Tiers 1-4) + Tier 5 Challenger stress testing & Forensic Auditor integrity gate | M1, M2, M3, E2E | PLANNED |

## Interface Contracts

### 1. Tactical Map API (`/api/investigation/sectors`)
- **Method**: `GET /api/investigation/sectors`
- **Response**:
```json
{
  "sectors": {
    "A": {
      "id": "A",
      "name": "Сектор A — Серверная",
      "status": "ONLINE",
      "doors": [{ "id": "DOOR_ROOM_A", "label": "Шлюз A-1", "status": "LOCKED" }],
      "sensors": [{ "type": "motion", "status": "ACTIVE", "telemetry": "24.1°C / Одиночный сигнал" }],
      "cameras": [{ "id": "CAM_01", "name": "Серверный коридор", "status": "RECORDING" }]
    },
    "B": {
      "id": "B",
      "name": "Сектор B — Мастерская",
      "status": "ALERT",
      "doors": [{ "id": "DOOR_WORKSHOP", "label": "Мастерская Соды", "status": "UNLOCKED" }],
      "sensors": [{ "type": "thermal", "status": "NORMAL", "telemetry": "21.5°C" }],
      "cameras": [{ "id": "CAM_02", "name": "Генераторный отсек", "status": "RECORDING" }]
    },
    "C": {
      "id": "C",
      "name": "Сектор C — Архив",
      "status": "CRIME_SCENE",
      "doors": [{ "id": "DOOR_ROOM_C", "label": "Вход в Архив C-3", "status": "SEALED" }],
      "sensors": [{ "type": "motion", "status": "OFFLINE", "telemetry": "0.0°C / Сбой датчика" }],
      "cameras": [{ "id": "CAM_04", "name": "Терминал 04-271", "status": "SIGNAL_LOST", "glitch": true }]
    }
  },
  "skudLogs": [
    { "id": "LOG_01", "sector": "C", "timestamp": "21:03:12", "cardId": "CARD-AR883", "holder": "Студент #03 [К█████]", "action": "DOOR_UNLOCK" }
  ]
}
```

### 2. Zero-Leak Debate Verification (`/api/investigation/debate/fire`)
- **Method**: `POST /api/investigation/debate/fire`
- **Request**:
```json
{
  "statementId": "STMT_02",
  "weakPointId": "WP_02",
  "bulletId": "CHAT_01"
}
```
- **Response (Success)**:
```json
{
  "success": true,
  "verdict": "TRUTH_BREAK",
  "counterStatement": "«Твое алиби рушится прямо здесь! В 21:03 ты сама подтвердила, что находишься в секторе C!»",
  "nextStage": "DEBATE_RESOLVED",
  "unlockedClue": "CLUE_MAID_CONTRADICTION"
}
```
- **Response (Failure / Ricochet)**:
```json
{
  "success": false,
  "verdict": "RICOCHET",
  "message": "Улика не противоречит этому утверждению. Подумай лучше...",
  "penaltyRemaining": 4
}
```

### 3. Class Trial Round Synchronization (`/api/investigation/round-time`)
- **Method**: `GET /api/investigation/round-time`
- **Response**:
```json
{
  "roundActive": true,
  "roundDurationSeconds": 1800,
  "remainingSeconds": 842,
  "phase": "INVESTIGATION",
  "alarmThresholdSeconds": 300,
  "serverTime": "2026-09-26T20:42:00Z"
}
```

### 4. Cryptographic Verdict Report (`/api/investigation/verdict-certificate`)
- **Method**: `POST /api/investigation/verdict-certificate`
- **Request**: `{ "playerTag": "Nagito_Komaeda", "suspectId": "SUSPECT_03" }`
- **Response**:
```json
{
  "verdictCode": "ST-0271-KIRUMI-7F9B-2026",
  "hmacSeal": "a4f91c8e3b72...",
  "discordReport": "```ansi\n\u001b[1;36m[SHINRI TRIAL // ВЕРДИКТ КЛАССНОГО СУДА]\u001b[0m\n...```"
}
```

## Code Layout
- `client/src/components/TacticalMap.jsx`: SVG sector blueprint and telemetry inspector.
- `client/src/components/NonStopDebate.jsx`: Floating statement carousel, revolver cylinder, weak point reticle, Truth Break canvas.
- `client/src/components/SoundFX.js`: Web Audio synthesizers (Truth Break, alarm, revolver, gunshot, ricochet).
- `client/src/components/Header.jsx`: Round countdown timer and alarm trigger.
- `client/src/components/VictoryScreen.jsx`: Cryptographic verdict seal and Discord report formatter.
- `client/src/components/Navigation.jsx`: Tab bar with Tactical Map and Debate integrations.
- `server/routes/investigation.js`: Express endpoints for `/sectors`, `/debate/fire`, `/round-time`, `/verdict-certificate`, `/verify-verdict`.
- `server/data/case.json`: In-universe case data, sector configurations, and private truth table.
- `tests/e2e/`: Comprehensive automated E2E test suite.
