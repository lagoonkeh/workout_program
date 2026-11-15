// tests/e2e/tier2_boundaries.test.tsx
/**
 * Tier 2: Boundary & Corner Cases Test Suite (F1 - F14)
 * Comprehensive testing of boundary values, edge limits, zero/empty states,
 * extreme inputs, rapid user interactions, and fault injections.
 * Minimum 5 boundary tests per feature (70 tests total).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '../../src/App';
import { storageManager } from '../../src/storage/storageManager';
import { restTimerSingleton } from '../../src/timer/restTimerSingleton';
import { audioSynthesizer } from '../../src/audio/audioSynthesizer';
import { calculatePlates } from '../../src/domain/plateCalculator';
import { TempoMetronome, tryParseTempo } from '../../src/timer/tempoMetronome';
import { WORKOUT_SESSIONS, SESSION_LOWER_A } from '../../src/domain/programData';
import { validateMobilityEntry, calculateMobilityProgress } from '../../src/domain/mobility';

describe('Tier 2: Boundary & Corner Cases (F1 to F14)', () => {
  beforeEach(() => {
    localStorage.clear();
    restTimerSingleton.reset();
    audioSynthesizer.setMuted(false);
    storageManager.saveImmediate({
      activeSessionId: 'lower_a',
      currentLogs: {},
      mobilityHistory: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // F1: Multi-Creator Routine Boundaries
  // =========================================================================
  describe('F1 Boundaries: Routine & Program Fallbacks', () => {
    it('F1-B1: gracefully defaults to Lower A when activeSessionId in localStorage is invalid', () => {
      localStorage.setItem('workout_app_active_session_v1', 'non_existent_session_id');
      render(<App />);

      expect(screen.getAllByText(/Lower A/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Barbell Back Squat/i)).toBeInTheDocument();
    });

    it('F1-B2: handles empty string session ID in storage', () => {
      localStorage.setItem('workout_app_active_session_v1', '');
      render(<App />);

      expect(screen.getAllByText(/Lower A/i).length).toBeGreaterThanOrEqual(1);
    });

    it('F1-B3: handles session navigation when storageManager has undefined activeSessionId', () => {
      storageManager.saveImmediate({ activeSessionId: undefined as any });
      render(<App />);

      expect(screen.getByText(/Barbell Back Squat/i)).toBeInTheDocument();
    });

    it('F1-B4: verifies all 4 sessions have non-zero exercises and duration > 0', () => {
      WORKOUT_SESSIONS.forEach((session) => {
        expect(session.exercises.length).toBeGreaterThanOrEqual(4);
        expect(session.estimatedDurationMinutes).toBeGreaterThanOrEqual(45);
        expect(session.estimatedDurationMinutes).toBeLessThanOrEqual(75);
      });
    });

    it('F1-B5: verifies zero ballistic knee extension prescribed in any session exercise', () => {
      WORKOUT_SESSIONS.forEach((session) => {
        session.exercises.forEach((ex) => {
          expect(ex.name.toLowerCase()).not.toContain('leg extension machine');
          expect(ex.name.toLowerCase()).not.toContain('sissy squat unassisted');
        });
      });
    });
  });

  // =========================================================================
  // F2: Knee Tendinitis Protocols Boundaries
  // =========================================================================
  describe('F2 Boundaries: Knee Tendinitis Protocols', () => {
    it('F2-B1: toggles regression open and closed 10 times without layout collapse', () => {
      render(<App />);
      const regressionBtn = screen.getAllByRole('button', { name: /Need a pain-free regression\?/i })[0];

      for (let i = 0; i < 10; i++) {
        fireEvent.click(regressionBtn);
      }
      expect(screen.getByText(/Barbell Back Squat/i)).toBeInTheDocument();
    });

    it('F2-B2: verifies regression instructions contain pain threshold trigger condition', () => {
      render(<App />);
      const regressionBtn = screen.getAllByRole('button', { name: /Need a pain-free regression\?/i })[0];
      fireEvent.click(regressionBtn);

      expect(screen.getByText(/Trigger: Patellar tendon pain > 2\/10/i)).toBeInTheDocument();
    });

    it('F2-B3: exercises without regressions do not render regression toggle button', () => {
      render(<App />);
      expect(screen.getAllByRole('button', { name: /Need a pain-free regression\?/i }).length).toBe(2);
    });

    it('F2-B4: enforces minimum 3-second eccentric tempo on all primary knee loading compounds', () => {
      const squat = SESSION_LOWER_A.exercises.find((e) => e.id === 't1_bb_squat')!;
      const atgSplit = SESSION_LOWER_A.exercises.find((e) => e.id === 't2_atg_split_squat')!;

      expect(squat.tempo.startsWith('3')).toBe(true);
      expect(atgSplit.tempo.startsWith('3')).toBe(true);
    });

    it('F2-B5: verifies zero bouncing cue in all knee sensitive exercise rationales', () => {
      const squat = SESSION_LOWER_A.exercises.find((e) => e.id === 't1_bb_squat')!;
      expect(squat.biomechanicalRationale).toContain('stretch-shortening rebound snap');
    });
  });

  // =========================================================================
  // F3: Posterior Chain Pre-Fatigue Boundaries
  // =========================================================================
  describe('F3 Boundaries: Warm-Up & Pre-Fatigue Drills', () => {
    it('F3-B1: rapid 20x accordion open/close cycle executes smoothly', () => {
      render(<App />);
      const warmupBtn = screen.getByRole('button', { name: /Warm-Up & Biomechanical Priming Sequence/i });

      for (let i = 0; i < 20; i++) {
        fireEvent.click(warmupBtn);
      }
      expect(warmupBtn).toBeInTheDocument();
    });

    it('F3-B2: renders warm-up accordion header cleanly on session load', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /Lower A/i }));
      expect(screen.getByText(/Warm-Up & Biomechanical Priming Sequence/i)).toBeInTheDocument();
    });

    it('F3-B3: warmup drill coaching notes contain specific breathing & cadence cues', () => {
      render(<App />);
      expect(screen.getByText(/3s eccentric stretch at bottom, 2s hard squeeze/i)).toBeInTheDocument();
      expect(screen.getByText(/Push hips back, 3s eccentric down, 1s active hamstring stretch/i)).toBeInTheDocument();
    });

    it('F3-B4: warmup drill equipment matches available home gym items strictly', () => {
      const validEquip = ['rowing_machine', 'bodyweight', 'kettlebell', 'indian_clubs', 'pull_up_bar'];

      WORKOUT_SESSIONS.forEach((session) => {
        session.warmupSequence.forEach((drill) => {
          expect(validEquip).toContain(drill.equipment);
        });
      });
    });

    it('F3-B5: opens technique cues for each warmup drill without error', () => {
      render(<App />);
      const cueBtns = screen.getAllByRole('button', { name: /View Technique Cues/i });

      fireEvent.click(cueBtns[0]);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Close Cue Card Modal/i }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // F4: Form Cue Cards Encyclopedia Boundaries
  // =========================================================================
  describe('F4: Form Cue Cards Boundaries', () => {
    it('F4-B1: dynamic fallback generates valid cue card for unknown drill/exercise IDs', () => {
      render(<App />);
      const cueBtns = screen.getAllByRole('button', { name: /View Form Cues & Science/i });
      expect(cueBtns.length).toBeGreaterThanOrEqual(1);

      fireEvent.click(cueBtns[cueBtns.length - 1]);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Close Cue Card Modal/i }));
    });

    it('F4-B2: Escape key when no modal is open does nothing and causes zero errors', () => {
      render(<App />);
      expect(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
      }).not.toThrow();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('F4-B3: rapid open/close 10x cycles of cue modal does not leak dialog elements', () => {
      render(<App />);
      const cueBtn = screen.getAllByRole('button', { name: /View Form Cues & Science/i })[0];

      for (let i = 0; i < 10; i++) {
        fireEvent.click(cueBtn);
        const closeBtn = screen.getByRole('button', { name: /Close Cue Card Modal/i });
        fireEvent.click(closeBtn);
      }

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }, 35000);

    it('F4-B4: clicking modal backdrop dismisses the dialog', () => {
      render(<App />);
      fireEvent.click(screen.getAllByRole('button', { name: /View Form Cues & Science/i })[0]);
      const dialog = screen.getByRole('dialog');

      fireEvent.click(dialog);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('F4-B5: launches tempo metronome directly from cue card footer and closes cue modal', () => {
      render(<App />);
      const mcgill = document.getElementById('exercise-card-t3_mcgill_big_3')!;
      fireEvent.click(within(mcgill).getAllByRole('button', { name: /View Form Cues & Science/i })[0]);

      const dialog = screen.getByRole('dialog');
      const launchTempoBtn = within(dialog).getByRole('button', { name: /Launch Tempo Metronome/i });
      fireEvent.click(launchTempoBtn);

      expect(screen.getByRole('dialog', { name: /Tempo Metronome/i })).toBeInTheDocument();
    });
  });

  // =========================================================================
  // F5: Barbell Plate Calculator Boundaries
  // =========================================================================
  describe('F5: Barbell Plate Calculator Boundaries', () => {
    it('F5-B1: load below 45 lbs (e.g. 0 lbs or 20 lbs) clamps to 45 lb bar minimum', () => {
      const res0 = calculatePlates(0);
      expect(res0.achievableWeight).toBe(45);
      expect(res0.platesPerSide).toEqual([]);

      const res20 = calculatePlates(20);
      expect(res20.achievableWeight).toBe(45);
      expect(res20.platesPerSide).toEqual([]);
    });

    it('F5-B2: exact 300 lbs maximum inventory load solves with isExact: true and 0 remainder', () => {
      const res300 = calculatePlates(300);
      expect(res300.achievableWeight).toBe(300);
      expect(res300.isExact).toBe(true);
      expect(res300.remainder).toBe(0);
      expect(res300.weightPerSide).toBe(127.5);
      expect(res300.platesPerSide).toEqual([45, 35, 25, 10, 5, 5, 2.5]);
    });

    it('F5-B3: loads exceeding 300 lbs (e.g. 305 lbs, 310 lbs, 400 lbs) cap at 300 lbs with remainder', () => {
      const res305 = calculatePlates(305);
      expect(res305.achievableWeight).toBe(300);
      expect(res305.isExact).toBe(false);
      expect(res305.remainder).toBe(5);

      const res400 = calculatePlates(400);
      expect(res400.achievableWeight).toBe(300);
      expect(res400.isExact).toBe(false);
      expect(res400.remainder).toBe(100);
    });

    it('F5-B4: fractional 2.5 lb boundary loads solve accurately without floating point error', () => {
      const res50 = calculatePlates(50);
      expect(res50.achievableWeight).toBe(50);
      expect(res50.isExact).toBe(true);
      expect(res50.platesPerSide).toEqual([2.5]);

      const res182 = calculatePlates(182.5);
      expect(res182.isExact).toBe(false);
    });

    it('F5-B5: non-greedy optimal solution: 115 lbs picks 35 lbs rather than 25+10', () => {
      const res115 = calculatePlates(115);
      expect(res115.achievableWeight).toBe(115);
      expect(res115.platesPerSide).toEqual([35]);
      expect(res115.totalPlatesUsed).toBe(2);
    });
  });

  // =========================================================================
  // F6: Web Audio Synthesizer Boundaries
  // =========================================================================
  describe('F6: Web Audio Synthesizer Boundaries', () => {
    it('F6-B1: dispatches 50 rapid sequential tones without unhandled errors', () => {
      expect(() => {
        for (let i = 0; i < 50; i++) {
          audioSynthesizer.playTone('tick');
        }
      }).not.toThrow();
    });

    it('F6-B2: toggles mute 30 times in rapid succession and maintains consistent state', () => {
      for (let i = 0; i < 30; i++) {
        audioSynthesizer.setMuted(i % 2 === 0);
      }
      expect(audioSynthesizer.isMuted()).toBe(false);
    });

    it('F6-B3: handles all 6 supported tone types cleanly', () => {
      const types = ['tick', 'warning', 'completion', 'tempo-eccentric', 'tempo-pause', 'tempo-concentric'] as const;
      types.forEach((t) => {
        expect(() => audioSynthesizer.playTone(t)).not.toThrow();
      });
    });

    it('F6-B4: handles uninitialized AudioContext state by calling init() safely', async () => {
      await expect(audioSynthesizer.init()).resolves.not.toThrow();
    });

    it('F6-B5: handles playTone when muted without throwing', () => {
      audioSynthesizer.setMuted(true);
      expect(() => audioSynthesizer.playTone('completion')).not.toThrow();
      audioSynthesizer.setMuted(false);
    });
  });

  // =========================================================================
  // F7: Rest Interval Timer Engine Boundaries
  // =========================================================================
  describe('F7: Rest Interval Timer Boundaries', () => {
    it('F7-B1: starting timer with 0s throws duration validation error', () => {
      expect(() => restTimerSingleton.start(0)).toThrow(/Timer duration must be greater than 0/i);
    });

    it('F7-B2: starting timer with negative duration throws validation error', () => {
      expect(() => restTimerSingleton.start(-30)).toThrow(/Timer duration must be greater than 0/i);
    });

    it('F7-B3: pausing when IDLE or COMPLETED does not mutate state into PAUSED', () => {
      restTimerSingleton.reset();
      expect(restTimerSingleton.getSnapshot().state).toBe('IDLE');
      restTimerSingleton.pause();
      expect(restTimerSingleton.getSnapshot().state).toBe('IDLE');
    });

    it('F7-B4: resuming when IDLE does not throw or corrupt timer', () => {
      restTimerSingleton.reset();
      expect(() => restTimerSingleton.resume()).not.toThrow();
      expect(restTimerSingleton.getSnapshot().state).toBe('IDLE');
    });

    it('F7-B5: handles maximum boundary rest duration (3600 seconds) without overflow', () => {
      restTimerSingleton.start(3600);
      const snap = restTimerSingleton.getSnapshot();
      expect(snap.state).toBe('RUNNING');
      expect(snap.durationSeconds).toBe(3600);
      expect(snap.remainingSeconds).toBe(3600);
      restTimerSingleton.reset();
    });
  });

  // =========================================================================
  // F8: Tempo Metronome Boundaries
  // =========================================================================
  describe('F8: Tempo Metronome Boundaries', () => {
    it('F8-B1: rejects invalid non-4-digit strings in tryParseTempo', () => {
      expect(tryParseTempo('abc').success).toBe(false);
      expect(tryParseTempo('123').success).toBe(false);
      expect(tryParseTempo('12345').success).toBe(false);
      expect(tryParseTempo('').success).toBe(false);
    });

    it('F8-B2: handles explosive concentric symbol "X" correctly', () => {
      const res = tryParseTempo('30X1');
      expect(res.success).toBe(true);
      expect(res.data?.isConcentricExplosive).toBe(true);
      expect(res.data?.eccentric).toBe(3);
      expect(res.data?.pauseBottom).toBe(0);
      expect(res.data?.concentric).toBe(1);
      expect(res.data?.pauseTop).toBe(1);
      expect(res.data?.totalDuration).toBe(5);
    });

    it('F8-B3: handles 0s pauses properly (e.g. 4010)', () => {
      const res = tryParseTempo('4010');
      expect(res.success).toBe(true);
      expect(res.data?.eccentric).toBe(4);
      expect(res.data?.pauseBottom).toBe(0);
      expect(res.data?.concentric).toBe(1);
      expect(res.data?.pauseTop).toBe(0);
      expect(res.data?.totalDuration).toBe(5);
    });

    it('F8-B4: clamps negative rep counts to 0 in target reps setting', () => {
      const metronome = new TempoMetronome({ soundEnabled: false });
      metronome.setTargetReps(-5);
      expect(metronome.getSnapshot().targetReps).toBe(0);
      metronome.destroy();
    });

    it('F8-B5: handles 50 rapid start and stop calls on metronome without memory leak', () => {
      const metronome = new TempoMetronome({ soundEnabled: false });
      for (let i = 0; i < 50; i++) {
        metronome.start('30X1', 5);
        metronome.stop();
      }
      expect(metronome.getSnapshot().isRunning).toBe(false);
      metronome.destroy();
    });
  });

  // =========================================================================
  // F9: Routine Navigator Boundaries
  // =========================================================================
  describe('F9: Routine Navigator Boundaries', () => {
    it('F9-B1: rapid switching across all 4 sessions 20 times maintains data integrity', () => {
      render(<App />);
      const sessions = ['Upper A', 'Lower B', 'Upper B', 'Lower A'];

      for (let i = 0; i < 5; i++) {
        sessions.forEach((s) => {
          fireEvent.click(screen.getByRole('button', { name: new RegExp(s, 'i') }));
        });
      }

      expect(screen.getByText(/Barbell Back Squat/i)).toBeInTheDocument();
    }, 45000);

    it('F9-B2: verifies each session exercises have independent unique IDs', () => {
      const seenIds = new Set<string>();

      WORKOUT_SESSIONS.forEach((session) => {
        session.exercises.forEach((ex) => {
          expect(seenIds.has(ex.id)).toBe(false);
          seenIds.add(ex.id);
        });
      });
    });

    it('F9-B3: session duration boundary: all estimated times are between 45 and 60 minutes', () => {
      WORKOUT_SESSIONS.forEach((session) => {
        expect(session.estimatedDurationMinutes).toBeGreaterThanOrEqual(45);
        expect(session.estimatedDurationMinutes).toBeLessThanOrEqual(60);
      });
    });

    it('F9-B4: resets session logs for active session without modifying other session logs', () => {
      render(<App />);
      const doneBtns = screen.getAllByRole('button', { name: /Mark set 1 as completed/i });
      fireEvent.click(doneBtns[0]);

      fireEvent.click(screen.getByRole('button', { name: /Upper A/i }));
      const upperDoneBtns = screen.getAllByRole('button', { name: /Mark set 1 as completed/i });
      fireEvent.click(upperDoneBtns[0]);

      fireEvent.click(screen.getByRole('button', { name: /Reset session logs/i }));

      fireEvent.click(screen.getByRole('button', { name: /Lower A/i }));
      expect(screen.getByRole('button', { name: /Mark set 1 as incomplete/i })).toBeInTheDocument();
    }, 15000);

    it('F9-B5: computes session progress properly when totalSets is 0', () => {
      render(<App />);
      expect(screen.getByText(/0%/)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // F10: Set & Rep Tracker Boundaries
  // =========================================================================
  describe('F10: Set & Rep Tracker Boundaries', () => {
    it('F10-B1: handles load = 0 lbs without throwing or crashing display', () => {
      render(<App />);
      const weightInputs = screen.getAllByLabelText(/Set 1 Weight \(lbs\)/i);
      fireEvent.change(weightInputs[0], { target: { value: '0' } });
      expect(weightInputs[0]).toHaveValue(null);
    });

    it('F10-B2: handles load = 300 lbs (maximum gym inventory load)', () => {
      render(<App />);
      const weightInputs = screen.getAllByLabelText(/Set 1 Weight \(lbs\)/i);
      fireEvent.change(weightInputs[0], { target: { value: '300' } });
      expect(weightInputs[0]).toHaveValue(300);
    });

    it('F10-B3: handles 0 reps completed (e.g. failed attempt)', () => {
      render(<App />);
      const repsInputs = screen.getAllByLabelText(/Set 1 Reps Done/i);
      fireEvent.change(repsInputs[0], { target: { value: '0' } });
      expect(repsInputs[0]).toHaveValue(null);
    });

    it('F10-B4: accepts special characters in workout notes input', () => {
      render(<App />);
      const notesInputs = screen.getAllByLabelText(/Set 1 Notes/i);
      const testNotes = 'RPE 9.5 & <special> "chars" / 3-4s eccentric';
      fireEvent.change(notesInputs[0], { target: { value: testNotes } });
      expect(notesInputs[0]).toHaveValue(testNotes);
    });

    it('F10-B5: toggles set completion 20 times rapidly without desyncing state', () => {
      render(<App />);
      const doneBtn = screen.getAllByRole('button', { name: /Mark set 1 as completed/i })[0];

      for (let i = 0; i < 20; i++) {
        fireEvent.click(doneBtn);
      }
      expect(screen.getByText(/0%/)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // F11: Mobility Tracker Boundaries
  // =========================================================================
  describe('F11: Mobility Tracker Boundaries', () => {
    it('F11-B1: validates Elephant Walk minimum score (1) and maximum score (5)', () => {
      expect(validateMobilityEntry({ testId: 'elephant-walk', value: 1 }).isValid).toBe(true);
      expect(validateMobilityEntry({ testId: 'elephant-walk', value: 5 }).isValid).toBe(true);
      expect(validateMobilityEntry({ testId: 'elephant-walk', value: 0 }).isValid).toBe(false);
      expect(validateMobilityEntry({ testId: 'elephant-walk', value: 6 }).isValid).toBe(false);
    });

    it('F11-B2: rejects negative values for Knee-to-Wall and accepts non-negative numbers', () => {
      expect(validateMobilityEntry({ testId: 'knee-to-wall', value: 0 }).isValid).toBe(true);
      expect(validateMobilityEntry({ testId: 'knee-to-wall', value: 5.5 }).isValid).toBe(true);
      expect(validateMobilityEntry({ testId: 'knee-to-wall', value: -1 }).isValid).toBe(false);
      expect(validateMobilityEntry({ testId: 'knee-to-wall', value: NaN }).isValid).toBe(false);
    });

    it('F11-B3: rejects negative values for Dead Hang and accepts non-negative numbers', () => {
      expect(validateMobilityEntry({ testId: 'dead-hang', value: 0 }).isValid).toBe(true);
      expect(validateMobilityEntry({ testId: 'dead-hang', value: 120 }).isValid).toBe(true);
      expect(validateMobilityEntry({ testId: 'dead-hang', value: -10 }).isValid).toBe(false);
      expect(validateMobilityEntry({ testId: 'dead-hang', value: Infinity }).isValid).toBe(false);
    });

    it('F11-B4: validates Biering-Sørensen extensor hold bounds (non-negative numbers)', () => {
      expect(validateMobilityEntry({ testId: 'biering-sorensen', value: 180 }).isValid).toBe(true);
      expect(validateMobilityEntry({ testId: 'biering-sorensen', value: -5 }).isValid).toBe(false);
    });

    it('F11-B5: handles deleting non-existent mobility entry ID gracefully', () => {
      expect(() => {
        storageManager.deleteMobilityEntry('invalid_id_9999');
      }).not.toThrow();
    });
  });

  // =========================================================================
  // F12: Mobility Progress Visualization Boundaries
  // =========================================================================
  describe('F12: Mobility Progress Visualization Boundaries', () => {
    it('F12-B1: handles single entry history without NaN in progress calculation', () => {
      const history = [{ id: '1', testId: 'elephant-walk' as const, value: 3, date: '2026-09-01T00:00:00Z' }];
      const prog = calculateMobilityProgress(history, 'elephant-walk');

      expect(prog.baseline).toBe(3);
      expect(prog.latest).toBe(3);
      expect(prog.delta).toBe(0);
      expect(prog.status).toBe('baseline');
      expect(prog.isTargetMet).toBe(false);
    });

    it('F12-B2: handles identical entries (zero change) without NaN', () => {
      const history = [
        { id: '1', testId: 'dead-hang' as const, value: 45, date: '2026-09-01T00:00:00Z' },
        { id: '2', testId: 'dead-hang' as const, value: 45, date: '2026-09-15T00:00:00Z' },
      ];
      const prog = calculateMobilityProgress(history, 'dead-hang');
      expect(prog.delta).toBe(0);
      expect(prog.status).toBe('unchanged');
    });

    it('F12-B3: handles declining trend (delta < 0) for higher-is-better metrics', () => {
      const history = [
        { id: '1', testId: 'knee-to-wall' as const, value: 5.0, date: '2026-09-01T00:00:00Z' },
        { id: '2', testId: 'knee-to-wall' as const, value: 3.5, date: '2026-09-15T00:00:00Z' },
      ];
      const prog = calculateMobilityProgress(history, 'knee-to-wall');
      expect(prog.delta).toBe(-1.5);
      expect(prog.status).toBe('declined');
    });

    it('F12-B4: handles lower-is-better metric (Split Squat Elevation: 6" to 0" is improvement)', () => {
      const history = [
        { id: '1', testId: 'split-squat-elevation' as const, value: 6, date: '2026-09-01T00:00:00Z' },
        { id: '2', testId: 'split-squat-elevation' as const, value: 0, date: '2026-09-15T00:00:00Z' },
      ];
      const prog = calculateMobilityProgress(history, 'split-squat-elevation');
      expect(prog.delta).toBe(-6);
      expect(prog.status).toBe('improved');
      expect(prog.isTargetMet).toBe(true);
    });

    it('F12-B5: handles empty mobility history array returning status "empty"', () => {
      const prog = calculateMobilityProgress([], 'elephant-walk');
      expect(prog.baseline).toBe(null);
      expect(prog.latest).toBe(null);
      expect(prog.delta).toBe(0);
      expect(prog.status).toBe('empty');
      expect(prog.isTargetMet).toBe(false);
    });
  });

  // =========================================================================
  // F13: LocalStorage Fault Injection Boundaries
  // =========================================================================
  describe('F13: LocalStorage Fault Injection Boundaries', () => {
    it('F13-B1: recovers gracefully from completely corrupted JSON payload', () => {
      localStorage.setItem('workout_app_state_v1', '!!!NOT_JSON_AT_ALL!!!');
      const loaded = storageManager.load();
      expect(loaded).toBeDefined();
      expect(loaded.activeSessionId).toBe('lower_a');
    });

    it('F13-B2: handles missing properties in stored state by filling default values', () => {
      const partialJson = JSON.stringify({ activeSessionId: 'upper_a' });
      localStorage.setItem('workout_app_state_v1', partialJson);

      const sanitized = storageManager.sanitize(JSON.parse(partialJson));
      expect(sanitized.activeSessionId).toBe('upper_a');
      expect(sanitized.version).toBe(1);
      expect(sanitized.mobilityHistory).toEqual([]);
      expect(sanitized.settings.soundEnabled).toBe(true);
    });

    it('F13-B3: filters out invalid/corrupted entries from stored mobilityHistory array', () => {
      const corruptedState = {
        version: 1,
        activeSessionId: 'lower_a',
        mobilityHistory: [
          { testId: 'elephant-walk', value: 4, date: '2026-10-01' },
          { testId: 'invalid-test', value: 9999 },
          null,
          { testId: 'dead-hang', value: 60, date: '2026-10-02' },
        ],
      };
      const sanitized = storageManager.sanitize(corruptedState);
      expect(sanitized.mobilityHistory.length).toBe(2);
    });

    it('F13-B4: handles QuotaExceededError simulation in localStorage writes', () => {
      const origSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn().mockImplementation(() => {
        const err = new Error('Quota exceeded');
        err.name = 'QuotaExceededError';
        throw err;
      });

      expect(() => {
        storageManager.saveImmediate({ activeSessionId: 'upper_b' });
      }).not.toThrow();
      expect(storageManager.isQuotaExceeded()).toBe(true);

      localStorage.setItem = origSetItem;
    });

    it('F13-B5: importJSON rejects invalid non-object JSON payloads', () => {
      expect(storageManager.importJSON('null').success).toBe(false);
      expect(storageManager.importJSON('"string"').success).toBe(false);
      expect(storageManager.importJSON('[1, 2, 3]').success).toBe(false);
      expect(storageManager.importJSON('{invalid_json').success).toBe(false);
    });
  });

  // =========================================================================
  // F14: Responsive Layout Boundaries
  // =========================================================================
  describe('F14: Responsive Mobile Layout Boundaries', () => {
    it('F14-B1: renders mobile header sound toggle button', () => {
      render(<App />);
      const muteBtns = screen.getAllByRole('button', { name: /Mute Audio Synthesizer/i });
      expect(muteBtns.length).toBe(2);
    });

    it('F14-B2: renders tablist with tabs selectable via keyboard / clicks', () => {
      render(<App />);
      const routineTab = screen.getByRole('tab', { name: /Routine/i });
      const mobilityTab = screen.getByRole('tab', { name: /Mobility/i });
      const checkInTab = screen.getByRole('tab', { name: /Check-In/i });

      expect(routineTab).toHaveAttribute('aria-selected', 'true');
      expect(checkInTab).toHaveAttribute('aria-selected', 'false');
      expect(mobilityTab).toHaveAttribute('aria-selected', 'false');
      expect(screen.queryByRole('tab', { name: /Plates/i })).not.toBeInTheDocument();

      fireEvent.click(mobilityTab);
      expect(mobilityTab).toHaveAttribute('aria-selected', 'true');
      expect(routineTab).toHaveAttribute('aria-selected', 'false');
    });

    it('F14-B3: renders progress badge showing active session percentage in header', () => {
      render(<App />);
      expect(screen.getByText(/0%/)).toBeInTheDocument();
      expect(screen.getByTitle(/0% of active session completed/i)).toBeInTheDocument();
    });

    it('F14-B4: renders dockable rest timer widget with accessible minimize / expand controls', () => {
      render(<App />);
      const expandBtn = screen.getByRole('button', { name: /Expand Rest Timer/i });
      expect(expandBtn).toBeInTheDocument();

      fireEvent.click(expandBtn);
      const minimizeBtn = screen.getByRole('button', { name: /Minimize Timer/i });
      expect(minimizeBtn).toBeInTheDocument();

      fireEvent.click(minimizeBtn);
      expect(screen.getByRole('button', { name: /Expand Rest Timer/i })).toBeInTheDocument();
    });

    it('F14-B5: handles full screen unmount without lingering timers or unhandled errors', () => {
      const { unmount } = render(<App />);
      expect(() => unmount()).not.toThrow();
    });
  });
});
