# Master Orchestration Plan: 4-Day Upper/Lower Workout Web Application

## Objective
Build and verify an interactive, responsive web application for a personalized 4-Day Upper/Lower workout program synthesizing 8 fitness creators and GZCL methodology, complete with rest timer engine, Marcus Filly tempo metronome, plate loading calculator, LocalStorage state persistence, and full test suite.

## Execution Pattern: Project Pattern (Dual Track)

### Phase 0: Survey & Technical Mapping
- Dispatch 3 Explorers in parallel:
  1. **Explorer 1 (Biomechanics & Routine Specification)**: Deeply analyze the 8 creators' rules, GZCL Tiers (T1/T2/T3), exact 4-day workouts (Lower A, Upper A, Lower B, Upper B), exercise progressions, regressions for knee tendinitis, cue cards, and tempo definitions.
  2. **Explorer 2 (Web Architecture & Interactive Engines)**: Survey optimal web architecture (HTML5/ES Modules/Tailwind/Vanilla JS or React/Vite depending on zero-config/lightweight requirements, audio synthesis via Web Audio API, LocalStorage schema, plate loading calculator algorithm). Check GitHub/open-source patterns.
  3. **Explorer 3 (Testing Infrastructure & Coverage Strategy)**: Survey testing frameworks suitable for Windows/Node (e.g., Vitest/Jest/Playwright), defining test harnesses for timer countdowns, Web Audio triggers, state persistence, plate loading edge cases, and 4-tier E2E testing strategy.

### Phase 1: Synthesis & Project Specification
- Aggregate Explorer findings into `PROJECT.md` (Architecture, Feature Inventory, Milestones, Code Layout, Interface Contracts) and `TEST_INFRA.md`.

### Phase 2: Dual Track Execution
- **Track A (Implementation Track)**:
  - Milestone 1: Core Domain Engine & Data Models (Workout program data, GZCL calculation, plate loader algorithm, tempo models).
  - Milestone 2: Interactive Timer, Audio Chime Engine & Tempo Metronome.
  - Milestone 3: Full UI, Routine Navigator, Set/Rep Tracker, Cue Cards, and LocalStorage Persistence.
  - Milestone 4: Final Milestone (100% E2E test pass + Tier 5 adversarial hardening).
- **Track B (E2E Testing Track)**:
  - Design & implement comprehensive automated test suite (Tiers 1-4) covering all features from Feature Inventory.
  - Publish `TEST_READY.md`.

### Phase 3: Final Verification & Sentinel Delivery
- Review all test reports, verify gate criteria, run forensic audit, confirm zero regressions.
- Deliver completion report to Sentinel (`228952e7-9013-4a28-b746-188527de71b8`).
