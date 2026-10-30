# E2E Test Infra: 4-Day Upper/Lower Workout Web Application

## Test Philosophy
- Opaque-box, requirement-driven, zero external network dependency.
- Tested using Vitest + jsdom + @testing-library/react with fake timers for deterministic execution on Windows 11.
- Complete 4-Tier test methodology covering:
  - Tier 1: Feature Coverage (≥5 unit/functional tests per core feature)
  - Tier 2: Boundary & Corner Cases (≥5 boundary tests per feature)
  - Tier 3: Cross-Feature Combinations (pairwise interactions across timer, metronome, plate math, tracker, and storage)
  - Tier 4: Real-World Workload Scenarios (end-to-end workout session flows from warm-up to cool-down)

## Feature Inventory Coverage Matrix
| # | Feature | Tier 1 (Happy Path) | Tier 2 (Boundaries) | Tier 3 (Cross-Feature) | Tier 4 (Workload) |
|---|---------|:-------------------:|:-------------------:|:----------------------:|:-----------------:|
| F1 | Multi-Creator Routine Synthesis | 5 | 5 | ✓ | ✓ |
| F2 | Knee Tendinitis Protocols | 5 | 5 | ✓ | ✓ |
| F3 | Posterior Chain Pre-Fatigue | 5 | 5 | ✓ | ✓ |
| F4 | Creator Cue Cards | 5 | 5 | ✓ | ✓ |
| F5 | Barbell Plate Calculator (128-state) | 5 | 5 | ✓ | ✓ |
| F6 | Web Audio Synthesizer (Zero Media) | 5 | 5 | ✓ | ✓ |
| F7 | Rest Interval Countdown Timer | 5 | 5 | ✓ | ✓ |
| F8 | Marcus Filly Tempo Metronome | 5 | 5 | ✓ | ✓ |
| F9 | Routine Navigator & Session Selector| 5 | 5 | ✓ | ✓ |
| F10| Set & Rep Tracker Persistence | 5 | 5 | ✓ | ✓ |
| F11| Mobility & Flexibility Tracker | 5 | 5 | ✓ | ✓ |
| F12| Mobility Progress Visualization | 5 | 5 | ✓ | ✓ |
| F13| LocalStorage Fault Recovery | 5 | 5 | ✓ | ✓ |
| F14| Responsive Layout Integrity | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Test Runner: `npm.cmd test` / `npx.cmd vitest run --reporter=verbose`
- Execution Environment: Node.js v24.20.0, jsdom environment
- Web Audio Mocking: Synthetic AudioContext spy asserting oscillator frequency, gain ramp parameters, and zero network media fetch.
- Timer Mocking: `vi.useFakeTimers()` for microsecond-level determinism without real-time delays.
- Storage Mocking: In-memory `localStorage` polyfill with corrupted data injection harnesses.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Expected Outcome |
|---|----------|--------------------|------------------|
| 1 | Lower A Complete Knee-Bulletproofing Flow | F1, F2, F3, F4, F5, F7, F10, F13 | Complete backward walking, calf pre-fatigue, T1 Squat (225 lbs plate loaded), T2 ATG split squats with 30X1 tempo, rest intervals, sets saved. |
| 2 | Upper A Horizontal Push/Pull & Shoulder Health | F1, F4, F5, F7, F8, F10, F13 | Indian club circles, T1 Bench (185 lbs), T2 Landmine rows, Athlean-X Face Pulls with 15-30s rest-pause clusters, state persisted. |
| 3 | Lower B Posterior Chain Restoration & Hip Reset | F1, F2, F3, F4, F5, F7, F10, F11, F13 | Alyssa Lu 10-min hip reset, ATG elephant walks, T1 Deadlift, Biering-Sørensen test logged to mobility tracker, progress verified. |
| 4 | Upper B Vertical Push/Pull & Tempo Calisthenics | F1, F4, F5, F7, F8, F10, F11, F13 | Dead hangs logged to mobility tracker, T1 OHP, Pull-up ladders, Marcus Filly tempo kettlebell press with active metronome. |
| 5 | Long-Term Mobility Tracking & Fault Recovery | F11, F12, F13 | 10 simulated test entries over 30 days, verify SVG sparkline trend, simulate corrupted localStorage and verify graceful recovery. |

## Coverage Thresholds
- **Tier 1**: ≥ 5 tests per feature (minimum 40 core tests)
- **Tier 2**: ≥ 5 tests per feature (minimum 40 boundary tests)
- **Tier 3**: ≥ 10 cross-feature combination tests
- **Tier 4**: 5 realistic application-level workout workflows
- **Total Minimum Target**: ≥ 95 automated test cases passing 100% cleanly.
