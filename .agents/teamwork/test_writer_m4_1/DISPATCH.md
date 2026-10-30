## 2026-10-13T16:52:49Z

You are the Dedicated E2E Test Writer for Milestone 4 (Final Milestone: 100% Test Pass & Hardening) of the 4-Day Upper/Lower Workout Web Application project.

Working Directory: C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\.agents\teamwork\test_writer_m4_1
Project Root: C:\Users\lagoo\.gemini\antigravity\scratch\workout_program
Parent Orchestrator Conversation ID: cb602ec0-e284-415a-81f8-951ad7b01fdb

CRITICAL INSTRUCTIONS:
- Read C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\.agents\teamwork\ORIGINAL_REQUEST.md immediately.
- Read C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\.agents\teamwork\PROJECT.md immediately.
- Read C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\.agents\teamwork\TEST_INFRA.md immediately.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You have write ownership of the E2E test suites and test ready signal:
- tests/e2e/tier1_features.test.tsx
- tests/e2e/tier2_boundaries.test.tsx
- tests/e2e/tier3_combinations.test.tsx
- tests/e2e/tier4_application.test.tsx
- TEST_READY.md (at project root)

TASK REQUIREMENTS:
1. Implement `tests/e2e/tier1_features.test.tsx`:
   - Enforce opaque-box requirement-driven testing for all 14 features from PROJECT.md Feature Inventory (F1 to F14).
   - Test routines, knee tendinitis protocols (3-4s eccentrics, pre-fatigue, pain-free regressions), creator cues, 128-state plate math, audio synthesis, timer countdowns, tempo metronome, session navigator, set/rep logging, mobility tracker, sparklines, storage, and responsive layout.
2. Implement `tests/e2e/tier2_boundaries.test.tsx`:
   - Test boundaries, zero/empty states, maximum loads (300 lbs), bar-only (45 lbs), 0s timers, rapid tab switching, corrupted storage injection, and boundary mobility inputs.
3. Implement `tests/e2e/tier3_combinations.test.tsx`:
   - Test cross-feature pairwise interactions: active timer during session change, plate calculator launched while logging sets, tempo metronome running while logging reps, audio mute persistence during workouts.
4. Implement `tests/e2e/tier4_application.test.tsx`:
   - Test the 5 full real-world workout application scenarios from TEST_INFRA.md:
     * Scenario 1: Lower A complete knee-bulletproofing flow
     * Scenario 2: Upper A horizontal push/pull & shoulder health
     * Scenario 3: Lower B posterior chain restoration & hip reset
     * Scenario 4: Upper B vertical push/pull & tempo calisthenics
     * Scenario 5: Long-term mobility tracking & storage fault recovery
5. Verify test execution:
   - Run `npx.cmd vitest run tests/e2e`
   - Run global tests: `npx.cmd vitest run`
   - Ensure 100% test pass rate with exit code 0.
6. Publish `TEST_READY.md` at project root documenting runner command (`npm.cmd test`), coverage summary by tier, and feature checklist.
7. Deliver `handoff.md` in your working directory.
8. Send completion message to Parent Orchestrator (cb602ec0-e284-415a-81f8-951ad7b01fdb).
