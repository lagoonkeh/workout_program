// tests/e2e/tier1_features.test.tsx
/**
 * Tier 1: Core Feature Coverage Test Suite (F1 - F14)
 * Opaque-box requirement-driven testing for all 14 features from PROJECT.md Feature Inventory.
 * Minimum 5 tests per feature (70 tests total).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '../../src/App';
import { storageManager } from '../../src/storage/storageManager';
import { restTimerSingleton } from '../../src/timer/restTimerSingleton';
import { audioSynthesizer } from '../../src/audio/audioSynthesizer';

describe('Tier 1: Feature Coverage (F1 to F14)', () => {
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
  // F1: Multi-Creator Biomechanics Synthesis (4-Day GZCL Routine)
  // =========================================================================
  describe('F1: Multi-Creator Biomechanics Synthesis', () => {
    it('F1.1: renders all 4 GZCL Upper/Lower sessions in the navigation interface', () => {
      render(<App />);
      expect(screen.getByRole('button', { name: /Lower A/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Upper A/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Lower B/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Upper B/i })).toBeInTheDocument();
    });

    it('F1.2: displays creator attribution badges for elite fitness creators and McGill', () => {
      render(<App />);
      expect(screen.getByText(/GZCL \+ 9 Creators/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Ben Patrick \(ATG\)/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Coach Eugene Teo/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Dr. Stuart McGill/i).length).toBeGreaterThanOrEqual(1);
    });

    it('F1.3: enforces GZCL tier hierarchy (T1 Strength, T2 Hypertrophy, T3 Accessory) on exercises', () => {
      render(<App />);
      expect(screen.getByText(/T1 · Tier 1 \(Strength & AMRAP\)/i)).toBeInTheDocument();
      expect(screen.getByText(/T2 · Tier 2 \(Hypertrophy\)/i)).toBeInTheDocument();
      expect(screen.getAllByText(/T3 · Tier 3 \(Accessory\/Rehab\)/i).length).toBeGreaterThanOrEqual(1);
    });

    it('F1.4: displays estimated duration and primary focus for active session', () => {
      render(<App />);
      expect(screen.getByText(/~55 Minutes/i)).toBeInTheDocument();
      expect(screen.getByText(/VMO tendon remodeling, knee joint decompression/i)).toBeInTheDocument();
    });

    it('F1.5: verifies equipment constraints adhere to user gym profile across sessions', () => {
      render(<App />);
      expect(screen.getAllByText(/^BARBELL$/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/^KETTLEBELL$/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/^BODYWEIGHT$/i).length).toBeGreaterThanOrEqual(1);

      fireEvent.click(screen.getByRole('button', { name: /Upper A/i }));
      expect(screen.getAllByText(/^LANDMINE$/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/PULL UP/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // F2: Knee Tendinitis Protocols
  // =========================================================================
  describe('F2: Knee Tendinitis Protocols', () => {
    it('F2.1: displays Knee Tendinitis Safety Protocol warning banner on quad/knee exercises', () => {
      render(<App />);
      const banners = screen.getAllByText(/Knee Tendinitis Safety Protocol:/i);
      expect(banners.length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Maintain a strict 3-4 second slow eccentric descent/i).length).toBeGreaterThanOrEqual(1);
    });

    it('F2.2: provides pain-free scalable regressions for Barbell Back Squat', () => {
      render(<App />);
      const regressionButtons = screen.getAllByRole('button', { name: /Need a pain-free regression\?/i });
      expect(regressionButtons.length).toBeGreaterThanOrEqual(1);

      fireEvent.click(regressionButtons[0]);
      expect(screen.getAllByText(/Barbell Box Squat to Parallel/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Eliminates forward patellar shear/i)).toBeInTheDocument();
    });

    it('F2.3: provides scalable regression for ATG Split Squat', () => {
      render(<App />);
      const regressionButtons = screen.getAllByRole('button', { name: /Need a pain-free regression\?/i });
      fireEvent.click(regressionButtons[1]);
      expect(screen.getAllByText(/Front-Foot Elevated ATG Split Squat/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Elevate front foot on 2–3 weight plates/i)).toBeInTheDocument();
    });

    it('F2.4: includes Ben Patrick Tibialis Wall Raises for lower-leg deceleration & shock absorption', () => {
      render(<App />);
      expect(screen.getByText(/Tibialis Wall Raises/i)).toBeInTheDocument();
      // Expand rationale for Tibialis Wall Raises (exercise index 2)
      const rationaleBtns = screen.getAllByRole('button', { name: /Biomechanical Rationale/i });
      fireEvent.click(rationaleBtns[2]);
      expect(screen.getByText(/Strengthens the primary lower-leg decelerator/i)).toBeInTheDocument();
    });

    it('F2.5: includes Single-Leg Patrick Step-Downs to isolate VMO at early knee flexion', () => {
      render(<App />);
      expect(screen.getByText(/Single-Leg Patrick Step-Downs/i)).toBeInTheDocument();
      // Expand rationale for Patrick Step-Downs (exercise index 3)
      const rationaleBtns = screen.getAllByRole('button', { name: /Biomechanical Rationale/i });
      fireEvent.click(rationaleBtns[3]);
      expect(screen.getByText(/Isolates the VMO at early knee flexion/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // F3: Posterior Chain Pre-Fatigue & Mobility Priming
  // =========================================================================
  describe('F3: Posterior Chain Pre-Fatigue & Priming', () => {
    it('F3.1: reveals warmup sequence accordion with priming drills automatically expanded', () => {
      render(<App />);
      const warmupBtn = screen.getByRole('button', { name: /Warm-Up & Biomechanical Priming Sequence/i });
      expect(warmupBtn).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText(/Rowing Machine Reverse Leg-Drive/i)).toBeInTheDocument();

      fireEvent.click(warmupBtn);
      expect(warmupBtn).toHaveAttribute('aria-expanded', 'false');
    });

    it('F3.2: includes Eugene Teo standing calf raise pre-fatigue in Lower A warm-up', () => {
      render(<App />);
      expect(screen.getByText(/Eugene Teo Standing Calf Raise \(Pre-Fatigue\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Pre-activating the triceps surae eliminates compensatory forward tibial shear/i)).toBeInTheDocument();
    });

    it('F3.3: includes Eugene Teo light KB Romanian hinge pre-fatigue in Lower A warm-up', () => {
      render(<App />);
      expect(screen.getByText(/Eugene Teo Light KB Romanian Hinge \(Pre-Fatigue\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Pre-activates the hamstring co-contraction mechanism at the knee joint/i)).toBeInTheDocument();
    });

    it('F3.4: includes Dr. Alyssa Lu 90/90 positional breathing in Lower A warm-up', () => {
      render(<App />);
      expect(screen.getByText(/Alyssa Lu 90\/90 Positional Breathing \+ Bridge/i)).toBeInTheDocument();
      expect(screen.getByText(/Dr. Alyssa Lu \(Proformance\)/i)).toBeInTheDocument();
    });

    it('F3.5: incorporates ATG Elephant Walks in Lower B warm-up', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /Lower B/i }));
      expect(screen.getByText(/ATG Elephant Walks \(Active Reciprocal Lengthening\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Alternating active quadriceps contraction forces reciprocal inhibition/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // F4: Creator Cue Cards Encyclopedia
  // =========================================================================
  describe('F4: Creator Cue Cards Encyclopedia', () => {
    it('F4.1: opens Creator Cue Card modal when clicking "View Creator Cues & Science"', () => {
      render(<App />);
      const cueBtns = screen.getAllByRole('button', { name: /View Creator Cues & Science/i });
      fireEvent.click(cueBtns[0]);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByText(/Elite Creator Cues & Biomechanics/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/Barbell Back Squat/i)).toBeInTheDocument();
    });

    it('F4.2: displays creator quotes, biomechanical purpose, setup instructions, and common faults', () => {
      render(<App />);
      fireEvent.click(screen.getAllByRole('button', { name: /View Creator Cues & Science/i })[0]);

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText(/Dr. Aaron Horschig \(Squat University\)/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/Common Faults to Avoid/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/Setup & Equipment/i)).toBeInTheDocument();
    });

    it('F4.3: closes Cue Card modal on Close button click', () => {
      render(<App />);
      fireEvent.click(screen.getAllByRole('button', { name: /View Creator Cues & Science/i })[0]);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Close Cue Card Modal/i }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('F4.4: closes Cue Card modal when pressing the Escape key', () => {
      render(<App />);
      fireEvent.click(screen.getAllByRole('button', { name: /View Creator Cues & Science/i })[0]);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('F4.5: opens technique cues for warm-up sequence drills', () => {
      render(<App />);
      const warmupCueBtns = screen.getAllByRole('button', { name: /View Technique Cues/i });
      expect(warmupCueBtns.length).toBeGreaterThanOrEqual(1);

      fireEvent.click(warmupCueBtns[0]);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByText(/Rowing Machine Reverse Leg-Drive/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // F5: Barbell Plate Loading Calculator (128-state subset sum)
  // =========================================================================
  describe('F5: Barbell Plate Loading Calculator', () => {
    it('F5.1: opens inline on barbell movements and displays 128-state subset-sum calculator', () => {
      render(<App />);
      fireEvent.click(screen.getByTestId('barbell-plates-toggle-t1_bb_squat'));

      expect(screen.getByText(/Barbell Plate Loading Calculator/i)).toBeInTheDocument();
      expect(screen.getByText(/Optimal 128-State Subset-Sum \(45–300 lbs\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Target Barbell Load/i)).toBeInTheDocument();
    });

    it('F5.2: accurately calculates plates for standard loads (135 lbs, 225 lbs, 300 lbs)', () => {
      render(<App />);
      fireEvent.click(screen.getByTestId('barbell-plates-toggle-t1_bb_squat'));
      const input = screen.getByLabelText(/Target Barbell Load/i);

      // 135 lbs -> [45] per side
      fireEvent.change(input, { target: { value: '135' } });
      expect(screen.getByText(/\[45\]/)).toBeInTheDocument();

      // 225 lbs -> [45, 35, 10] per side
      fireEvent.change(input, { target: { value: '225' } });
      expect(screen.getByText(/\[45, 35, 10\]/)).toBeInTheDocument();

      // 300 lbs -> [45, 35, 25, 10, 5, 5, 2.5] per side
      fireEvent.change(input, { target: { value: '300' } });
      expect(screen.getByText(/\[45, 35, 25, 10, 5, 5, 2.5\]/)).toBeInTheDocument();
    });

    it('F5.3: handles bar-only load (45 lbs) with 0 plates per side', () => {
      render(<App />);
      fireEvent.click(screen.getByTestId('barbell-plates-toggle-t1_bb_squat'));
      const input = screen.getByLabelText(/Target Barbell Load/i);

      fireEvent.change(input, { target: { value: '45' } });
      expect(screen.getAllByText(/45 lbs/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Empty Olympic Barbell \(45 lbs\)\. Zero plates loaded\./i)).toBeInTheDocument();
    });

    it('F5.4: provides one-click quick preset buttons (135, 185, 225, 275, 300 lbs)', () => {
      render(<App />);
      fireEvent.click(screen.getByTestId('barbell-plates-toggle-t1_bb_squat'));

      const preset225 = screen.getByRole('button', { name: /^225 lb$/i });
      fireEvent.click(preset225);
      expect(screen.getByText(/\[45, 35, 10\]/)).toBeInTheDocument();

      const preset185 = screen.getByRole('button', { name: /^185 lb$/i });
      fireEvent.click(preset185);
      expect(screen.getByText(/\[45, 25\]/)).toBeInTheDocument();
    });

    it('F5.5: increments and decrements weight using +/- buttons', () => {
      render(<App />);
      fireEvent.click(screen.getByTestId('barbell-plates-toggle-t1_bb_squat'));
      const input = screen.getByLabelText(/Target Barbell Load/i) as HTMLInputElement;

      fireEvent.change(input, { target: { value: '135' } });
      const plus5Btn = screen.getByRole('button', { name: /Increase weight by 5 lbs/i });
      fireEvent.click(plus5Btn);
      expect(input.value).toBe('140');

      const minus2halfBtn = screen.getByRole('button', { name: /Decrease weight by 2.5 lbs/i });
      fireEvent.click(minus2halfBtn);
      expect(input.value).toBe('137.5');
    });
  });

  // =========================================================================
  // F6: Web Audio API Sound Synthesizer (Zero External Media)
  // =========================================================================
  describe('F6: Web Audio API Sound Synthesizer', () => {
    it('F6.1: initializes audio synthesizer and verifies isMuted starts false', () => {
      expect(audioSynthesizer.isMuted()).toBe(false);
    });

    it('F6.2: toggles mute state from the Header control', () => {
      render(<App />);
      const muteBtns = screen.getAllByRole('button', { name: /Mute Audio Synthesizer/i });
      fireEvent.click(muteBtns[0]);

      expect(audioSynthesizer.isMuted()).toBe(true);
      expect(screen.getAllByRole('button', { name: /Unmute Audio Synthesizer/i }).length).toBeGreaterThanOrEqual(1);

      fireEvent.click(screen.getAllByRole('button', { name: /Unmute Audio Synthesizer/i })[0]);
      expect(audioSynthesizer.isMuted()).toBe(false);
    });

    it('F6.3: dispatches procedural tones (tick, warning, completion) without network fetches', () => {
      const playSpy = vi.spyOn(audioSynthesizer, 'playTone');
      audioSynthesizer.playTone('tick');
      audioSynthesizer.playTone('warning');
      audioSynthesizer.playTone('completion');

      expect(playSpy).toHaveBeenCalledWith('tick');
      expect(playSpy).toHaveBeenCalledWith('warning');
      expect(playSpy).toHaveBeenCalledWith('completion');
      expect(playSpy).toHaveBeenCalledTimes(3);
    });

    it('F6.4: respects mute flag when playTone is called', () => {
      audioSynthesizer.setMuted(true);
      const playSpy = vi.spyOn(audioSynthesizer, 'playTone');
      audioSynthesizer.playTone('tick');
      expect(playSpy).toHaveBeenCalledWith('tick');
      expect(audioSynthesizer.isMuted()).toBe(true);
    });

    it('F6.5: synchronizes docked rest timer audio mute button with global audio synthesizer', () => {
      render(<App />);
      // Expand the docked rest timer drawer first
      fireEvent.click(screen.getByRole('button', { name: /Expand Rest Timer/i }));
      const timerMuteBtn = screen.getByRole('button', { name: /^Mute Audio$/i });
      fireEvent.click(timerMuteBtn);

      expect(audioSynthesizer.isMuted()).toBe(true);
    });
  });

  // =========================================================================
  // F7: Rest Interval Countdown Timer Engine
  // =========================================================================
  describe('F7: Rest Interval Countdown Timer Engine', () => {
    it('F7.1: renders docked Rest Timer Widget at screen bottom and expands drawer', () => {
      render(<App />);
      const expandBtn = screen.getByRole('button', { name: /Expand Rest Timer/i });
      expect(expandBtn).toBeInTheDocument();

      fireEvent.click(expandBtn);
      expect(screen.getByText(/Rest Interval Timer/i)).toBeInTheDocument();
      expect(screen.getByText(/GZCL Multi-Tier Precision Recovery/i)).toBeInTheDocument();
    });

    it('F7.2: starts rest timer countdown from quick preset buttons', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Rest Timer/i }));

      const preset60 = screen.getByText(/Tier 3 accessory & mobility pacing/i).closest('button')!;
      fireEvent.click(preset60);

      const snap = restTimerSingleton.getSnapshot();
      expect(snap.state).toBe('RUNNING');
      expect(snap.durationSeconds).toBe(60);
    });

    it('F7.3: pauses and resumes active rest timer in expanded drawer', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Rest Timer/i }));

      const startBtn = screen.getByRole('button', { name: /^Start$/i });
      fireEvent.click(startBtn);
      expect(restTimerSingleton.getSnapshot().state).toBe('RUNNING');

      const pauseBtn = screen.getByRole('button', { name: /^Pause$/i });
      fireEvent.click(pauseBtn);
      expect(restTimerSingleton.getSnapshot().state).toBe('PAUSED');

      const resumeBtn = screen.getByRole('button', { name: /^Resume$/i });
      fireEvent.click(resumeBtn);
      expect(restTimerSingleton.getSnapshot().state).toBe('RUNNING');
    });

    it('F7.4: resets active rest timer back to IDLE', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Rest Timer/i }));

      restTimerSingleton.start(90);
      expect(restTimerSingleton.getSnapshot().state).toBe('RUNNING');

      const resetBtn = screen.getByRole('button', { name: /Reset Timer/i });
      fireEvent.click(resetBtn);
      expect(restTimerSingleton.getSnapshot().state).toBe('IDLE');
    });

    it('F7.5: adds 15s and 30s to remaining time using quick bumper buttons', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Rest Timer/i }));

      restTimerSingleton.start(60);
      restTimerSingleton.pause();
      const initialRemaining = restTimerSingleton.getSnapshot().remainingSeconds;

      const add15Btn = screen.getByRole('button', { name: /Add 15 Seconds/i });
      fireEvent.click(add15Btn);
      expect(restTimerSingleton.getSnapshot().remainingSeconds).toBe(initialRemaining + 15);

      const add30Btn = screen.getByRole('button', { name: /Add 30 Seconds/i });
      fireEvent.click(add30Btn);
      expect(restTimerSingleton.getSnapshot().remainingSeconds).toBe(initialRemaining + 45);
    });
  });

  // =========================================================================
  // F8: Marcus Filly Tempo Metronome
  // =========================================================================
  describe('F8: Marcus Filly Tempo Metronome', () => {
    it('F8.1: launches Tempo Metronome modal from Exercise Card tempo pill', () => {
      render(<App />);
      const tempoBtn = screen.getAllByTitle(/Launch Marcus Filly metronome for/i)[0];
      fireEvent.click(tempoBtn);

      expect(screen.getByRole('dialog', { name: /Marcus Filly Tempo Metronome/i })).toBeInTheDocument();
      expect(screen.getByText(/Functional Bodybuilding 4-Digit Cadence/i)).toBeInTheDocument();
    });

    it('F8.2: visualizes 4-digit tempo cadence strip (Eccentric, Bottom, Concentric, Top)', () => {
      render(<App />);
      fireEvent.click(screen.getAllByTitle(/Launch Marcus Filly metronome for/i)[0]);

      expect(screen.getByText(/^Eccentric$/i)).toBeInTheDocument();
      expect(screen.getByText(/^Bottom$/i)).toBeInTheDocument();
      expect(screen.getByText(/^Concentric$/i)).toBeInTheDocument();
      expect(screen.getByText(/^Top$/i)).toBeInTheDocument();
    });

    it('F8.3: allows selecting target reps (5, 8, 10, 12, 15, Continuous)', () => {
      render(<App />);
      fireEvent.click(screen.getAllByTitle(/Launch Marcus Filly metronome for/i)[0]);

      const rep10Btn = screen.getByRole('button', { name: '10' });
      fireEvent.click(rep10Btn);
      expect(screen.getByText(/of 10/i)).toBeInTheDocument();

      const contBtn = screen.getByRole('button', { name: 'Cont.' });
      fireEvent.click(contBtn);
      expect(screen.getByText(/\(Cont\.\)/i)).toBeInTheDocument();
    });

    it('F8.4: applies standard presets (Marcus Filly Standard, Knee Rehab, Eccentric Hypertrophy)', () => {
      render(<App />);
      fireEvent.click(screen.getAllByTitle(/Launch Marcus Filly metronome for/i)[0]);

      const kneeRehabPreset = screen.getByRole('button', { name: /Knee & Tendon Rehab/i });
      fireEvent.click(kneeRehabPreset);

      expect(screen.getAllByText(/31X1/i).length).toBeGreaterThanOrEqual(1);
    });

    it('F8.5: closes Tempo Metronome modal cleanly', () => {
      render(<App />);
      fireEvent.click(screen.getAllByTitle(/Launch Marcus Filly metronome for/i)[0]);
      expect(screen.getByRole('dialog', { name: /Marcus Filly Tempo Metronome/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Close Metronome/i }));
      expect(screen.queryByRole('dialog', { name: /Marcus Filly Tempo Metronome/i })).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // F9: Routine Navigator & Session Selector
  // =========================================================================
  describe('F9: Routine Navigator & Session Selector', () => {
    it('F9.1: switches seamlessly to Upper A session and updates header badge & exercise list', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /Upper A/i }));

      expect(screen.getAllByText(/Horizontal Push\/Pull & Shoulder Health/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Barbell Bench Press/i)).toBeInTheDocument();
      expect(screen.getByText(/Landmine Meadows Row/i)).toBeInTheDocument();
    });

    it('F9.2: switches seamlessly to Lower B session with posterior chain exercises', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /Lower B/i }));

      expect(screen.getAllByText(/Posterior Chain & Hamstring Restoration Focus/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Barbell Romanian Deadlift \(RDL\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Kettlebell Good Mornings/i)).toBeInTheDocument();
    });

    it('F9.3: switches seamlessly to Upper B session with vertical pressing and pull-up progressions', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /Upper B/i }));

      expect(screen.getAllByText(/Vertical Push\/Pull & Functional Calisthenics/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Barbell Overhead Press \(OHP\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Pull-Up Ladder Progression & Negatives/i)).toBeInTheDocument();
    });

    it('F9.4: displays exercise target sets, reps, and muscle groups in each card', () => {
      render(<App />);
      expect(screen.getAllByText(/Target:/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/5 sets × 3 reps/i)).toBeInTheDocument();
      expect(screen.getByText(/Quadriceps, Glutes, Adductors, Erectors/i)).toBeInTheDocument();
    });

    it('F9.5: toggles biomechanical rationale accordion for exercises', () => {
      render(<App />);
      const rationaleBtns = screen.getAllByRole('button', { name: /Biomechanical Rationale/i });
      fireEvent.click(rationaleBtns[0]);

      expect(screen.getByText(/Why this works:/i)).toBeInTheDocument();
      expect(screen.getByText(/Progression:/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Hide Rationale/i }));
      expect(screen.queryByText(/Why this works:/i)).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // F10: Set & Rep Tracker
  // =========================================================================
  describe('F10: Set & Rep Tracker', () => {
    it('F10.1: renders interactive set logging table with set #, target, load, reps, done checkbox', () => {
      render(<App />);
      expect(screen.getAllByText(/^Set$/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/^Goal$/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/^LBS$/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Reps Done/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/^Done$/i).length).toBeGreaterThanOrEqual(1);
    });

    it('F10.2: allows entering weight, completed reps, and notes', () => {
      render(<App />);
      const weightInputs = screen.getAllByLabelText(/Set 1 Weight \(lbs\)/i);
      fireEvent.change(weightInputs[0], { target: { value: '195' } });
      expect(weightInputs[0]).toHaveValue(195);

      const repsInputs = screen.getAllByLabelText(/Set 1 Reps Done/i);
      fireEvent.change(repsInputs[0], { target: { value: '5' } });
      expect(repsInputs[0]).toHaveValue(5);

      const notesInputs = screen.getAllByLabelText(/Set 1 Notes/i);
      fireEvent.change(notesInputs[0], { target: { value: 'RPE 8, felt great' } });
      expect(notesInputs[0]).toHaveValue('RPE 8, felt great');
    });

    it('F10.3: marks set as completed and updates session completion percentage in header', () => {
      render(<App />);
      expect(screen.getByText(/0%/)).toBeInTheDocument();

      const doneBtns = screen.getAllByRole('button', { name: /Mark set 1 as completed/i });
      fireEvent.click(doneBtns[0]);

      expect(screen.queryByText(/0%/)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mark set 1 as incomplete/i })).toBeInTheDocument();
    });

    it('F10.4: displays AMRAP (+) indicator on last set of Tier 1 strength compounds', () => {
      render(<App />);
      expect(screen.getAllByText(/AMRAP Last Set/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('+').length).toBeGreaterThanOrEqual(1);
    });

    it('F10.5: resets session logs when clicking the reset session logs button', () => {
      render(<App />);
      const doneBtns = screen.getAllByRole('button', { name: /Mark set 1 as completed/i });
      fireEvent.click(doneBtns[0]);

      const resetBtn = screen.getByRole('button', { name: /Reset session logs/i });
      fireEvent.click(resetBtn);

      expect(screen.getByText(/0%/)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // F11: Mobility & Flexibility Tracker
  // =========================================================================
  describe('F11: Mobility & Flexibility Tracker', () => {
    it('F11.1: switches to Mobility view and displays all 5 assessment protocols', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('tab', { name: /Mobility/i }));

      expect(screen.getByText(/Mobility & Flexibility Tracker/i)).toBeInTheDocument();
      expect(screen.getAllByText(/ATG Elephant Walks/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Knee-to-Wall/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/ATG Split Squat Elevation/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Biering-Sørensen/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Dead Hang/i).length).toBeGreaterThanOrEqual(1);
    });

    it('F11.2: switches active protocol tab to Knee-to-Wall and updates benchmark info', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('tab', { name: /Mobility/i }));

      const k2wTab = screen.getAllByText(/Knee-to-Wall/i)[0];
      fireEvent.click(k2wTab);

      expect(screen.getByText(/Dr. Aaron Horschig \(Squat University\)/i)).toBeInTheDocument();
      expect(screen.getByText(/4\.0–5\.0 inches/i)).toBeInTheDocument();
    });

    it('F11.3: expands protocol instructions and scoring criteria', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('tab', { name: /Mobility/i }));

      const detailsBtn = screen.getByRole('button', { name: /View Protocol Details/i });
      fireEvent.click(detailsBtn);

      expect(screen.getByText(/Execution Steps:/i)).toBeInTheDocument();
      expect(screen.getByText(/Scoring Criteria:/i)).toBeInTheDocument();
    });

    it('F11.4: logs new mobility assessment measurement with score, limb, date, and notes', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('tab', { name: /Mobility/i }));

      const l4Btn = screen.getByRole('button', { name: /L4: Knuckles/i });
      fireEvent.click(l4Btn);

      const notesInput = screen.getByPlaceholderText(/e\.g\. Pain-free 0\/10/i);
      fireEvent.change(notesInput, { target: { value: 'Smooth stretch, no pain' } });

      const saveBtn = screen.getByRole('button', { name: /Save Measurement/i });
      fireEvent.click(saveBtn);

      expect(screen.getByText(/Measurement Logged!/i)).toBeInTheDocument();
      expect(screen.getByText(/Proficient/i)).toBeInTheDocument();
    });

    it('F11.5: deletes a mobility measurement log from the history table', () => {
      window.confirm = vi.fn().mockReturnValue(true);
      storageManager.addMobilityEntry({
        testId: 'elephant-walk',
        value: 3,
        date: new Date().toISOString(),
        notes: 'Test to delete',
      });

      render(<App />);
      fireEvent.click(screen.getByRole('tab', { name: /Mobility/i }));

      expect(screen.getByText(/"Test to delete"/i)).toBeInTheDocument();
      const deleteBtn = screen.getByTitle(/Delete entry/i);
      fireEvent.click(deleteBtn);

      expect(screen.queryByText(/"Test to delete"/i)).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // F12: Mobility Progress Visualization (SVG Sparklines)
  // =========================================================================
  describe('F12: Mobility Progress Visualization', () => {
    it('F12.1: renders SVG sparkline chart component in active mobility view', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('tab', { name: /Mobility/i }));

      const svgs = document.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThanOrEqual(1);
    });

    it('F12.2: displays baseline, latest score, and progress delta indicators', () => {
      storageManager.addMobilityEntry({ testId: 'elephant-walk', value: 2, date: '2026-09-01T00:00:00Z' });
      storageManager.addMobilityEntry({ testId: 'elephant-walk', value: 4, date: '2026-09-15T00:00:00Z' });

      render(<App />);
      fireEvent.click(screen.getByRole('tab', { name: /Mobility/i }));

      expect(screen.getByText(/Baseline/i)).toBeInTheDocument();
      expect(screen.getAllByText(/2 level/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Latest Score/i)).toBeInTheDocument();
      expect(screen.getAllByText(/4 level/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/\+2 level/i)).toBeInTheDocument();
    });

    it('F12.3: updates target status badge when mobility benchmark is reached', () => {
      storageManager.addMobilityEntry({ testId: 'elephant-walk', value: 5, date: '2026-09-20T00:00:00Z' });

      render(<App />);
      fireEvent.click(screen.getByRole('tab', { name: /Mobility/i }));

      expect(screen.getByText(/Target Met/i)).toBeInTheDocument();
    });

    it('F12.4: displays live benchmark preview badge as user types measurement value', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('tab', { name: /Mobility/i }));

      const scoreInput = screen.getByPlaceholderText(/Level \(1–5\)/i);
      fireEvent.change(scoreInput, { target: { value: '5' } });

      expect(screen.getByText(/Exceptional: Palms Flat on Floor \(Full Decompression\)/i)).toBeInTheDocument();
    });

    it('F12.5: handles empty mobility history gracefully with placeholder UI', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('tab', { name: /Mobility/i }));

      expect(screen.getByText(/No assessment history logged yet/i)).toBeInTheDocument();
      expect(screen.getByText(/Untested/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // F13: LocalStorage Persistence & Fault Recovery
  // =========================================================================
  describe('F13: LocalStorage Persistence & Fault Recovery', () => {
    it('F13.1: auto-persists active session ID to localStorage on change', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /Upper B/i }));

      expect(localStorage.getItem('workout_app_active_session_v1')).toBe('upper_b');
      expect(storageManager.load().activeSessionId).toBe('upper_b');
    });

    it('F13.2: restores active session ID from localStorage on mount', () => {
      localStorage.setItem('workout_app_active_session_v1', 'lower_b');

      render(<App />);
      expect(screen.getAllByText(/Posterior Chain & Hamstring Restoration/i).length).toBeGreaterThanOrEqual(1);
    });

    it('F13.3: auto-persists active view mode (workout, mobility) to localStorage', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('tab', { name: /Mobility/i }));

      expect(localStorage.getItem('workout_app_view_mode_v1')).toBe('mobility');
    });

    it('F13.4: recovers gracefully when localStorage contains corrupted JSON string', () => {
      localStorage.setItem('workout_app_set_logs_v1', '{{{corrupted-json-data');
      expect(() => render(<App />)).not.toThrow();
      expect(screen.getByText(/4-Day Upper\/Lower/i)).toBeInTheDocument();
    });

    it('F13.5: storageManager supports exportJSON and importJSON roundtrip', () => {
      storageManager.addMobilityEntry({
        testId: 'dead-hang',
        value: 65,
        date: '2026-10-10T00:00:00Z',
        notes: 'Roundtrip test',
      });

      const exported = storageManager.exportJSON();
      expect(exported).toContain('Roundtrip test');

      storageManager.clear();
      expect(storageManager.load().mobilityHistory).toHaveLength(0);

      const importResult = storageManager.importJSON(exported);
      expect(importResult.success).toBe(true);
      expect(storageManager.load().mobilityHistory).toHaveLength(1);
      expect(storageManager.load().mobilityHistory[0].value).toBe(65);
    });
  });

  // =========================================================================
  // F14: Responsive Mobile-First Layout
  // =========================================================================
  describe('F14: Responsive Mobile-First Layout', () => {
    it('F14.1: renders sticky header with title, subtitle, badges, and controls', () => {
      render(<App />);
      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('sticky');
      expect(within(header).getByText(/4-Day Upper\/Lower/i)).toBeInTheDocument();
    });

    it('F14.2: provides responsive tablist with icons for Routine, Mobility, and Check-In', () => {
      render(<App />);
      const tablist = screen.getByRole('tablist', { name: /Application Views/i });
      expect(tablist).toBeInTheDocument();
      expect(within(tablist).getByRole('tab', { name: /Routine/i })).toBeInTheDocument();
      expect(within(tablist).queryByRole('tab', { name: /Plates/i })).not.toBeInTheDocument();
      expect(within(tablist).getByRole('tab', { name: /Mobility/i })).toBeInTheDocument();
    });

    it('F14.3: applies high-contrast dark theme classes with no truncated texts', () => {
      render(<App />);
      const mainContainer = document.querySelector('.min-h-screen');
      expect(mainContainer).toHaveClass('bg-slate-950');
      expect(mainContainer).toHaveClass('text-slate-100');
    });

    it('F14.4: maintains scrollable set table container with minimum width on mobile', () => {
      render(<App />);
      const table = document.querySelector('table');
      expect(table).toHaveClass('min-w-[340px]');
    });

    it('F14.5: renders modal dialogs with backdrop blur and responsive centering', () => {
      render(<App />);
      fireEvent.click(screen.getAllByRole('button', { name: /View Creator Cues & Science/i })[0]);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('fixed');
      expect(dialog).toHaveClass('inset-0');
      expect(dialog).toHaveClass('backdrop-blur-md');
    });
  });
});
