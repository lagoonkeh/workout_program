/**
 * tests/timer/tempoMetronome.test.ts
 * Comprehensive Vitest unit test suite for Tempo Metronome.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TempoMetronome,
  parseTempo,
  tryParseTempo,
  IAudioSynthesizer,
  MetronomeSnapshot,
} from '../../src/timer/tempoMetronome';

describe('Tempo Metronome Engine', () => {
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('1. 4-Digit Tempo Cadence Parsing (parseTempo & tryParseTempo)', () => {
    it('parses standard explosive tempo "30X1" accurately', () => {
      const parsed = parseTempo('30X1');
      expect(parsed.eccentric).toBe(3);
      expect(parsed.pauseBottom).toBe(0);
      expect(parsed.concentric).toBe(1);
      expect(parsed.isConcentricExplosive).toBe(true);
      expect(parsed.pauseTop).toBe(1);
      expect(parsed.totalDuration).toBe(5);
      expect(parsed.raw).toBe('30X1');
    });

    it('handles lowercase explosive tempo "31x1"', () => {
      const parsed = parseTempo('31x1');
      expect(parsed.eccentric).toBe(3);
      expect(parsed.pauseBottom).toBe(1);
      expect(parsed.concentric).toBe(1);
      expect(parsed.isConcentricExplosive).toBe(true);
      expect(parsed.pauseTop).toBe(1);
      expect(parsed.totalDuration).toBe(6);
      expect(parsed.raw).toBe('31X1');
    });

    it('parses numeric tempos without explosive concentric (e.g. "4010", "2011", "3012")', () => {
      const t1 = parseTempo('4010');
      expect(t1.eccentric).toBe(4);
      expect(t1.pauseBottom).toBe(0);
      expect(t1.concentric).toBe(1);
      expect(t1.isConcentricExplosive).toBe(false);
      expect(t1.pauseTop).toBe(0);
      expect(t1.totalDuration).toBe(5);

      const t2 = parseTempo('2011');
      expect(t2.eccentric).toBe(2);
      expect(t2.pauseBottom).toBe(0);
      expect(t2.concentric).toBe(1);
      expect(t2.pauseTop).toBe(1);
      expect(t2.totalDuration).toBe(4);

      const t3 = parseTempo('3012');
      expect(t3.eccentric).toBe(3);
      expect(t3.pauseBottom).toBe(0);
      expect(t3.concentric).toBe(1);
      expect(t3.pauseTop).toBe(2);
      expect(t3.totalDuration).toBe(6);
    });

    it('sanitizes whitespace and hyphen separators (e.g. " 3-1-X-1 ")', () => {
      const parsed = parseTempo(' 3-1-X-1 ');
      expect(parsed.eccentric).toBe(3);
      expect(parsed.pauseBottom).toBe(1);
      expect(parsed.isConcentricExplosive).toBe(true);
      expect(parsed.pauseTop).toBe(1);
      expect(parsed.raw).toBe('31X1');
    });

    it('extracts embedded 4-digit tempos from descriptive strings (e.g. Alyssa Lu "5083 (5s Inhale / 8s Exhale / 3s Pause)")', () => {
      const parsed = parseTempo('5083 (5s Inhale / 8s Exhale / 3s Pause)');
      expect(parsed.eccentric).toBe(5);
      expect(parsed.pauseBottom).toBe(0);
      expect(parsed.concentric).toBe(8);
      expect(parsed.pauseTop).toBe(3);
      expect(parsed.totalDuration).toBe(16);
      expect(parsed.raw).toBe('5083');
    });

    it('parses isometric hold protocols with exact hold durations (e.g. McGill Bird-Dog 10s, Biering-Sørensen 60s)', () => {
      const birdDog = parseTempo('Isometric 10s Holds (4 reps / side)');
      expect(birdDog.isIsometricHold).toBe(true);
      expect(birdDog.holdDurationSeconds).toBe(10);
      expect(birdDog.pauseBottom).toBe(10);
      expect(birdDog.totalDuration).toBe(10);
      expect(birdDog.raw).toBe('HOLD-10');

      const extensor = parseTempo('Isometric Hold (45–60s)');
      expect(extensor.isIsometricHold).toBe(true);
      expect(extensor.holdDurationSeconds).toBe(60);
      expect(extensor.pauseBottom).toBe(60);
      expect(extensor.totalDuration).toBe(60);

      const lsit = parseTempo('Isometric Hold (15–25s)');
      expect(lsit.isIsometricHold).toBe(true);
      expect(lsit.holdDurationSeconds).toBe(25);
      expect(lsit.totalDuration).toBe(25);

      const deadHang = parseTempo('Controlled Cadence (45s Hang + Casts)');
      expect(deadHang.isIsometricHold).toBe(true);
      expect(deadHang.holdDurationSeconds).toBe(45);
      expect(deadHang.totalDuration).toBe(45);

      const legacy0010 = parseTempo('0010');
      expect(legacy0010.isIsometricHold).toBe(true);
      expect(legacy0010.holdDurationSeconds).toBe(10);
      expect(legacy0010.totalDuration).toBe(10);
    });

    it('extracts hold durations from targetRepsStr when tempoStr is a generic alias', () => {
      const hollowHold = parseTempo('Isometric Hold', '25–35s');
      expect(hollowHold.isIsometricHold).toBe(true);
      expect(hollowHold.holdDurationSeconds).toBe(35);
      expect(hollowHold.totalDuration).toBe(35);

      const plankHold = parseTempo('Isometric Hold', '30–45s');
      expect(plankHold.isIsometricHold).toBe(true);
      expect(plankHold.holdDurationSeconds).toBe(45);

      const extensorHold = parseTempo('Isometric Hold', '45–60s');
      expect(extensorHold.isIsometricHold).toBe(true);
      expect(extensorHold.holdDurationSeconds).toBe(60);
    });

    it('safely parses non-4-digit cadences into functional rhythmic cadences', () => {
      const spmRun = parseTempo('180 SPM Cadence');
      expect(spmRun.raw).toBe('2020');
      expect(spmRun.totalDuration).toBe(4);

      const rowFlush = parseTempo('18–20 SPM');
      expect(rowFlush.raw).toBe('2020');

      const consistentWalk = parseTempo('Consistent Cadence');
      expect(consistentWalk.raw).toBe('2020');

      const breathReset = parseTempo('Positional Resets');
      expect(breathReset.raw).toBe('4040');
      expect(breathReset.totalDuration).toBe(8);
    });

    it('parses specialized breathing and spinal wave cadences (4040, 4083)', () => {
      const catCamel = parseTempo('4040');
      expect(catCamel.eccentric).toBe(4);
      expect(catCamel.pauseBottom).toBe(0);
      expect(catCamel.concentric).toBe(4);
      expect(catCamel.pauseTop).toBe(0);
      expect(catCamel.totalDuration).toBe(8);

      const vacuum = parseTempo('4083');
      expect(vacuum.eccentric).toBe(4);
      expect(vacuum.concentric).toBe(8);
      expect(vacuum.pauseTop).toBe(3);
      expect(vacuum.totalDuration).toBe(15);
    });

    it('throws descriptive error on malformed or invalid inputs', () => {
      expect(() => parseTempo('')).toThrow('Tempo string cannot be empty');
      expect(() => parseTempo('30X')).toThrow('Invalid tempo format');
      expect(() => parseTempo('30X12')).toThrow('Invalid tempo format');
      expect(() => parseTempo('30Y1')).toThrow('Invalid tempo format');
      expect(() => parseTempo('ABCD')).toThrow('Invalid tempo format');
      expect(() => parseTempo('0000')).toThrow('Tempo total duration must be greater than 0 seconds');
    });

    it('tryParseTempo returns safe success/failure results without throwing', () => {
      const valid = tryParseTempo('30X1');
      expect(valid.success).toBe(true);
      expect(valid.data?.totalDuration).toBe(5);

      const invalid = tryParseTempo('invalid');
      expect(invalid.success).toBe(false);
      expect(invalid.error).toBeDefined();
    });
  });

  describe('2. State Machine Transitions', () => {
    it('initializes in STOPPED state with default snapshot', () => {
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      const snap = metronome.getSnapshot();
      expect(snap.state).toBe('STOPPED');
      expect(snap.isRunning).toBe(false);
      expect(snap.currentRep).toBe(1);
      expect(snap.currentPhase).toBe('eccentric');
      expect(snap.phaseProgressRatio).toBe(0);
    });

    it('transitions STOPPED -> ACTIVE upon start()', () => {
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.start('30X1', 5);
      const snap = metronome.getSnapshot();
      expect(snap.state).toBe('ACTIVE');
      expect(snap.isRunning).toBe(true);
      expect(snap.currentRep).toBe(1);
      expect(snap.targetReps).toBe(5);
      expect(snap.currentPhase).toBe('eccentric');
      metronome.destroy();
    });

    it('transitions ACTIVE -> PAUSED -> ACTIVE upon pause() and resume()', () => {
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.start('30X1');

      metronome.pause();
      expect(metronome.getSnapshot().state).toBe('PAUSED');
      expect(metronome.getSnapshot().isRunning).toBe(false);

      metronome.resume();
      expect(metronome.getSnapshot().state).toBe('ACTIVE');
      expect(metronome.getSnapshot().isRunning).toBe(true);

      metronome.destroy();
    });

    it('transitions to STOPPED upon stop() or reset()', () => {
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.start('30X1');
      metronome.stop();
      expect(metronome.getSnapshot().state).toBe('STOPPED');
      expect(metronome.getSnapshot().isRunning).toBe(false);
      metronome.destroy();
    });

    it('ignores pause() when already STOPPED or PAUSED', () => {
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.pause();
      expect(metronome.getSnapshot().state).toBe('STOPPED');
      metronome.destroy();
    });

    it('ignores resume() when already ACTIVE or STOPPED', () => {
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.resume();
      expect(metronome.getSnapshot().state).toBe('STOPPED');
      metronome.destroy();
    });
  });

  describe('3. Phase Sequencing & Zero-Duration Bypassing', () => {
    it('executes "30X1" bypassing pauseBottom (0s) directly from eccentric to concentric', () => {
      const phaseSequence: string[] = [];
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.onPhaseChange((phase) => phaseSequence.push(phase));

      metronome.start('30X1', 1);
      expect(phaseSequence).toEqual(['eccentric']);

      // Advance through 3s eccentric
      vi.advanceTimersByTime(3000);
      // pauseBottom (0s) must be skipped immediately -> concentric!
      expect(phaseSequence).toEqual(['eccentric', 'concentric']);

      // Advance through 1s concentric
      vi.advanceTimersByTime(1000);
      expect(phaseSequence).toEqual(['eccentric', 'concentric', 'pauseTop']);

      // Advance through 1s pauseTop -> finishes set of 1 rep
      vi.advanceTimersByTime(1000);
      expect(metronome.getSnapshot().state).toBe('STOPPED');

      metronome.destroy();
    });

    it('executes "4010" bypassing both pauseBottom (0s) and pauseTop (0s)', () => {
      const phaseSequence: string[] = [];
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.onPhaseChange((phase) => phaseSequence.push(phase));

      metronome.start('4010', 2);
      expect(phaseSequence).toEqual(['eccentric']);

      // 4s eccentric
      vi.advanceTimersByTime(4000);
      // Concentric
      expect(phaseSequence).toEqual(['eccentric', 'concentric']);

      // 1s concentric -> completes Rep 1, enters Rep 2 eccentric
      vi.advanceTimersByTime(1000);
      expect(phaseSequence).toEqual(['eccentric', 'concentric', 'eccentric']);
      expect(metronome.getSnapshot().currentRep).toBe(2);

      metronome.destroy();
    });

    it('executes all 4 phases in "2112" without skipping', () => {
      const phaseSequence: string[] = [];
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.onPhaseChange((phase) => phaseSequence.push(phase));

      metronome.start('2112', 1);

      vi.advanceTimersByTime(2000); // end eccentric
      vi.advanceTimersByTime(1000); // end pauseBottom
      vi.advanceTimersByTime(1000); // end concentric
      vi.advanceTimersByTime(2000); // end pauseTop

      expect(phaseSequence).toEqual(['eccentric', 'pauseBottom', 'concentric', 'pauseTop']);
      metronome.destroy();
    });
  });

  describe('4. Rep Accumulation & Set Completion', () => {
    it('accumulates reps and fires onRepComplete callbacks', () => {
      const completedReps: number[] = [];
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.onRepComplete((rep) => completedReps.push(rep));

      metronome.start('30X1', 3); // 5s per rep

      // Rep 1 completes at 5s
      vi.advanceTimersByTime(5000);
      expect(completedReps).toEqual([1]);
      expect(metronome.getSnapshot().currentRep).toBe(2);

      // Rep 2 completes at 10s
      vi.advanceTimersByTime(5000);
      expect(completedReps).toEqual([1, 2]);
      expect(metronome.getSnapshot().currentRep).toBe(3);

      metronome.destroy();
    });

    it('terminates set when target reps reached and triggers onSetComplete & completion tone', () => {
      let setCompleteTriggered = false;
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.onSetComplete((reps) => {
        expect(reps).toBe(2);
        setCompleteTriggered = true;
      });

      metronome.start('30X1', 2); // 2 reps * 5s = 10s
      vi.advanceTimersByTime(10000);

      expect(setCompleteTriggered).toBe(true);
      expect(metronome.getSnapshot().state).toBe('STOPPED');
      expect(mockSynth.playTone).toHaveBeenCalledWith('completion');

      metronome.destroy();
    });

    it('runs indefinitely in continuous mode (targetReps = 0)', () => {
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.start('30X1', 0);

      // Run for 5 reps (25 seconds)
      vi.advanceTimersByTime(25000);
      expect(metronome.getSnapshot().state).toBe('ACTIVE');
      expect(metronome.getSnapshot().currentRep).toBe(6);

      metronome.stop();
      metronome.destroy();
    });
  });

  describe('5. Pause / Resume Timing Precision', () => {
    it('preserves exact fractional phase time across pause periods', () => {
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.start('30X1'); // 3s eccentric

      // Advance 1.5s into eccentric
      vi.advanceTimersByTime(1500);
      const snap1 = metronome.getSnapshot();
      expect(snap1.currentPhase).toBe('eccentric');
      expect(snap1.phaseRemainingSeconds).toBe(2);

      // Pause for 10s
      metronome.pause();
      vi.advanceTimersByTime(10000);

      // Snapshot should be frozen
      const snapPaused = metronome.getSnapshot();
      expect(snapPaused.state).toBe('PAUSED');
      expect(snapPaused.currentPhase).toBe('eccentric');

      // Resume and advance remaining 1.5s
      metronome.resume();
      vi.advanceTimersByTime(1500);

      // Eccentric must now transition to concentric!
      const snapResumed = metronome.getSnapshot();
      expect(snapResumed.currentPhase).toBe('concentric');

      metronome.destroy();
    });
  });

  describe('6. High-Resolution Visual Progress Math', () => {
    it('calculates linear phaseProgressRatio strictly between 0.0 and 1.0', () => {
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.start('30X1'); // 3s eccentric = 3000ms

      expect(metronome.getSnapshot().phaseProgressRatio).toBeCloseTo(0.0, 2);

      vi.advanceTimersByTime(1500);
      expect(metronome.getSnapshot().phaseProgressRatio).toBeCloseTo(0.5, 2);

      vi.advanceTimersByTime(1450);
      expect(metronome.getSnapshot().phaseProgressRatio).toBeLessThanOrEqual(1.0);

      metronome.destroy();
    });

    it('calculates overall repProgressRatio accurately', () => {
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.start('30X1'); // 5s total rep

      // Halfway through rep (2.5s)
      vi.advanceTimersByTime(2500);
      expect(metronome.getSnapshot().repProgressRatio).toBeCloseTo(0.5, 2);

      metronome.destroy();
    });
  });

  describe('7. Synchronized Web Audio Pings', () => {
    it('dispatches appropriate tones for phase entrances and 1s ticks in "30X1"', () => {
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.start('30X1', 1);

      // t=0s: eccentric entrance
      expect(mockSynth.playTone).toHaveBeenCalledWith('tempo-eccentric');

      // t=1s: cadence tick in eccentric
      vi.advanceTimersByTime(1000);
      expect(mockSynth.playTone).toHaveBeenCalledWith('tick');

      // t=2s: cadence tick in eccentric
      vi.advanceTimersByTime(1000);
      expect(mockSynth.playTone).toHaveBeenCalledWith('tick');

      // t=3s: concentric entrance
      vi.advanceTimersByTime(1000);
      expect(mockSynth.playTone).toHaveBeenCalledWith('tempo-concentric');

      // t=4s: pauseTop entrance
      vi.advanceTimersByTime(1000);
      expect(mockSynth.playTone).toHaveBeenCalledWith('tempo-pause');

      // t=5s: set completion
      vi.advanceTimersByTime(1000);
      expect(mockSynth.playTone).toHaveBeenCalledWith('completion');

      metronome.destroy();
    });

    it('suppresses audio when soundEnabled is false', () => {
      const metronome = new TempoMetronome({
        audioSynthesizer: mockSynth,
        soundEnabled: false,
      });

      metronome.start('30X1', 1);
      vi.advanceTimersByTime(5000);

      expect(mockSynth.playTone).not.toHaveBeenCalled();
      metronome.destroy();
    });
  });

  describe('8. Subscriber Pub/Sub Model', () => {
    it('notifies subscribers on start, ticks, and state changes', () => {
      const snapshots: MetronomeSnapshot[] = [];
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });

      const unsubscribe = metronome.subscribe((snap) => snapshots.push(snap));
      expect(snapshots.length).toBe(1); // initial STOPPED

      metronome.start('30X1', 1);
      expect(snapshots.length).toBeGreaterThan(1);

      const countBeforeUnsub = snapshots.length;
      unsubscribe();

      vi.advanceTimersByTime(1000);
      // No more snapshots after unsubscribe
      expect(snapshots.length).toBe(countBeforeUnsub);

      metronome.destroy();
    });
  });

  describe('9. Configuration & Mutator Controls', () => {
    it('updates tempo dynamically via setTempo in STOPPED state', () => {
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.setTempo('4010');

      const snap = metronome.getSnapshot();
      expect(snap.tempo).toBe('4010');
      expect(snap.parsedTempo.eccentric).toBe(4);
      expect(snap.phaseTotalSeconds).toBe(4);
      metronome.destroy();
    });

    it('updates target reps via setTargetReps', () => {
      const metronome = new TempoMetronome({ audioSynthesizer: mockSynth });
      metronome.setTargetReps(8);
      expect(metronome.getSnapshot().targetReps).toBe(8);

      metronome.setTargetReps(-2); // clamps to 0
      expect(metronome.getSnapshot().targetReps).toBe(0);
      metronome.destroy();
    });

    it('toggles sound via setSoundEnabled and queries isSoundEnabled', () => {
      const metronome = new TempoMetronome({ soundEnabled: true });
      expect(metronome.isSoundEnabled()).toBe(true);

      metronome.setSoundEnabled(false);
      expect(metronome.isSoundEnabled()).toBe(false);
      metronome.destroy();
    });

    it('attaches and detaches audio synthesizer via setAudioSynthesizer', () => {
      const metronome = new TempoMetronome();
      metronome.setAudioSynthesizer(mockSynth);

      metronome.start('30X1', 1);
      expect(mockSynth.playTone).toHaveBeenCalledWith('tempo-eccentric');

      metronome.setAudioSynthesizer(null);
      vi.advanceTimersByTime(3000); // would ping concentric
      // Should not throw and not call playTone again
      metronome.destroy();
    });
  });
});
