/**
 * tests/timer/adversarial_m2_challenger1.test.ts
 *
 * Adversarial Stress Test Suite for Milestone 2:
 * - Rest Interval Countdown Timer Engine (src/timer/restTimer.ts)
 * - Web Audio API Synthesizer (src/audio/audioSynthesizer.ts)
 *
 * Authored by: Empirical Challenger 1 (critic/specialist)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RestTimer } from '../../src/timer/restTimer';
import { AudioSynthesizer, AudioToneType } from '../../src/audio/audioSynthesizer';
import type { TempoMetronome } from '../../src/timer/tempoMetronome';

describe('Adversarial Stress Suite — Milestone 2 (Challenger 1)', () => {
  // =========================================================================
  // SECTION 1: RAPID STATE SPAMMING
  // =========================================================================
  describe('1. Rapid State Spamming & FSM Integrity', () => {
    let timer: RestTimer;
    let mockWarning: ReturnType<typeof vi.fn>;
    let mockComplete: ReturnType<typeof vi.fn>;
    let mockPlayTone: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.useFakeTimers();
      mockWarning = vi.fn();
      mockComplete = vi.fn();
      mockPlayTone = vi.fn();

      timer = new RestTimer({
        callbacks: {
          onWarning: mockWarning,
          onComplete: mockComplete,
        },
        audioSynthesizer: {
          playTone: mockPlayTone,
        },
      });
    });

    afterEach(() => {
      timer.destroy();
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    it('survives 100 rapid start/pause/resume/reset cycles in 1 millisecond', () => {
      // Spam 100 cycles synchronously without advancing time
      for (let i = 0; i < 100; i++) {
        timer.start(60);
        timer.pause();
        timer.resume();
        timer.reset();
      }

      const snapshot = timer.getSnapshot();
      expect(snapshot.state).toBe('IDLE');
      expect(snapshot.durationSeconds).toBe(60);
      expect(snapshot.remainingSeconds).toBe(60);
      expect(snapshot.progressRatio).toBe(0.0);

      // Advance time by 10 seconds to verify no orphaned tickers or lingering timers
      vi.advanceTimersByTime(10000);

      const postAdvanceSnap = timer.getSnapshot();
      expect(postAdvanceSnap.state).toBe('IDLE');
      expect(postAdvanceSnap.remainingSeconds).toBe(60);
      expect(mockWarning).not.toHaveBeenCalled();
      expect(mockComplete).not.toHaveBeenCalled();
      expect(mockPlayTone).not.toHaveBeenCalled();
    });

    it('maintains invariants under 500 chaotic pseudo-random state transitions', () => {
      const actions = ['start', 'pause', 'resume', 'reset', 'addTime', 'tick'] as const;
      const validStates = ['IDLE', 'RUNNING', 'PAUSED', 'COMPLETED'];

      for (let i = 0; i < 500; i++) {
        const action = actions[i % actions.length];
        const randomSeconds = ((i * 17) % 180) + 1; // 1 to 180

        switch (action) {
          case 'start':
            timer.start(randomSeconds);
            break;
          case 'pause':
            timer.pause();
            break;
          case 'resume':
            timer.resume();
            break;
          case 'reset':
            timer.reset();
            break;
          case 'addTime':
            timer.addTime((i % 2 === 0 ? 1 : -1) * ((i % 15) + 1));
            break;
          case 'tick':
            vi.advanceTimersByTime(100);
            break;
        }

        const snap = timer.getSnapshot();

        // INVARIANT 1: State must always be one of the 4 defined valid states
        expect(validStates).toContain(snap.state);

        // INVARIANT 2: Remaining seconds must never be negative or NaN
        expect(snap.remainingSeconds).toBeGreaterThanOrEqual(0);
        expect(Number.isNaN(snap.remainingSeconds)).toBe(false);

        // INVARIANT 3: Progress ratio must strictly remain bounded within [0.0, 1.0]
        expect(snap.progressRatio).toBeGreaterThanOrEqual(0.0);
        expect(snap.progressRatio).toBeLessThanOrEqual(1.0);
        expect(Number.isNaN(snap.progressRatio)).toBe(false);

        // INVARIANT 4: Duration must remain strictly positive
        expect(snap.durationSeconds).toBeGreaterThanOrEqual(1);
      }
    });

    it('handles rapid consecutive addTime calls without drifting or state corruption', () => {
      timer.start(60);
      vi.advanceTimersByTime(10000); // 50s remaining

      // Rapidly burst 50 addTime adjustments (+5, -3)
      for (let i = 0; i < 50; i++) {
        timer.addTime(i % 2 === 0 ? 5 : -3);
      }

      const snap = timer.getSnapshot();
      expect(snap.state).toBe('RUNNING');
      // Net change: 25 * +5 + 25 * -3 = 125 - 75 = +50 seconds
      expect(snap.remainingSeconds).toBe(100);
      expect(snap.durationSeconds).toBe(110);
      expect(snap.progressRatio).toBeGreaterThanOrEqual(0.0);
      expect(snap.progressRatio).toBeLessThanOrEqual(1.0);
    });

    it('safely handles massive negative addTime that exceeds remaining time', () => {
      timer.start(30);
      vi.advanceTimersByTime(5000); // 25s remaining

      // Subtract 500 seconds
      timer.addTime(-500);

      const snap = timer.getSnapshot();
      expect(snap.state).toBe('COMPLETED');
      expect(snap.remainingSeconds).toBe(0);
      expect(snap.progressRatio).toBe(1.0);
      expect(mockComplete).toHaveBeenCalledTimes(1);
    });

    it('handles heavy subscriber churn during rapid state changes without memory leak or crash', () => {
      const unsubscribers: Array<() => void> = [];
      const subscriberCalls = new Map<number, number>();

      for (let i = 0; i < 50; i++) {
        const id = i;
        subscriberCalls.set(id, 0);
        const unsub = timer.subscribe(() => {
          subscriberCalls.set(id, (subscriberCalls.get(id) || 0) + 1);
        });
        unsubscribers.push(unsub);
      }

      timer.start(10);
      vi.advanceTimersByTime(500);

      // Unsubscribe half of them
      for (let i = 0; i < 25; i++) {
        unsubscribers[i]();
      }

      const callsAtHalfway = subscriberCalls.get(0)!;

      // Continue advancing
      vi.advanceTimersByTime(1000);

      // Unsubscribed listener should NOT receive further calls
      expect(subscriberCalls.get(0)).toBe(callsAtHalfway);

      // Active listener should have received additional calls
      expect(subscriberCalls.get(30)!).toBeGreaterThan(callsAtHalfway);

      // Clean up remainder
      for (let i = 25; i < 50; i++) {
        unsubscribers[i]();
      }
    });

    it('is strictly inert after destroy() is called', () => {
      timer.start(60);
      timer.destroy();

      // Subsequent method calls should safely no-op
      expect(() => {
        timer.start(30);
        timer.pause();
        timer.resume();
        timer.reset();
        timer.addTime(15);
      }).not.toThrow();

      vi.advanceTimersByTime(5000);
      expect(mockWarning).not.toHaveBeenCalled();
      expect(mockComplete).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // SECTION 2: SIMULATED BACKGROUND TAB THROTTLE & DRIFT PRECISION
  // =========================================================================
  describe('2. Background Tab Throttling & Clock Leap Precision', () => {
    let mockTime: number;
    let customTimer: RestTimer;
    let mockWarning: ReturnType<typeof vi.fn>;
    let mockComplete: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.useFakeTimers();
      mockTime = 100000;
      mockWarning = vi.fn();
      mockComplete = vi.fn();

      customTimer = new RestTimer({
        timeProvider: () => mockTime,
        callbacks: {
          onWarning: mockWarning,
          onComplete: mockComplete,
        },
      });
    });

    afterEach(() => {
      customTimer.destroy();
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    it('recovers accurately from a 60-second jump on a 45-second timer without negative values or drift', () => {
      customTimer.start(45);
      expect(customTimer.getSnapshot().remainingSeconds).toBe(45);
      expect(customTimer.getSnapshot().progressRatio).toBe(0.0);

      // Simulate browser tab sleeping for 60 seconds (exceeding 45s timer duration)
      mockTime += 60000;
      vi.advanceTimersByTime(60000);

      const snapshot = customTimer.getSnapshot();
      expect(snapshot.state).toBe('COMPLETED');
      expect(snapshot.remainingSeconds).toBe(0); // STRICT: Never -15
      expect(snapshot.progressRatio).toBe(1.0); // STRICT: Never 1.333 or NaN
      expect(mockComplete).toHaveBeenCalledTimes(1);
    });

    it('recovers cleanly from a catastrophic 1-hour (3600s) tab suspension jump', () => {
      customTimer.start(90);

      // Simulate 1 hour sleep
      mockTime += 3600 * 1000;
      vi.advanceTimersByTime(3600 * 1000);

      const snapshot = customTimer.getSnapshot();
      expect(snapshot.state).toBe('COMPLETED');
      expect(snapshot.remainingSeconds).toBe(0);
      expect(snapshot.progressRatio).toBe(1.0);
      expect(mockComplete).toHaveBeenCalledTimes(1);
    });

    it('maintains absolute zero-drift progress ratio during partial background tab throttling', () => {
      // 180s (3m Tier 2 compound rest preset)
      customTimer.start(180);

      // Simulate tab throttled in background: clock advances by 60s in one leap
      mockTime += 60000;
      vi.advanceTimersByTime(60000);

      let snapshot = customTimer.getSnapshot();
      expect(snapshot.state).toBe('RUNNING');
      expect(snapshot.remainingSeconds).toBe(120);
      // Progress ratio should be exactly 60/180 = 0.3333
      expect(snapshot.progressRatio).toBe(0.3333);

      // Another 60s leap
      mockTime += 60000;
      vi.advanceTimersByTime(60000);

      snapshot = customTimer.getSnapshot();
      expect(snapshot.remainingSeconds).toBe(60);
      // Progress ratio should be exactly 120/180 = 0.6667
      expect(snapshot.progressRatio).toBe(0.6667);

      // Final 60s leap
      mockTime += 60000;
      vi.advanceTimersByTime(60000);

      snapshot = customTimer.getSnapshot();
      expect(snapshot.state).toBe('COMPLETED');
      expect(snapshot.remainingSeconds).toBe(0);
      expect(snapshot.progressRatio).toBe(1.0);
    });

    it('re-synchronizes immediately upon visibilitychange without waiting for interval', () => {
      customTimer.start(60);

      // Advance mock time by 35s while tab is inactive
      mockTime += 35000;

      // Fire visibilitychange event
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      const snapshot = customTimer.getSnapshot();
      expect(snapshot.remainingSeconds).toBe(25);
      expect(snapshot.progressRatio).toBeCloseTo(0.5833, 3);
    });

    it('handles backward clock skew (e.g. NTP time sync jump) without negative ratio or NaN', () => {
      customTimer.start(60);
      mockTime += 10000; // 10s elapsed -> 50s left
      vi.advanceTimersByTime(10000);

      // System clock adjusts backward by 5 seconds
      mockTime -= 5000;
      vi.advanceTimersByTime(100);

      const snapshot = customTimer.getSnapshot();
      expect(snapshot.state).toBe('RUNNING');
      expect(snapshot.remainingSeconds).toBeGreaterThanOrEqual(0);
      expect(snapshot.remainingSeconds).toBeLessThanOrEqual(60);
      expect(snapshot.progressRatio).toBeGreaterThanOrEqual(0.0);
      expect(snapshot.progressRatio).toBeLessThanOrEqual(1.0);
    });
  });

  // =========================================================================
  // SECTION 3: AUDIO TRIGGER DEDUPLICATION AT BOUNDARIES
  // =========================================================================
  describe('3. Audio Trigger Deduplication at Exact Boundaries', () => {
    let timer: RestTimer;
    let mockWarning: ReturnType<typeof vi.fn>;
    let mockComplete: ReturnType<typeof vi.fn>;
    let mockPlayTone: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.useFakeTimers();
      mockWarning = vi.fn();
      mockComplete = vi.fn();
      mockPlayTone = vi.fn();

      timer = new RestTimer({
        callbacks: {
          onWarning: mockWarning,
          onComplete: mockComplete,
        },
        audioSynthesizer: {
          playTone: mockPlayTone,
        },
      });
    });

    afterEach(() => {
      timer.destroy();
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    it('ensures warning at 3s fires exactly once even when paused and resumed 100 times at the boundary', () => {
      timer.start(5);

      // Advance to 3s mark (2s elapsed)
      vi.advanceTimersByTime(2000);
      expect(mockWarning).toHaveBeenCalledWith(3);
      expect(mockWarning).toHaveBeenCalledTimes(1);
      expect(mockPlayTone).toHaveBeenCalledWith('warning');
      expect(mockPlayTone).toHaveBeenCalledTimes(1);

      // Rapidly spam pause and resume 100 times directly at the 3s boundary
      for (let i = 0; i < 100; i++) {
        timer.pause();
        timer.resume();
        vi.advanceTimersByTime(5); // tiny step within the 3s window
      }

      // Warning tone at 3s must NOT duplicate
      expect(mockWarning).toHaveBeenCalledTimes(1);
      expect(mockPlayTone).toHaveBeenCalledTimes(1);
    });

    it('ensures warnings at 2s and 1s fire exactly once during boundary pause/resume stress', () => {
      timer.start(5);
      vi.advanceTimersByTime(2000); // 3s left (warning 3 fires)

      // Advance to 2s left
      vi.advanceTimersByTime(1000);
      expect(mockWarning).toHaveBeenCalledWith(2);
      expect(mockWarning).toHaveBeenCalledTimes(2); // total warnings (3 and 2)

      // Stress pause/resume at 2s
      for (let i = 0; i < 50; i++) {
        timer.pause();
        timer.resume();
        vi.advanceTimersByTime(10);
      }
      expect(mockWarning).toHaveBeenCalledTimes(2);

      // Advance to 1s left (advancing 600ms to allow discrete 100ms ticker to sample <= 1000ms)
      vi.advanceTimersByTime(600);
      expect(mockWarning).toHaveBeenCalledWith(1);
      expect(mockWarning).toHaveBeenCalledTimes(3); // total warnings (3, 2, and 1)

      // Stress pause/resume at 1s
      for (let i = 0; i < 50; i++) {
        timer.pause();
        timer.resume();
        vi.advanceTimersByTime(10);
      }
      expect(mockWarning).toHaveBeenCalledTimes(3);
    });

    it('ensures completion at 0s fires strictly once and never duplicates under pause/resume at zero', () => {
      timer.start(4);
      vi.advanceTimersByTime(4000); // Reaches 0s

      expect(mockComplete).toHaveBeenCalledTimes(1);
      expect(mockPlayTone).toHaveBeenCalledWith('completion');

      // Attempt to pause/resume or re-evaluate at completed state
      for (let i = 0; i < 50; i++) {
        timer.pause();
        timer.resume();
      }

      expect(mockComplete).toHaveBeenCalledTimes(1);
      // 'completion' tone should only have been requested once
      const completionToneCalls = mockPlayTone.mock.calls.filter(c => c[0] === 'completion');
      expect(completionToneCalls).toHaveLength(1);
    });

    it('handles short countdowns starting <= 3s without spurious warning triggers', () => {
      // Start a 2-second timer
      timer.start(2);

      // Warning at 3s should NEVER fire
      vi.advanceTimersByTime(500); // 1.5s left -> remainingSeconds is 2
      expect(mockWarning).toHaveBeenCalledWith(2);
      expect(mockWarning).not.toHaveBeenCalledWith(3);

      vi.advanceTimersByTime(1000); // 0.5s left -> remainingSeconds is 1
      expect(mockWarning).toHaveBeenCalledWith(1);

      vi.advanceTimersByTime(500); // 0s left
      expect(mockComplete).toHaveBeenCalledTimes(1);
      expect(mockWarning).not.toHaveBeenCalledWith(3);
    });

    it('re-arms warning tones if timer is extended with addTime past 3 seconds', () => {
      timer.start(5);
      vi.advanceTimersByTime(4000); // 1s left (warnings 3, 2, 1 have all fired)
      expect(mockWarning).toHaveBeenCalledTimes(3);

      // Extend timer by 15s -> remaining time becomes 16s
      timer.addTime(15);
      expect(timer.getSnapshot().remainingSeconds).toBe(16);

      // Advance 13s -> reaches 3s left again
      vi.advanceTimersByTime(13000);
      expect(timer.getSnapshot().remainingSeconds).toBe(3);

      // Warning 3 should fire again for the extended countdown
      expect(mockWarning).toHaveBeenCalledTimes(4); // 3 original + 1 new for second pass
    });

    it('handles skipping boundaries completely in a single clock leap without crashing', () => {
      timer.start(10);

      // Leap directly from 6s left to 0s left, bypassing 3, 2, 1
      vi.advanceTimersByTime(10000);

      expect(mockComplete).toHaveBeenCalledTimes(1);
      expect(mockPlayTone).toHaveBeenCalledWith('completion');
      // No unhandled errors or stale bursts
    });
  });

  // =========================================================================
  // SECTION 4: MUTE STATE STRESS & AUDIO CONTEXT LEAKAGE
  // =========================================================================
  describe('4. Mute State Stress & AudioContext Safety', () => {
    let synthesizer: AudioSynthesizer;

    beforeEach(() => {
      localStorage.clear();
      synthesizer = new AudioSynthesizer();
    });

    afterEach(() => {
      localStorage.clear();
      vi.clearAllMocks();
    });

    it('survives rapid mute toggling (200 times in 1ms) and retains consistent state', () => {
      for (let i = 0; i < 200; i++) {
        synthesizer.setMuted(i % 2 === 0);
      }

      // Final iteration i=199 (odd) -> setMuted(false)
      expect(synthesizer.isMuted()).toBe(false);
      expect(localStorage.getItem('workout_app_audio_muted')).toBe('false');

      // One more toggle to true
      synthesizer.setMuted(true);
      expect(synthesizer.isMuted()).toBe(true);
      expect(localStorage.getItem('workout_app_audio_muted')).toBe('true');
    });

    it('guarantees zero sound leakage (zero oscillators or gain nodes) when muted', async () => {
      await synthesizer.init();
      const ctx = synthesizer.getAudioContext() as any;
      const oscSpy = vi.spyOn(ctx, 'createOscillator');
      const gainSpy = vi.spyOn(ctx, 'createGain');

      synthesizer.setMuted(true);

      const allToneTypes: AudioToneType[] = [
        'tick',
        'warning',
        'completion',
        'tempo-eccentric',
        'tempo-pause',
        'tempo-concentric',
      ];

      // Spam playTone across all tone types 20 times each while muted
      for (let i = 0; i < 20; i++) {
        for (const tone of allToneTypes) {
          synthesizer.playTone(tone);
        }
      }

      // STRICT EMPIRICAL VERIFICATION: Exactly 0 oscillators and 0 tone gains created
      expect(oscSpy).not.toHaveBeenCalled();
      expect(gainSpy).not.toHaveBeenCalled();
    });

    it('toggles muted during active dual-harmonic playback without AudioContext exceptions', async () => {
      await synthesizer.init();
      const ctx = synthesizer.getAudioContext() as any;

      // Start long completion chime (0.8s dual harmonic)
      expect(() => {
        synthesizer.playTone('completion');
      }).not.toThrow();

      // Immediately toggle mute on/off while tone is active
      expect(() => {
        synthesizer.setMuted(true);
        synthesizer.setMuted(false);
        synthesizer.setMuted(true);
      }).not.toThrow();

      // Ensure subsequent calls respect mute state
      const oscSpy = vi.spyOn(ctx, 'createOscillator');
      synthesizer.playTone('tick');
      expect(oscSpy).not.toHaveBeenCalled();
    });

    it('handles localStorage SecurityError (e.g. private browsing mode) gracefully', () => {
      const origSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      });

      // Should not throw even when localStorage throws
      expect(() => synthesizer.setMuted(true)).not.toThrow();
      expect(synthesizer.isMuted()).toBe(true);

      localStorage.setItem = origSetItem;
    });

    it('handles multiple concurrent init() invocations cleanly without duplicate contexts', async () => {
      const initPromises = Array.from({ length: 10 }, () => synthesizer.init());
      await expect(Promise.all(initPromises)).resolves.not.toThrow();

      const ctx = synthesizer.getAudioContext();
      expect(ctx).toBeDefined();
      expect(ctx?.state).toBe('running');
    });

    it('recovers cleanly when AudioContext is in suspended state upon playTone', async () => {
      await synthesizer.init();
      const ctx = synthesizer.getAudioContext() as any;
      ctx.state = 'suspended';

      // playTone should invoke ctx.resume()
      const resumeSpy = vi.spyOn(ctx, 'resume');
      synthesizer.playTone('warning');

      expect(resumeSpy).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // SECTION 5: INTEGRATION OF REST TIMER WITH AUDIO SYNTHESIZER
  // =========================================================================
  describe('5. Dual Engine End-to-End Adversarial Coupling', () => {
    let timer: RestTimer;
    let synthesizer: AudioSynthesizer;

    beforeEach(async () => {
      vi.useFakeTimers();
      localStorage.clear();
      synthesizer = new AudioSynthesizer();
      await synthesizer.init();

      timer = new RestTimer({
        audioSynthesizer: synthesizer,
      });
    });

    afterEach(() => {
      timer.destroy();
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    it('executes full countdown lifecycle through real AudioSynthesizer and respects mute toggle mid-flight', () => {
      const ctx = synthesizer.getAudioContext() as any;
      const oscSpy = vi.spyOn(ctx, 'createOscillator');

      // Start 5-second countdown
      timer.start(5);

      // Advance to 3s -> warning fires
      vi.advanceTimersByTime(2000);
      expect(oscSpy).toHaveBeenCalledTimes(1); // 1 osc for 1200Hz warning

      // User mutes the app at 2.5s
      vi.advanceTimersByTime(500);
      synthesizer.setMuted(true);

      // Advance to 2s, 1s, and 0s (completion)
      vi.advanceTimersByTime(2500);

      // Since app was muted, NO additional oscillators should have been created for 2s, 1s, or 0s!
      expect(oscSpy).toHaveBeenCalledTimes(1); // Still exactly 1 from the 3s warning before mute
      expect(timer.getSnapshot().state).toBe('COMPLETED');
    });
  });

  // =========================================================================
  // SECTION 6: TEMPO METRONOME ADVERSARIAL CADENCE STRESS
  // =========================================================================
  describe('6. Tempo Metronome Adversarial Stress', () => {
    let metronome: TempoMetronome;
    let mockSynth: { playTone: ReturnType<typeof vi.fn> };
    let mockPhaseChange: ReturnType<typeof vi.fn>;
    let mockRepComplete: ReturnType<typeof vi.fn>;
    let mockSetComplete: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      vi.useFakeTimers();
      mockSynth = { playTone: vi.fn() };
      mockPhaseChange = vi.fn();
      mockRepComplete = vi.fn();
      mockSetComplete = vi.fn();

      const { TempoMetronome } = await import('../../src/timer/tempoMetronome');
      metronome = new TempoMetronome({
        audioSynthesizer: mockSynth as any,
        soundEnabled: true,
      });
      metronome.onPhaseChange(mockPhaseChange);
      metronome.onRepComplete(mockRepComplete);
      metronome.onSetComplete(mockSetComplete);
    });

    afterEach(() => {
      metronome.destroy();
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    it('rejects malformed and zero-duration tempo strings without entering invalid state', async () => {
      const { parseTempo, tryParseTempo } = await import('../../src/timer/tempoMetronome');

      const malformedInputs = [
        '',
        '   ',
        '0000', // total duration 0
        '30X', // 3 digits
        '30X12', // 5 digits
        'ABCD', // letters
        '+3011', // leading non-hyphen sign
        '3.5011', // decimal
      ];

      for (const input of malformedInputs) {
        expect(() => parseTempo(input)).toThrow();
        const res = tryParseTempo(input);
        expect(res.success).toBe(false);
        expect(res.error).toBeDefined();
      }
    });

    it('survives rapid start/pause/resume/stop spamming 100 times in 1 millisecond', () => {
      for (let i = 0; i < 100; i++) {
        metronome.start('30X1', 5);
        metronome.pause();
        metronome.resume();
        metronome.stop();
      }

      const snap = metronome.getSnapshot();
      expect(snap.state).toBe('STOPPED');
      expect(snap.currentRep).toBe(1);
      expect(snap.isRunning).toBe(false);

      // Advance time to verify no dangling timers
      vi.advanceTimersByTime(5000);
      expect(mockPhaseChange).toHaveBeenCalled();
      expect(mockSetComplete).not.toHaveBeenCalled();
    });

    it('bypasses zero-duration phases instantly without infinite loops or timing delays', () => {
      // 4010: eccentric 4s, pauseBottom 0s, concentric 1s, pauseTop 0s
      metronome.start('4010', 2);

      expect(metronome.getSnapshot().currentPhase).toBe('eccentric');
      expect(metronome.getSnapshot().phaseTotalSeconds).toBe(4);

      // Advance 4s -> eccentric finishes -> should instantly bypass pauseBottom (0s) and enter concentric
      vi.advanceTimersByTime(4050);

      expect(metronome.getSnapshot().currentPhase).toBe('concentric');
      expect(metronome.getSnapshot().phaseTotalSeconds).toBe(1);

      // Advance 1s -> concentric finishes -> should instantly bypass pauseTop (0s), complete rep 1, and enter eccentric of rep 2
      vi.advanceTimersByTime(1050);

      expect(mockRepComplete).toHaveBeenCalledWith(1, 2);
      expect(metronome.getSnapshot().currentRep).toBe(2);
      expect(metronome.getSnapshot().currentPhase).toBe('eccentric');
    });

    it('completes exact target reps and triggers completion chime cleanly', () => {
      // 2010: 2s eccentric + 0s pause + 1s concentric + 0s pause = 3s per rep
      metronome.start('2010', 3); // 3 reps = 9s total

      vi.advanceTimersByTime(3100); // Rep 1 complete
      expect(mockRepComplete).toHaveBeenCalledWith(1, 3);

      vi.advanceTimersByTime(3100); // Rep 2 complete
      expect(mockRepComplete).toHaveBeenCalledWith(2, 3);

      vi.advanceTimersByTime(3100); // Rep 3 complete
      expect(mockRepComplete).toHaveBeenCalledWith(3, 3);
      expect(mockSetComplete).toHaveBeenCalledWith(3);
      expect(mockSynth.playTone).toHaveBeenCalledWith('completion');
      expect(metronome.getSnapshot().state).toBe('STOPPED');
    });
  });
});
