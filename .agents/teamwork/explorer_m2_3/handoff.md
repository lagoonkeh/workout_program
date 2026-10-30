# Handoff Report: Marcus Filly Tempo Metronome Engine (`handoff.md`)
**Agent**: Explorer M2-3 (Tempo Metronome Engine)  
**Milestone**: Milestone 2 (Audio Engine & Interactive Timers)  
**Recipient**: Parent Orchestrator (`cb602ec0-e284-415a-81f8-951ad7b01fdb`)  
**Date**: October 13, 2026  
**Type**: Hard Handoff (Investigation & Specification Complete)  

---

## 1. Observation

1. **Tempo Prescriptions in Domain Model**:
   - Inspection of `src/domain/programData.ts` reveals multiple Marcus Filly 4-digit tempo cadences across the 4-day workout routines:
     - Line 109: `tempo: '3012'` (Eugene Teo Standing Calf Raise)
     - Line 119: `tempo: '3110'` (Eugene Teo Light KB Romanian Hinge)
     - Line 154: `tempo: '31X1'` (T1 Barbell Back Squat)
     - Line 190: `tempo: '4010'` (Tier 2 Landmine Hack Squat regression)
     - Line 200: `tempo: '2011'` (T3 Tibialis Wall Raise)
     - Line 287: `tempo: '30X1'` (T1 Barbell Bench Press & T3 Single-Arm KB Press)
     - Line 349: `tempo: '2112'` (T3 Athlean-X Face Pulls)
2. **Interface Contracts in `PROJECT.md`**:
   - `PROJECT.md` lines 121–141 defines the contract for `src/timer/tempoMetronome.ts`:
     ```typescript
     export type TempoPhase = 'eccentric' | 'pauseBottom' | 'concentric' | 'pauseTop';
     export interface TempoParsed {
       eccentric: number;
       pauseBottom: number;
       concentric: number; // explosive 'X' treated as 1s active drive
       pauseTop: number;
       totalDuration: number;
     }
     export interface MetronomeSnapshot {
       isRunning: boolean;
       tempo: string;
       currentPhase: TempoPhase;
       phaseRemainingSeconds: number;
       phaseTotalSeconds: number;
       currentRep: number;
     }
     ```
   - `PROJECT.md` lines 88–98 defines `AudioToneType`:
     ```typescript
     export type AudioToneType = 'tick' | 'warning' | 'completion' | 'tempo-eccentric' | 'tempo-pause' | 'tempo-concentric';
     ```
3. **Dispatch Requirements**:
   - Exact implementation blueprint for `src/timer/tempoMetronome.ts`:
     - 4-digit parsing: e.g. "30X1", "31X1", "4010", "2011".
     - State machine: `STOPPED`, `ACTIVE`, `PAUSED`.
     - Rep counter and phase tracking: `eccentric`, `pauseBottom`, `concentric`, `pauseTop`.
     - Phase progress ratio calculation for synchronized visual ring/bar animation.
     - Synchronized audio pings hooked into audio synthesizer for phase changes and second beats.
   - Unit testing blueprint for `tests/timer/tempoMetronome.test.ts` with Vitest fake timers.
4. **Current Test Suite Execution**:
   - Command `npm.cmd test` executed cleanly with 181 tests passing in 1.69 seconds across 6 test files (`tests/domain/*.test.ts`, `tests/App.test.tsx`).

---

## 2. Logic Chain

1. **Parsing Logic (from Observation 1 & 3)**:
   - Tempos are 4-character strings $[E][P_B][C][P_T]$ where $C \in [0-9] \cup \{'X', 'x'\}$.
   - When $C$ is `'X'` or `'x'`, it represents explosive concentric intent, modeled as 1 second of active drive.
   - Total duration per rep is the mathematical sum $E + P_B + C + P_T$.
   - A robust regex `/^([0-9])([0-9])([0-9xX])([0-9])$/` sanitizes spaces and hyphens while validating inputs. Both a throwing `parseTempo()` and safe `tryParseTempo()` provide flexibility for the domain and UI.
2. **Phase Execution & Zero-Duration Skipping (from Observation 1 & 2)**:
   - When a phase has a duration of 0 seconds (e.g. `pauseBottom = 0` in `30X1` or `pauseTop = 0` in `4010`), the state machine must transition immediately without pausing for an interval tick.
   - Advancing phases sequentially through `['eccentric', 'pauseBottom', 'concentric', 'pauseTop']` with a skip loop ensures exact cadence matching.
