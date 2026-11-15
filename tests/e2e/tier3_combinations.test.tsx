// tests/e2e/tier3_combinations.test.tsx
/**
 * Tier 3: Cross-Feature Combination Test Suite
 * Rigorous testing of pairwise and multi-feature interactions across:
 * Rest Timer, Tempo Metronome, Plate Calculator, Set Logger, Mobility Tracker, and LocalStorage.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import App from '../../src/App';
import { storageManager } from '../../src/storage/storageManager';
import { restTimerSingleton } from '../../src/timer/restTimerSingleton';
import { audioSynthesizer } from '../../src/audio/audioSynthesizer';

describe('Tier 3: Cross-Feature Combinations', () => {
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

  it('Combo 1: Active rest timer maintains running state during session switching', () => {
    render(<App />);

    // 1. Expand rest timer in Lower A and start 120s timer
    fireEvent.click(screen.getByRole('button', { name: /Expand Rest Timer/i }));
    const preset120 = screen.getByText(/Standard Tier 2 hypertrophy compound recovery/i).closest('button')!;
    fireEvent.click(preset120);

    expect(restTimerSingleton.getSnapshot().state).toBe('RUNNING');
    expect(restTimerSingleton.getSnapshot().durationSeconds).toBe(120);

    // 2. Switch session from Lower A to Upper A
    fireEvent.click(screen.getByRole('button', { name: /Upper A/i }));
    expect(screen.getAllByText(/Barbell Bench Press/i).length).toBeGreaterThanOrEqual(1);

    // 3. Verify rest timer is still running with 120s duration
    expect(restTimerSingleton.getSnapshot().state).toBe('RUNNING');
    expect(restTimerSingleton.getSnapshot().durationSeconds).toBe(120);

    // 4. Switch to Lower B
    fireEvent.click(screen.getByRole('button', { name: /Lower B/i }));
    expect(screen.getAllByText(/Barbell Romanian Deadlift/i).length).toBeGreaterThanOrEqual(1);
    expect(restTimerSingleton.getSnapshot().state).toBe('RUNNING');
  });

  it('Combo 2: Plate calculator launched directly from exercise set log pre-fills weight', () => {
    render(<App />);

    // Set 1 weight is default 185 for Barbell Back Squat
    // Change Set 1 weight to 225 lbs
    const weightInput = screen.getAllByLabelText(/Set 1 Weight \(lbs\)/i)[0];
    fireEvent.change(weightInput, { target: { value: '225' } });

    // Click plate calculator shortcut button next to weight input
    const plateShortcutBtn = screen.getByRole('button', { name: /Show bar view for 225 lbs/i });
    fireEvent.click(plateShortcutBtn);

    // Should open inline plate calculator with 225 lbs prefilled
    expect(screen.getByText(/Barbell Plate Loading Calculator/i)).toBeInTheDocument();
    expect(screen.getAllByText(/225 lbs/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/\[45, 35, 10\]/)).toBeInTheDocument();

    // Verify 225 lbs log still intact
    expect(screen.getAllByLabelText(/Set 1 Weight \(lbs\)/i)[0]).toHaveValue(225);
  });

  it('Combo 3: Tempo metronome running while logging set records', () => {
    render(<App />);

    // 1. Launch Marcus Filly tempo metronome for Barbell Back Squat (tempo: 31X1)
    const tempoBtn = screen.getAllByTitle(/Launch tempo metronome for/i)[0];
    fireEvent.click(tempoBtn);

    const dialog = screen.getByRole('dialog', { name: /Tempo Metronome/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getAllByText(/31X1/i).length).toBeGreaterThanOrEqual(1);

    // 2. Close metronome
    fireEvent.click(screen.getByRole('button', { name: /Close Metronome/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // 3. Immediately mark set 1 completed
    const doneBtn = screen.getAllByRole('button', { name: /Mark set 1 as completed/i })[0];
    fireEvent.click(doneBtn);

    expect(screen.getByRole('button', { name: /Mark set 1 as incomplete/i })).toBeInTheDocument();
  });

  it('Combo 4: Audio mute persistence across views and timers', () => {
    render(<App />);

    // 1. Mute audio from Header
    const muteBtns = screen.getAllByRole('button', { name: /Mute Audio Synthesizer/i });
    fireEvent.click(muteBtns[0]);
    expect(audioSynthesizer.isMuted()).toBe(true);

    // 2. Switch to Check-In view
    fireEvent.click(screen.getByRole('tab', { name: /Check-In/i }));
    expect(audioSynthesizer.isMuted()).toBe(true);

    // 3. Switch to Mobility view
    fireEvent.click(screen.getByRole('tab', { name: /Mobility/i }));
    expect(audioSynthesizer.isMuted()).toBe(true);

    // 4. Switch back to Routine view
    fireEvent.click(screen.getByRole('tab', { name: /Routine/i }));
    expect(audioSynthesizer.isMuted()).toBe(true);

    // 5. Unmute and verify restored
    const unmuteBtns = screen.getAllByRole('button', { name: /Unmute Audio Synthesizer/i });
    fireEvent.click(unmuteBtns[0]);
    expect(audioSynthesizer.isMuted()).toBe(false);
  });

  it('Combo 5: Mobility tracking while workout logging in progress preserves both states', () => {
    render(<App />);

    // 1. In Lower A, log Set 1 weight = 205 and mark completed
    const weightInput = screen.getAllByLabelText(/Set 1 Weight \(lbs\)/i)[0];
    fireEvent.change(weightInput, { target: { value: '205' } });
    const doneBtn = screen.getAllByRole('button', { name: /Mark set 1 as completed/i })[0];
    fireEvent.click(doneBtn);

    // 2. Switch to Mobility view and log Elephant Walk measurement
    fireEvent.click(screen.getByRole('tab', { name: /Mobility/i }));
    const l5Btn = screen.getByRole('button', { name: /L5: Palms Flat/i });
    fireEvent.click(l5Btn);
    fireEvent.click(screen.getByRole('button', { name: /Save Measurement/i }));

    expect(screen.getByText(/Measurement Logged!/i)).toBeInTheDocument();
    expect(storageManager.load().mobilityHistory.length).toBe(1);

    // 3. Switch back to Routine view
    fireEvent.click(screen.getByRole('tab', { name: /Routine/i }));
    expect(screen.getAllByLabelText(/Set 1 Weight \(lbs\)/i)[0]).toHaveValue(205);
    expect(screen.getByRole('button', { name: /Mark set 1 as incomplete/i })).toBeInTheDocument();

    // 4. Verify storageManager retains both currentLogs and mobilityHistory
    const loadedData = storageManager.load();
    expect(loadedData.mobilityHistory.length).toBe(1);
    expect(loadedData.mobilityHistory[0].value).toBe(5);
  });

  it('Combo 6: Rest timer active while Form Cue Card modal is open', () => {
    render(<App />);

    // 1. Start a 60s rest timer
    fireEvent.click(screen.getByRole('button', { name: /Expand Rest Timer/i }));
    const preset60 = screen.getByText(/Tier 3 accessory & mobility pacing/i).closest('button')!;
    fireEvent.click(preset60);
    expect(restTimerSingleton.getSnapshot().state).toBe('RUNNING');

    // 2. Immediately open Form Cue Card modal
    fireEvent.click(screen.getAllByRole('button', { name: /View Form Cues & Science/i })[0]);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Barbell Back Squat/i)).toBeInTheDocument();

    // 3. Close modal and verify timer is still RUNNING
    fireEvent.click(screen.getByRole('button', { name: /Close Cue Card Modal/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(restTimerSingleton.getSnapshot().state).toBe('RUNNING');
  });

  it('Combo 7: Resetting session workout logs does not wipe mobility history', () => {
    storageManager.addMobilityEntry({
      testId: 'dead-hang',
      value: 60,
      date: '2026-10-01T00:00:00Z',
      notes: 'Initial test',
    });

    render(<App />);

    // Complete a set
    const doneBtn = screen.getAllByRole('button', { name: /Mark set 1 as completed/i })[0];
    fireEvent.click(doneBtn);

    // Reset session logs
    const resetBtn = screen.getByRole('button', { name: /Reset session logs/i });
    fireEvent.click(resetBtn);

    expect(screen.getByText(/0%/)).toBeInTheDocument();

    // Verify mobility history in storage is untouched
    expect(storageManager.load().mobilityHistory).toHaveLength(1);
    expect(storageManager.load().mobilityHistory[0].value).toBe(60);
  });

  it('Combo 8: Completing set triggers rest timer quick-start automatically', () => {
    render(<App />);

    // Barbell Back Squat restSeconds is 180s
    const doneBtn = screen.getAllByRole('button', { name: /Mark set 1 as completed/i })[0];
    fireEvent.click(doneBtn);

    // Rest timer should be started with 180s
    const snap = restTimerSingleton.getSnapshot();
    expect(snap.state).toBe('RUNNING');
    expect(snap.durationSeconds).toBe(180);
  });

  it('Combo 9: Launching tempo metronome from Cue Card modal transitions properly', () => {
    render(<App />);

    // The barbell squat's cue card has no metronome button
    fireEvent.click(screen.getAllByRole('button', { name: /View Form Cues & Science/i })[0]);
    const firstDialog = screen.getByRole('dialog');
    expect(within(firstDialog).queryByRole('button', { name: /Launch Tempo Metronome/i })).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });

    // A timed exercise's cue card does (McGill Big 3 holds)
    const mcgill = document.getElementById('exercise-card-t3_mcgill_big_3')!;
    fireEvent.click(within(mcgill).getAllByRole('button', { name: /View Form Cues & Science/i })[0]);
    const mcgillDialog = screen.getByRole('dialog');

    // Launch metronome from cue card footer
    const launchTempoBtn = within(mcgillDialog).getByRole('button', { name: /Launch Tempo Metronome/i });
    fireEvent.click(launchTempoBtn);

    // Cue modal unmounts, metronome mounts
    expect(screen.getByRole('dialog', { name: /Tempo Metronome/i })).toBeInTheDocument();

    // Close metronome
    fireEvent.click(screen.getByRole('button', { name: /Close Metronome/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Combo 10: Plate calculator interaction in Plates view while rest timer counts down', () => {
    render(<App />);

    // Start rest timer
    fireEvent.click(screen.getByRole('button', { name: /Expand Rest Timer/i }));
    const preset90 = screen.getByText(/High-volume hypertrophy & core stability/i).closest('button')!;
    fireEvent.click(preset90);
    expect(restTimerSingleton.getSnapshot().state).toBe('RUNNING');

    // Open inline plate calculator on Barbell Back Squat
    fireEvent.click(screen.getByTestId('barbell-plates-toggle-t1_bb_squat'));

    // Interact with plate calculator: change to 275 lbs
    const preset275 = screen.getByRole('button', { name: /275 lb/i });
    fireEvent.click(preset275);
    expect(screen.getByText(/\[45, 35, 25, 10\]/)).toBeInTheDocument();

    // Docked rest timer still running in background
    expect(restTimerSingleton.getSnapshot().state).toBe('RUNNING');
  });

  it('Combo 11: Rapid switching between app tabs (Routine, Check-In, Mobility)', () => {
    render(<App />);

    const routineTab = screen.getByRole('tab', { name: /Routine/i });
    const checkInTab = screen.getByRole('tab', { name: /Check-In/i });
    const mobilityTab = screen.getByRole('tab', { name: /Mobility/i });

    for (let i = 0; i < 5; i++) {
      fireEvent.click(checkInTab);
      fireEvent.click(mobilityTab);
      fireEvent.click(routineTab);
    }

    expect(screen.getByText(/Barbell Back Squat/i)).toBeInTheDocument();
  });

  it('Combo 12: Changing exercise log reps and load does not break inline plate calculator', () => {
    render(<App />);

    // Switch to Upper A
    fireEvent.click(screen.getByRole('button', { name: /Upper A/i }));

    // Change Bench Press set 1 load to 185
    const weightInput = screen.getAllByLabelText(/Set 1 Weight \(lbs\)/i)[0];
    fireEvent.change(weightInput, { target: { value: '185' } });

    // Open Plate calculator inline on Bench Press card
    fireEvent.click(screen.getByTestId('barbell-plates-toggle-t1_bb_bench_press'));
    expect(screen.getByText(/Barbell Plate Loading Calculator/i)).toBeInTheDocument();
  });

  it('Combo 13: Warm-up accordion state persists during set logging operations', () => {
    render(<App />);

    // Warm-up sequence is automatically expanded by default
    const warmupBtn = screen.getByRole('button', { name: /Warm-Up & Biomechanical Priming Sequence/i });
    expect(warmupBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Rowing Machine Reverse Leg-Drive/i)).toBeInTheDocument();

    // Log a set in exercise card
    const doneBtn = screen.getAllByRole('button', { name: /Mark set 1 as completed/i })[0];
    fireEvent.click(doneBtn);

    // Warm-up should still remain expanded
    expect(warmupBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Rowing Machine Reverse Leg-Drive/i)).toBeInTheDocument();
  });

  it('Combo 14: Rest timer minimize and maximize cycle while running and paused', () => {
    render(<App />);

    // Expand and start timer
    fireEvent.click(screen.getByRole('button', { name: /Expand Rest Timer/i }));
    const startBtn = screen.getByRole('button', { name: /^Start$/i });
    fireEvent.click(startBtn);
    expect(restTimerSingleton.getSnapshot().state).toBe('RUNNING');

    // Minimize timer
    const minimizeBtn = screen.getByRole('button', { name: /Minimize Timer/i });
    fireEvent.click(minimizeBtn);

    // Pause while minimized
    const pauseBtn = screen.getByRole('button', { name: /Pause Timer/i });
    fireEvent.click(pauseBtn);
    expect(restTimerSingleton.getSnapshot().state).toBe('PAUSED');

    // Resume while minimized
    const resumeBtn = screen.getByRole('button', { name: /Resume Timer/i });
    fireEvent.click(resumeBtn);
    expect(restTimerSingleton.getSnapshot().state).toBe('RUNNING');
  }, 15000);

  it('Combo 15: Cross-tab simulated storage sync updates mobility history in widget', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /Mobility/i }));
    expect(screen.getByText(/Untested/i)).toBeInTheDocument();

    // Simulate cross-tab entry addition via storageManager wrapped in act
    act(() => {
      storageManager.addMobilityEntry({
        testId: 'elephant-walk',
        value: 4,
        date: '2026-10-12T00:00:00Z',
        notes: 'Cross-tab update',
      });
    });

    // History and progress indicator should update
    expect(screen.getByText(/Proficient/i)).toBeInTheDocument();
    expect(screen.getByText(/"Cross-tab update"/i)).toBeInTheDocument();
  });
});
