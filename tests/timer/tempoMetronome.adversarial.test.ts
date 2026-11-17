/**
 * tests/timer/tempoMetronome.adversarial.test.ts
 *
 * Empirical Adversarial Stress & Invariant Test Suite for Tempo Metronome.
 * Designed to challenge edge cases, fuzz inputs, verify invariant guarantees,
 * and test zero-duration phase skipping, rep accumulation, and telemetry math.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TempoMetronome,
  parseTempo,
  tryParseTempo,
  IAudioSynthesizer,
  TempoPhase,
} from '../../src/timer/tempoMetronome';

describe('Adversarial Challenge: Tempo Metronome', { timeout: 30000 }, () => {
  let mockSynth: IAudioSynthesizer;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSynth = {
      init: vi.fn().mockResolvedValue(undefined),
      playTone: vi.fn(),
      setMuted: vi.fn(),
      isMuted: vi.fn().mockReturnValue(false),
      getAudioContext: vi.fn().mockReturnValue(null),
    };
  }, 30000);

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  }, 30000);

  // =========================================================================
  // SECTION 1: TEMPO STRING FUZZING & PARSER RESILIENCE
  // =========================================================================
  describe('1. Adversarial Tempo String Fuzzing', () => {
    const strictlyInvalidFuzzInputs = [
      { input: '30X', desc: 'Too short (3 chars)' },
      { input: '30X12', desc: 'Too long (5 chars)' },
      { input: 'abcd', desc: 'Alphabetical characters' },
      { input: '', desc: 'Empty string' },
      { input: null as unknown as string, desc: 'Null value' },
      { input: undefined as unknown as string, desc: 'Undefined value' },
      { input: '0000', desc: 'Zero total duration' },
      { input: '   ', desc: 'Whitespace only' },
      { input: '3-0-X', desc: 'Incomplete with hyphens (3 digits)' },
      { input: '3.0X1', desc: 'Decimal point' },
      { input: '30Y1', desc: 'Invalid letter Y' },
      { input: '30Z1', desc: 'Invalid letter Z' },
      { input: '30#1', desc: 'Special character #' },
      { input: '30 1', desc: 'Missing 3rd digit' },
      { input: '🔥0X1', desc: 'Emoji in string' },
      { input: 1234 as unknown as string, desc: 'Numeric type instead of string' },
      { input: {} as unknown as string, desc: 'Object instead of string' },
      { input: [] as unknown as string, desc: 'Array instead of string' },
    ];

    strictlyInvalidFuzzInputs.forEach(({ input, desc }) => {
      it(`parseTempo rejects invalid fuzz input: "${String(input)}" (${desc})`, () => {
        expect(() => parseTempo(input)).toThrow();
      });

      it(`tryParseTempo gracefully fails on: "${String(input)}" (${desc})`, () => {
        const result = tryParseTempo(input);
        expect(result.success).toBe(false);
        expect(typeof result.error).toBe('string');
        expect(result.data).toBeUndefined();
      });
    });

    it('sanitizes bulleted or hyphen-prefixed list input (e.g. "-30X1") cleanly', () => {
      // Due to .replace(/[\s-]/g, ''), bulleted markdown list formats like "-30X1" are tolerated
      const parsed = parseTempo('-30X1');
      expect(parsed.raw).toBe('30X1');
      expect(parsed.eccentric).toBe(3);
      expect(parsed.concentric).toBe(1);
    });

    it('parses boundary valid tempo "00X0" correctly (1s explosive concentric only)', () => {
      const parsed = parseTempo('00X0');
      expect(parsed.eccentric).toBe(0);
      expect(parsed.pauseBottom).toBe(0);
      expect(parsed.concentric).toBe(1);
      expect(parsed.pauseTop).toBe(0);
      expect(parsed.isConcentricExplosive).toBe(true);
      expect(parsed.totalDuration).toBe(1);
      expect(parsed.raw).toBe('00X0');
    });

    it('parses high-duration valid tempo "5555" correctly (20s total duration)', () => {
      const parsed = parseTempo('5555');
      expect(parsed.eccentric).toBe(5);
      expect(parsed.pauseBottom).toBe(5);
      expect(parsed.concentric).toBe(5);
      expect(parsed.pauseTop).toBe(5);
      expect(parsed.isConcentricExplosive).toBe(false);
      expect(parsed.totalDuration).toBe(20);
      expect(parsed.raw).toBe('5555');
    });

    it('handles various valid letter cases and separators ("30x1", " 4-0-1-0 ")', () => {
      const p1 = parseTempo('30x1');
      expect(p1.isConcentricExplosive).toBe(true);
      expect(p1.concentric).toBe(1);
      expect(p1.raw).toBe('30X1');

      const p2 = parseTempo(' 4-0-1-0 ');
      expect(p2.eccentric).toBe(4);
      expect(p2.pauseBottom).toBe(0);
      expect(p2.concentric).toBe(1);
      expect(p2.pauseTop).toBe(0);
      expect(p2.raw).toBe('4010');
    });

    it('metronome rejects invalid tempo on start() without corrupting internal state', () => {
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      expect(() => metronome.start('invalid-tempo')).toThrow();
      const snap = metronome.getSnapshot();
      expect(snap.state).toBe('STOPPED');
      expect(snap.isRunning).toBe(false);
      metronome.destroy();
    });

    it('metronome rejects invalid tempo on setTempo() without corrupting state', () => {
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      expect(() => metronome.setTempo('0000')).toThrow();
      expect(metronome.getSnapshot().tempo).toBe('30X1');
      metronome.destroy();
    });
  });

  // =========================================================================
  // SECTION 2: INSTANT ZERO-DURATION PHASE SKIPPING
  // =========================================================================
  describe('2. Instant Zero-Duration Phase Skipping Verification', () => {
    it('skips pauseBottom (0s) cleanly with 0ms delay in "30X1"', () => {
      const phasesVisited: { phase: TempoPhase; time: number }[] = [];
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.onPhaseChange((phase) => phasesVisited.push({ phase, time: Date.now() }));

      metronome.start('30X1', 1);
      expect(phasesVisited).toHaveLength(1);
      expect(phasesVisited[0].phase).toBe('eccentric');

      // Advance exactly 2999ms: still in eccentric
      vi.advanceTimersByTime(2999);
      expect(metronome.getSnapshot().currentPhase).toBe('eccentric');

      // Advance by 1ms (total 3000ms): eccentric completes -> pauseBottom(0s) skipped -> concentric entered immediately!
      vi.advanceTimersByTime(1);
      expect(phasesVisited.map((p) => p.phase)).toEqual(['eccentric', 'concentric']);
      expect(metronome.getSnapshot().currentPhase).toBe('concentric');

      metronome.destroy();
    });

    it('skips both pauseBottom (0s) and pauseTop (0s) cleanly in "4010"', () => {
      const phasesVisited: TempoPhase[] = [];
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.onPhaseChange((phase) => phasesVisited.push(phase));

      metronome.start('4010', 2);
      expect(phasesVisited).toEqual(['eccentric']);

      // 4000ms passes: eccentric ends -> pauseBottom skipped -> concentric enters
      vi.advanceTimersByTime(4000);
      expect(phasesVisited).toEqual(['eccentric', 'concentric']);

      // 1000ms passes: concentric ends -> pauseTop skipped -> rep 1 completes -> eccentric entered for rep 2
      vi.advanceTimersByTime(1000);
      expect(phasesVisited).toEqual(['eccentric', 'concentric', 'eccentric']);
      expect(metronome.getSnapshot().currentRep).toBe(2);

      metronome.destroy();
    });

    it('initializes cleanly on non-eccentric first phase when eccentric is 0s ("0210")', () => {
      const phasesVisited: TempoPhase[] = [];
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.onPhaseChange((phase) => phasesVisited.push(phase));

      metronome.start('0210', 1);
      // Eccentric is 0s, so it must start on pauseBottom!
      expect(phasesVisited).toEqual(['pauseBottom']);
      expect(metronome.getSnapshot().currentPhase).toBe('pauseBottom');
      expect(mockSynth.playTone).toHaveBeenCalledWith('tempo-pause');

      // 2000ms: pauseBottom ends -> concentric enters
      vi.advanceTimersByTime(2000);
      expect(phasesVisited).toEqual(['pauseBottom', 'concentric']);

      // 1000ms: concentric ends -> pauseTop(0s) skipped -> rep 1 completes -> set finishes
      vi.advanceTimersByTime(1000);
      expect(metronome.getSnapshot().state).toBe('STOPPED');

      metronome.destroy();
    });

    it('handles 3 zero-second phases in "00X0" with instant rep cycling', () => {
      const phasesVisited: TempoPhase[] = [];
      const completedRepsList: number[] = [];
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.onPhaseChange((phase) => phasesVisited.push(phase));
      metronome.onRepComplete((rep) => completedRepsList.push(rep));

      metronome.start('00X0', 3);
      // Starts directly on concentric
      expect(phasesVisited).toEqual(['concentric']);

      // 1000ms: concentric ends -> pauseTop(0), eccentric(0), pauseBottom(0) all skipped -> rep 1 completes -> concentric for rep 2
      vi.advanceTimersByTime(1000);
      expect(completedRepsList).toEqual([1]);
      expect(phasesVisited).toEqual(['concentric', 'concentric']);
      expect(metronome.getSnapshot().currentRep).toBe(2);

      // Another 1000ms: concentric ends -> rep 2 completes -> concentric for rep 3
      vi.advanceTimersByTime(1000);
      expect(completedRepsList).toEqual([1, 2]);
      expect(phasesVisited).toEqual(['concentric', 'concentric', 'concentric']);

      // Another 1000ms: concentric ends -> rep 3 completes -> target reps reached (3) -> STOPPED
      vi.advanceTimersByTime(1000);
      expect(completedRepsList).toEqual([1, 2, 3]);
      expect(metronome.getSnapshot().state).toBe('STOPPED');
      expect(mockSynth.playTone).toHaveBeenCalledWith('completion');

      metronome.destroy();
    });

    it('skips two consecutive zero-second phases in "3001" (pauseBottom=0s, concentric=0s)', () => {
      const phasesVisited: TempoPhase[] = [];
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.onPhaseChange((phase) => phasesVisited.push(phase));

      metronome.start('3001', 1);
      expect(phasesVisited).toEqual(['eccentric']);

      // 3000ms: eccentric ends -> pauseBottom(0s) & concentric(0s) skipped -> pauseTop entered
      vi.advanceTimersByTime(3000);
      expect(phasesVisited).toEqual(['eccentric', 'pauseTop']);

      // 1000ms: pauseTop ends -> rep 1 completes -> set stops
      vi.advanceTimersByTime(1000);
      expect(metronome.getSnapshot().state).toBe('STOPPED');

      metronome.destroy();
    });

    it('starts on pauseTop in "0001" (eccentric=0, pauseBottom=0, concentric=0)', () => {
      const phasesVisited: TempoPhase[] = [];
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.onPhaseChange((phase) => phasesVisited.push(phase));

      metronome.start('0001', 1);
      expect(phasesVisited).toEqual(['pauseTop']);

      vi.advanceTimersByTime(1000);
      expect(metronome.getSnapshot().state).toBe('STOPPED');

      metronome.destroy();
    });
  });

  // =========================================================================
  // SECTION 3: REP ACCUMULATION & TARGET REPS COMPLETION
  // =========================================================================
  describe('3. Rep Accumulation & Target Reps Invariant Verification', () => {
    it('executes exactly 5 reps for targetReps = 5 and stops with completion chime', () => {
      const repEvents: { completedRep: number; targetReps: number }[] = [];
      let finalSetCompletedReps = -1;

      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.onRepComplete((completedRep, targetReps) => {
        repEvents.push({ completedRep, targetReps });
      });
      metronome.onSetComplete((totalReps) => {
        finalSetCompletedReps = totalReps;
      });

      // 30X1 = 5s per rep. 5 reps = 25s
      metronome.start('30X1', 5);

      for (let r = 1; r <= 4; r++) {
        vi.advanceTimersByTime(5000);
        expect(repEvents).toHaveLength(r);
        expect(repEvents[r - 1]).toEqual({ completedRep: r, targetReps: 5 });
        expect(metronome.getSnapshot().state).toBe('ACTIVE');
        expect(metronome.getSnapshot().currentRep).toBe(r + 1);
      }

      // Final 5th rep
      vi.advanceTimersByTime(5000);
      expect(repEvents).toHaveLength(5);
      expect(repEvents[4]).toEqual({ completedRep: 5, targetReps: 5 });
      expect(finalSetCompletedReps).toBe(5);
      expect(metronome.getSnapshot().state).toBe('STOPPED');
      expect(metronome.getSnapshot().isRunning).toBe(false);
      expect(metronome.getSnapshot().currentRep).toBe(5);
      expect(mockSynth.playTone).toHaveBeenCalledWith('completion');

      metronome.destroy();
    });

    it('terminates immediately after 1 rep for targetReps = 1', () => {
      let setFinished = false;
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.onSetComplete((reps) => {
        expect(reps).toBe(1);
        setFinished = true;
      });

      metronome.start('30X1', 1);
      vi.advanceTimersByTime(5000);

      expect(setFinished).toBe(true);
      expect(metronome.getSnapshot().state).toBe('STOPPED');
      metronome.destroy();
    });

    it('runs indefinitely in continuous mode (targetReps = 0) without terminating', () => {
      let setFinished = false;
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.onSetComplete(() => {
        setFinished = true;
      });

      metronome.start('30X1', 0);
      // Run for 12 reps (60 seconds)
      vi.advanceTimersByTime(60000);

      expect(setFinished).toBe(false);
      expect(metronome.getSnapshot().state).toBe('ACTIVE');
      expect(metronome.getSnapshot().currentRep).toBe(13);

      metronome.stop();
      expect(metronome.getSnapshot().state).toBe('STOPPED');
      metronome.destroy();
    });

    it('handles negative targetReps by clamping to 0 (continuous mode)', () => {
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.start('30X1', -5);
      expect(metronome.getSnapshot().targetReps).toBe(0);

      vi.advanceTimersByTime(10000); // 2 reps
      expect(metronome.getSnapshot().state).toBe('ACTIVE');
      expect(metronome.getSnapshot().currentRep).toBe(3);

      metronome.destroy();
    });

    it('dynamically respects setTargetReps() mid-set', () => {
      let setFinished = false;
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.onSetComplete(() => {
        setFinished = true;
      });

      // Start with 10 reps
      metronome.start('30X1', 10);
      vi.advanceTimersByTime(5000); // rep 1 done, on rep 2
      expect(metronome.getSnapshot().currentRep).toBe(2);

      // User changes target to 2 mid-set
      metronome.setTargetReps(2);
      expect(metronome.getSnapshot().targetReps).toBe(2);

      // Finish rep 2
      vi.advanceTimersByTime(5000);
      expect(setFinished).toBe(true);
      expect(metronome.getSnapshot().state).toBe('STOPPED');
      expect(metronome.getSnapshot().currentRep).toBe(2);

      metronome.destroy();
    });
  });

  // =========================================================================
  // SECTION 4: TELEMETRY INVARIANTS (0.0 <= phaseProgressRatio <= 1.0)
  // =========================================================================
  describe('4. Telemetry Mathematical Invariants (No NaN, No Infinity, Clamped [0, 1])', () => {
    const testTempos = ['30X1', '4010', '00X0', '5555', '2112', '0210', '3001', '0001'];

    testTempos.forEach((tempo) => {
      it(`enforces strict telemetry invariants for tempo "${tempo}" throughout execution`, () => {
        const metronome = new TempoMetronome({
          audioSynthesizer: mockSynth,
          tickIntervalMs: 25, // high-frequency sampling
        });

        let snapshotCount = 0;
        metronome.subscribe((snap) => {
          snapshotCount++;

          // INVARIANT 1: phaseProgressRatio in [0.0, 1.0], never NaN or Infinity
          expect(Number.isFinite(snap.phaseProgressRatio)).toBe(true);
          expect(snap.phaseProgressRatio).toBeGreaterThanOrEqual(0.0);
          expect(snap.phaseProgressRatio).toBeLessThanOrEqual(1.0);

          // INVARIANT 2: repProgressRatio in [0.0, 1.0], never NaN or Infinity
          expect(Number.isFinite(snap.repProgressRatio)).toBe(true);
          expect(snap.repProgressRatio).toBeGreaterThanOrEqual(0.0);
          expect(snap.repProgressRatio).toBeLessThanOrEqual(1.0);

          // INVARIANT 3: phaseRemainingSecondsExact >= 0.0 and finite
          expect(Number.isFinite(snap.phaseRemainingSecondsExact)).toBe(true);
          expect(snap.phaseRemainingSecondsExact).toBeGreaterThanOrEqual(0.0);

          // INVARIANT 4: phaseRemainingSeconds >= 0 and integer
          expect(Number.isInteger(snap.phaseRemainingSeconds)).toBe(true);
          expect(snap.phaseRemainingSeconds).toBeGreaterThanOrEqual(0);

          // INVARIANT 5: currentRep >= 1
          expect(snap.currentRep).toBeGreaterThanOrEqual(1);
        });

        metronome.start(tempo, 2);

        const totalDurationMs = parseTempo(tempo).totalDuration * 1000 * 2;
        // Simulate in 25ms steps across entire 2 reps
        const stepMs = 25;
        const totalSteps = totalDurationMs / stepMs;

        for (let i = 0; i < totalSteps; i++) {
          vi.advanceTimersByTime(stepMs);
        }

        expect(snapshotCount).toBeGreaterThan(10);
        metronome.destroy();
      });
    });

    it('maintains invariants across pause, long freeze, and resume', () => {
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.start('30X1');

      // 1200ms into eccentric
      vi.advanceTimersByTime(1200);
      const snapBeforePause = metronome.getSnapshot();
      expect(snapBeforePause.phaseProgressRatio).toBeCloseTo(1200 / 3000, 2);

      // Pause for 30 seconds
      metronome.pause();
      vi.advanceTimersByTime(30000);

      const snapDuringPause = metronome.getSnapshot();
      expect(snapDuringPause.state).toBe('PAUSED');
      expect(snapDuringPause.phaseProgressRatio).toBeCloseTo(1200 / 3000, 2);
      expect(snapDuringPause.phaseRemainingSecondsExact).toBeCloseTo(1.8, 1);

      // Resume and advance remaining 1800ms
      metronome.resume();
      vi.advanceTimersByTime(900);
      const snapMidResume = metronome.getSnapshot();
      expect(snapMidResume.phaseProgressRatio).toBeCloseTo(2100 / 3000, 2);

      vi.advanceTimersByTime(900);
      // Transitions to concentric!
      const snapConcentric = metronome.getSnapshot();
      expect(snapConcentric.currentPhase).toBe('concentric');
      expect(snapConcentric.phaseProgressRatio).toBeGreaterThanOrEqual(0.0);
      expect(snapConcentric.phaseProgressRatio).toBeLessThanOrEqual(1.0);

      metronome.destroy();
    });

    it('STOPPED state snapshot has valid non-NaN telemetry math', () => {
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      const snap = metronome.getSnapshot();

      expect(snap.state).toBe('STOPPED');
      expect(snap.isRunning).toBe(false);
      expect(snap.phaseProgressRatio).toBe(0.0);
      expect(snap.repProgressRatio).toBe(0.0);
      expect(snap.phaseRemainingSeconds).toBe(3);
      expect(snap.phaseRemainingSecondsExact).toBe(3.0);
      expect(Number.isFinite(snap.phaseProgressRatio)).toBe(true);
      expect(Number.isFinite(snap.repProgressRatio)).toBe(true);

      metronome.destroy();
    });
  });

  // =========================================================================
  // SECTION 5: FAULT TOLERANCE, EXCEPTION ISOLATION & RAPID CYCLING
  // =========================================================================
  describe('5. Fault Tolerance & Callback Error Isolation', () => {
    it('isolates exceptions thrown inside onPhaseChange subscriber', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.onPhaseChange(() => {
        throw new Error('Hostile user error in onPhaseChange');
      });

      // Should not crash start() or advancePhase()
      expect(() => metronome.start('30X1', 1)).not.toThrow();
      expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
      expect(metronome.getSnapshot().state).toBe('STOPPED');

      metronome.destroy();
      consoleSpy.mockRestore();
    });

    it('isolates exceptions thrown inside onRepComplete subscriber', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.onRepComplete(() => {
        throw new Error('Hostile user error in onRepComplete');
      });

      expect(() => metronome.start('30X1', 2)).not.toThrow();
      expect(() => vi.advanceTimersByTime(10000)).not.toThrow();
      expect(metronome.getSnapshot().state).toBe('STOPPED');

      metronome.destroy();
      consoleSpy.mockRestore();
    });

    it('isolates exceptions thrown inside onSetComplete subscriber', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.onSetComplete(() => {
        throw new Error('Hostile user error in onSetComplete');
      });

      expect(() => metronome.start('30X1', 1)).not.toThrow();
      expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
      expect(metronome.getSnapshot().state).toBe('STOPPED');

      metronome.destroy();
      consoleSpy.mockRestore();
    });

    it('isolates exceptions thrown inside subscribe listener', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      let firstCall = true;
      metronome.subscribe(() => {
        if (!firstCall) {
          throw new Error('Hostile subscriber error');
        }
        firstCall = false;
      });

      expect(() => metronome.start('30X1', 1)).not.toThrow();
      expect(() => vi.advanceTimersByTime(5000)).not.toThrow();

      metronome.destroy();
      consoleSpy.mockRestore();
    });

    it('continues operating smoothly if audioSynthesizer.playTone throws', () => {
      const faultySynth: IAudioSynthesizer = {
        init: vi.fn().mockResolvedValue(undefined),
        playTone: vi.fn().mockImplementation(() => {
          throw new Error('Web Audio hardware glitch');
        }),
        setMuted: vi.fn(),
        isMuted: vi.fn().mockReturnValue(false),
        getAudioContext: vi.fn().mockReturnValue(null),
      };

      const metronome = new TempoMetronome({ audioSynthesizer: faultySynth });
      expect(() => metronome.start('30X1', 1)).not.toThrow();
      expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
      expect(metronome.getSnapshot().state).toBe('STOPPED');

      metronome.destroy();
    });

    it('survives rapid chaos cycling (start, pause, resume, reset, restart)', () => {
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });

      for (let i = 0; i < 20; i++) {
        metronome.start('30X1', 3);
        vi.advanceTimersByTime(137);
        metronome.pause();
        vi.advanceTimersByTime(50);
        metronome.resume();
        vi.advanceTimersByTime(211);
        metronome.reset();
      }

      expect(metronome.getSnapshot().state).toBe('STOPPED');
      metronome.destroy();
    });

    it('is safe against multiple destroy() calls', () => {
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.start('30X1');
      expect(() => {
        metronome.destroy();
        metronome.destroy();
        metronome.destroy();
      }).not.toThrow();
    });
  });
});
