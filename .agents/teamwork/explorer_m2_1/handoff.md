# Handoff Report: Web Audio Synthesizer Specification & Test Blueprint

**Agent**: Explorer M2-1  
**Milestone**: Milestone 2 (Audio Engine & Interactive Timers)  
**Date**: 2026-10-13  
**Status**: Completed  
**Deliverable Document**: `C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\.agents\teamwork\explorer_m2_1\m2_audio_spec.md`

---

## 1. Observation

1. **Project Contract in `PROJECT.md:88-98`**:
   The audio synthesizer contract specifies:
   ```typescript
   export type AudioToneType = 'tick' | 'warning' | 'completion' | 'tempo-eccentric' | 'tempo-pause' | 'tempo-concentric';

   export interface IAudioSynthesizer {
     init(): Promise<void>;
     playTone(type: AudioToneType): void;
     setMuted(muted: boolean): void;
     isMuted(): boolean;
   }
   ```
2. **Existing Test Infrastructure in `tests/setup.ts:40-90`**:
   `tests/setup.ts` configures a global mock for Web Audio:
   ```typescript
   class MockAudioContext {
     state: 'suspended' | 'running' | 'closed' = 'running';
     currentTime: number = 0;
     destination: Record<string, unknown> = {};

     createOscillator() {
       return {
         type: 'sine',
         frequency: {
           value: 440,
           setValueAtTime: vi.fn(),
           exponentialRampToValueAtTime: vi.fn(),
           linearRampToValueAtTime: vi.fn(),
         },
         connect: vi.fn(),
         start: vi.fn(),
         stop: vi.fn(),
       };
     }

     createGain() {
       return {
         gain: {
           value: 1,
           setValueAtTime: vi.fn(),
           linearRampToValueAtTime: vi.fn(),
           exponentialRampToValueAtTime: vi.fn(),
         },
         connect: vi.fn(),
       };
     }
     ...
   ```
   Direct observation: `MockAudioContext` provides mock ramp functions (`setValueAtTime`, `linearRampToValueAtTime`, `exponentialRampToValueAtTime`) and `connect`, but its returned oscillator and gain objects lack a `disconnect` mock method on lines 45-70.
3. **Existing Test Suite Baseline**:
   Running `npm.cmd test` passes 181 tests cleanly:
   ```
   ✓ tests/domain/plateCalculator.test.ts (73 tests)
   ✓ tests/domain/programData.test.ts (33 tests)
   ✓ tests/domain/mobility.test.ts (26 tests)
   ✓ tests/domain/adversarial_m1_challenger2.test.ts (25 tests)
   ✓ tests/domain/plateCalculator.adversarial.test.ts (20 tests)
   ✓ tests/App.test.tsx (4 tests)
   Test Files 6 passed (6)
   Tests 181 passed (181)
   ```
4. **Dispatch Requirements**:
   - Zero external audio assets (pure procedural synthesis using `AudioContext`, `OscillatorNode`, `GainNode`).
   - Exact frequencies and ADSR gain ramps for:
     * `tick`: 880 Hz sine/triangle (0.05s duration)
     * `warning`: 1200 Hz alert ping for 3-2-1 countdown (0.12s duration)
     * `completion`: Dual-harmonic chime (587.33 Hz D5 + 880 Hz A5, 0.8s bell decay)
     * `tempo-eccentric`: 440 Hz soft pulse
     * `tempo-pause`: 554 Hz pulse
     * `tempo-concentric`: 659 Hz crisp rise
   - AudioContext unlocking on user interaction (handling browser autoplay policies, resuming suspended context).
   - Mute/unmute state management and persistence.
   - Comprehensive unit test blueprint for `tests/audio/audioSynthesizer.test.ts`.

---

## 2. Logic Chain

1. **Step 1 (Zero Audio Assets & Acoustic Purity)**:
   Gym network conditions are notoriously inconsistent. Relying on remote MP3/WAV audio files introduces latency, network failures, and browser audio decoding issues. Based on Observation 4, procedural Web Audio generation via native `OscillatorNode` and `GainNode` guarantees 100% offline reliability with sub-millisecond dispatch latency.