3. **Drift-Free Precision Timing (from Observation 3 & 4)**:
   - Relying on simple tick counters drifts over time in JavaScript.
   - Instead, the engine records `phaseStartTime = performance.now()` upon entering each phase and evaluates `elapsedMs = performance.now() - phaseStartTime` on each tick (50ms interval).
   - Pausing stores `phaseElapsedPausedMs = performance.now() - phaseStartTime` and resumption offsets `phaseStartTime = performance.now() - phaseElapsedPausedMs`, maintaining sub-millisecond continuity.
4. **Visual Animation Telemetry (from Observation 3)**:
   - Modern SVG rings and expanding bars require continuous progress ratios.
   - Calculating `phaseProgressRatio = elapsedMs / phaseDurationMs` (clamped to $[0.0, 1.0]$) and `repProgressRatio = (priorPhasesMs + elapsedMs) / totalRepMs` provides 60 FPS animation telemetry.
5. **Decoupled Audio Synthesizer Hookup (from Observation 2 & 3)**:
   - Hooking directly into `IAudioSynthesizer` with tone types `'tempo-eccentric'`, `'tempo-pause'`, `'tempo-concentric'`, `'tick'`, and `'completion'` allows procedural audio generation without audio asset downloads.
6. **Vitest Unit Test Blueprint (from Observation 3 & 4)**:
   - Using `vi.useFakeTimers()` and `vi.advanceTimersByTime(ms)` provides deterministic, ultra-fast test execution for all state transitions, zero-duration skipping, rep counts, and audio mocks.

---

## 3. Caveats

1. **Web Audio Context Autoplay Policy**:
   - The tempo metronome does not directly create `AudioContext`; it calls `IAudioSynthesizer.playTone()`. Autoplay unlocking must be handled by `audioSynthesizer.ts` or user interaction before audio output will be audible.
2. **Infinite Mode vs Target Reps**:
   - When `targetReps` is 0 or omitted, the metronome runs continuously until manually paused or stopped. When `targetReps > 0`, it automatically finishes and transitions to `STOPPED` upon completing the final rep.
3. **Browser Tab Sleep**:
   - If the metronome tab is backgrounded on mobile, browser `setInterval` may throttle. Because timestamps use `performance.now()`, the metronome will self-correct its phase and rep count upon returning to focus.

---

## 4. Conclusion

The specification report `m2_metronome_spec.md` delivers the complete, production-ready implementation and unit testing blueprint for `src/timer/tempoMetronome.ts` and `tests/timer/tempoMetronome.test.ts`.

Key deliverables included in `m2_metronome_spec.md`:
1. Full TypeScript source code for `src/timer/tempoMetronome.ts` featuring:
   - `parseTempo` & `tryParseTempo` with support for all 7 project tempos.
   - Deterministic 3-state FSM (`STOPPED`, `ACTIVE`, `PAUSED`).
   - Zero-duration phase bypassing.
   - Sub-second timestamp delta tracking via `performance.now()`.
   - Continuous visual progress ratios (`phaseProgressRatio`, `repProgressRatio`).
   - Decoupled `IAudioSynthesizer` integration.
   - Pub/sub subscriber model and event callbacks (`onPhaseChange`, `onRepComplete`, `onSetComplete`).
2. Full Vitest test suite for `tests/timer/tempoMetronome.test.ts` containing 8 suites and 18 test cases.
3. React hook `useTempoMetronome` and UI component blueprint for Milestone 3.

---

## 5. Verification Method

To independently verify the implementation once applied by the Worker agent:
1. **Target Files to Inspect**:
   - `C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\.agents\teamwork\explorer_m2_3\m2_metronome_spec.md`
   - Future implementation file: `src/timer/tempoMetronome.ts`
   - Future test file: `tests/timer/tempoMetronome.test.ts`
2. **Automated Test Verification Command**:
   ```powershell
   npm.cmd test
   ```
   Or targeting the metronome specifically:
   ```powershell
   npx.cmd vitest run tests/timer/tempoMetronome.test.ts
   ```
3. **Invalidation Conditions**:
   - Any test failure in `tempoMetronome.test.ts`.
   - Zero-duration phases taking >0ms in simulated time.
   - Failure to trigger `'tempo-concentric'` when entering concentric phase.
   - Drift in phase remaining seconds after pause/resume cycle.
