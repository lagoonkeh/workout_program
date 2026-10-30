## 2026-10-13T05:58:46Z
You are the Implementation Worker for Milestone 2 (Audio Engine & Interactive Timers) of the 4-Day Upper/Lower Workout Web Application project.

Working Directory: C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\.agents\teamwork\worker_m2_1
Project Root: C:\Users\lagoo\.gemini\antigravity\scratch\workout_program
Parent Orchestrator Conversation ID: cb602ec0-e284-415a-81f8-951ad7b01fdb

CRITICAL INSTRUCTION - READ IMMEDIATELY:
Read C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\.agents\teamwork\ORIGINAL_REQUEST.md before starting work.
Also read:
- C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\.agents\teamwork\PROJECT.md
- C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\.agents\teamwork\TEST_INFRA.md
- C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\.agents\teamwork\explorer_m2_1\m2_audio_spec.md
- C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\.agents\teamwork\explorer_m2_2\m2_timer_spec.md
- C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\.agents\teamwork\explorer_m2_3\m2_metronome_spec.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You have exclusive write ownership of the following files:
1. Audio Engine:
   - src/audio/audioSynthesizer.ts
   - tests/audio/audioSynthesizer.test.ts
2. Rest Timer Engine:
   - src/timer/restTimer.ts
   - tests/timer/restTimer.test.ts
3. Marcus Filly Tempo Metronome:
   - src/timer/tempoMetronome.ts
   - tests/timer/tempoMetronome.test.ts

Implementation Instructions:
1. Implement `src/audio/audioSynthesizer.ts` according to Explorer M2-1's blueprint:
   - Pure procedural Web Audio API synthesis (AudioContext, OscillatorNode, GainNode; zero external audio files).
   - Exact frequencies and ADSR gain ramps for tick (880Hz), warning (1200Hz), completion (dual-harmonic 587.33/880Hz chime), and tempo tones (440Hz, 554.37Hz, 659.25Hz).
   - AudioContext unlocking on interaction ('click', 'touchstart', 'keydown') and mute state persistence in LocalStorage ('workout_app_audio_muted').
2. Implement `src/timer/restTimer.ts` according to Explorer M2-2's blueprint:
   - Deterministic 4-state machine (`IDLE`, `RUNNING`, `PAUSED`, `COMPLETED`).
   - Drift-free `performance.now()` delta timing combined with an inline Blob Web Worker ticker for background tabs, with graceful jsdom fallback.
   - Preset catalog (15s/30s ER, 60s/90s T3, 120s/180s T2, 240s/300s T1) and dynamic `addTime(seconds)`.
   - Subscriber pub/sub model for snapshots and audio event triggers (3-2-1 warning, 0 completion).
3. Implement `src/timer/tempoMetronome.ts` according to Explorer M2-3's blueprint:
   - 4-digit tempo cadence parsing (e.g. "30X1", "31X1", "4010", "2011"), treating explosive 'X' as 1s active drive.
   - Deterministic FSM (`STOPPED`, `ACTIVE`, `PAUSED`), instant zero-duration phase skipping, and rep accumulation.
   - Continuous progress telemetry (`phaseProgressRatio`, `repProgressRatio`, `isExplosive`) for SVG visual pacing rings.
   - Seamless procedural audio synthesizer hookup mapped to `IAudioSynthesizer`.
4. Implement all unit test suites in `tests/audio/audioSynthesizer.test.ts`, `tests/timer/restTimer.test.ts`, and `tests/timer/tempoMetronome.test.ts`.
5. Execute verification commands:
   - `npx.cmd vitest run tests/audio tests/timer`
   - `npm.cmd run build` (or `npx.cmd tsc --noEmit && npx.cmd vite build`)
   - `npx.cmd vitest run` (ensure all tests including domain and new audio/timer pass 100%).

Deliverables:
- Write a structured handoff.md in your working directory (C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\.agents\teamwork\worker_m2_1\handoff.md) following the Handoff Protocol.
- Send a completion message to Parent Orchestrator (cb602ec0-e284-415a-81f8-951ad7b01fdb).