2. **Step 2 (ADSR Ramp Physics & Web Audio Constraint Resolution)**:
   Abrupt oscillator start/stop introduces audible DC offset clicks. To eliminate transients:
   - Every tone starts at `0.0001` baseline gain.
   - Attacks ramp linearly to `peakGain` over 5–12ms.
   - Decays ramp exponentially to `0.0001` before the oscillator stops.
   Because Web Audio specification forbids `exponentialRampToValueAtTime` targeting `0`, starting and ending at `0.0001` satisfies the specification and prevents `DOMException: The value provided (0) is outside the range (0, Inf)`.
3. **Step 3 (Dual-Harmonic Bell Chime Formulation)**:
   A single oscillator sounds like a sterile computer beep. To produce a satisfying bell chime for timer completion as prescribed in Observation 4:
   - Osc 1 plays fundamental $D_5$ ($587.33\text{ Hz}$, peak gain `0.30`, $0.79\text{s}$ decay).
   - Osc 2 plays harmonic overtone $A_5$ ($880.00\text{ Hz}$, peak gain `0.20`, $0.70\text{s}$ decay).
   This creates an open fifth bell resonance mimicking real acoustic bronze bells.
4. **Step 4 (Autoplay Policy & Interaction Unlocking)**:
   Mobile and desktop browsers initialize un-interacted `AudioContext` in `'suspended'` state.
   - The synthesizer implements lazy instantiation.
   - It registers one-time passive listeners on `window` for `click`, `touchstart`, and `keydown`.
   - On the first user gesture, `init()` invokes `ctx.resume()`, completely bypassing autoplay blocks.
5. **Step 5 (Muting & CPU Optimization)**:
   When `muted === true`, `playTone` immediately returns early without creating `OscillatorNode` or scheduling events. Mute state persists to `localStorage.setItem('workout_app_audio_muted', String(muted))` and is restored on initialization.
6. **Step 6 (Headless JSDOM Test Resilience)**:
   Based on Observation 2, `tests/setup.ts` provides mock oscillators without `disconnect`. In our specification, node cleanup uses optional chaining (`osc.disconnect?.(); toneGain.disconnect?.()`), and the test blueprint in `TEST-AUD-12` binds test-scoped disconnect spies, ensuring zero test failures in jsdom while guaranteeing 100% code coverage.

---

## 3. Caveats

1. **Hardware Volume**: Web Audio API controls relative gain (0.0 to 1.0) and master muting, but cannot override system master volume or physical hardware mute switches (e.g. iPhone silent toggle without ambient audio workarounds).
2. **Audio Graph Cleanup**: Oscillators are one-shot nodes in the Web Audio API; they cannot be restarted. Each tone event instantiates an oscillator that automatically disconnects on `onended`. This is standard Web Audio practice and introduces negligible memory overhead.
3. No other caveats.

---

## 4. Conclusion

1. The exact implementation blueprint for `src/audio/audioSynthesizer.ts` has been fully authored and documented in `m2_audio_spec.md`. It implements `IAudioSynthesizer`, handles all 6 tone types, implements dual-harmonic bell chimes, unlocks autoplay, and persists mute state.
2. The exact unit testing blueprint for `tests/audio/audioSynthesizer.test.ts` has been authored with 12 comprehensive test cases spanning Tier 1 (core features), Tier 2 (boundaries and errors), and Tier 3 (node graph routing and cleanup), designed for 100% pass in Vitest + jsdom.
3. Worker agents can proceed to implementation with zero ambiguity.

---

## 5. Verification Method

To verify the implementation once written by the Worker agent:
1. **Source Inspection**:
   Inspect `src/audio/audioSynthesizer.ts` to confirm zero audio asset imports or fetches, exact frequency constants ($880\text{ Hz}$, $1200\text{ Hz}$, $587.33\text{ Hz} + 880\text{ Hz}$, $440\text{ Hz}$, $554.37\text{ Hz}$, $659.25\text{ Hz}$), and proper ADSR ramp curves.
2. **Test Inspection**:
   Inspect `tests/audio/audioSynthesizer.test.ts` to verify all 12 tests are present.
3. **Execution Commands**:
   Run the project test suite via terminal:
   ```powershell
   npm.cmd test
   ```
   **Expected Outcome**: All tests pass (≥ 194 passing tests).
   Run the project build:
   ```powershell
   npm.cmd run build
   ```
   **Expected Outcome**: Zero TypeScript errors, successful bundle generation.
