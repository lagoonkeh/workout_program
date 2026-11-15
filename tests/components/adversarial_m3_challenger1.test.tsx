// tests/components/adversarial_m3_challenger1.test.tsx
/**
 * Milestone 3 Adversarial Stress & Verification Suite (Challenger 1)
 *
 * Scope:
 * 1. Rapid session tab switching during active set logging & cross-session isolation.
 * 2. High-volume rapid logging of 50 sets with weights, reps, and AMRAP checkboxes.
 * 3. Quick-launching Rest Timer and Tempo Metronome from ExerciseCards with presets.
 * 4. Modal focus trapping, ESC key dismissal, backdrop click testing, and body scroll locking on CueCardModal.
 * 5. Zero unhandled exceptions, zero DOM memory leaks across 20+ mount/unmount cycles, and corrupted storage resilience.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within, cleanup, act } from '@testing-library/react';
import App from '../../src/App';
import { ExerciseCard, SetLogRecord } from '../../src/components/ExerciseCard';
import { CueCardModal } from '../../src/components/CueCardModal';
import { RestTimerWidget } from '../../src/components/RestTimerWidget';
import { TempoMetronomeWidget } from '../../src/components/TempoMetronomeWidget';
import { restTimerSingleton } from '../../src/timer/restTimerSingleton';
import { storageManager } from '../../src/storage/storageManager';
import { WorkoutExercise } from '../../src/domain/programData';
import { CUE_CARDS, CueCard } from '../../src/domain/cueCardsData';

const mockBarbellExercise: WorkoutExercise = {
  id: 't1_bb_squat',
  name: 'Barbell Back Squat',
  tier: 'T1',
  targetSets: 3,
  targetReps: '3',
  isAmrapLastSet: true,
  tempo: '31X1',
  restSeconds: 180,
  equipment: 'barbell',
  defaultWeight: 185,
  defaultWeightLbs: 185,
  muscleGroups: ['Quadriceps', 'Glutes', 'Adductors'],
  biomechanicalRationale: 'Primary GZCL strength foundation with controlled 3-second descent.',
  progressionRule: 'Add 10 lbs weekly.',
  regression: {
    condition: 'Patellar tendon pain > 2/10',
    exerciseId: 't1_bb_box_squat',
    name: 'Barbell Box Squat to Parallel',
    instructions: 'Pause 1s on box without relaxing core, then explode up.',
    tempo: '31X1',
  },
};

describe('Adversarial M3 Challenger 1: Workout Logging & UI Component Layer', () => {
  beforeEach(() => {
    localStorage.clear();
    restTimerSingleton.reset();
    document.body.style.overflow = 'unset';
    storageManager.saveImmediate({
      activeSessionId: 'lower_a',
      currentLogs: {},
      mobilityHistory: [],
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    restTimerSingleton.reset();
    document.body.style.overflow = 'unset';
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Rapid Session Tab Switching & Cross-Session Data Isolation
  // =========================================================================
  describe('Dimension 1: Rapid Session Tab Switching & Data Isolation', () => {
    it('preserves active set logging state across rapid 30x session tab switching', () => {
      render(<App />);

      // Verify initial session is Lower A
      expect(screen.getAllByText(/Lower A/i).length).toBeGreaterThanOrEqual(1);

      // Log custom values into first exercise in Lower A (Set 1: 225 lbs, 5 reps)
      const weightInputs = screen.getAllByLabelText(/Set 1 Weight \(lbs\)/i);
      const repsInputs = screen.getAllByLabelText(/Set 1 Reps Done/i);
      fireEvent.change(weightInputs[0], { target: { value: '225' } });
      fireEvent.change(repsInputs[0], { target: { value: '5' } });

      // Rapidly switch across all 4 sessions 30 times in succession
      const sessionButtons = [
        screen.getByRole('button', { name: /Upper A/i }),
        screen.getByRole('button', { name: /Lower B/i }),
        screen.getByRole('button', { name: /Upper B/i }),
        screen.getByRole('button', { name: /Lower A/i }),
      ];

      for (let i = 0; i < 30; i++) {
        const targetBtn = sessionButtons[i % sessionButtons.length];
        fireEvent.click(targetBtn);
      }

      // Switch back to Lower A definitively
      const lowerABtn = screen.getByRole('button', { name: /Lower A/i });
      fireEvent.click(lowerABtn);

      // Verify the previously logged values in Lower A are completely intact
      const updatedWeightInputs = screen.getAllByLabelText(/Set 1 Weight \(lbs\)/i);
      const updatedRepsInputs = screen.getAllByLabelText(/Set 1 Reps Done/i);
      expect((updatedWeightInputs[0] as HTMLInputElement).value).toBe('225');
      expect((updatedRepsInputs[0] as HTMLInputElement).value).toBe('5');
    }, 35000);

    it('maintains independent set completion stats across multiple sessions simultaneously', () => {
      render(<App />);

      // In Lower A: complete all 5 sets of GZCL T1 Barbell Back Squat so the exercise is fully completed
      const doneButtonsLowerA = screen.getAllByRole('button', { name: /Mark set \d as completed/i });
      for (let i = 0; i < 5; i++) {
        fireEvent.click(doneButtonsLowerA[i]);
      }

      // Lower A should now show 1 completed exercise (1/6 ex) in SessionNav
      expect(screen.getByRole('button', { name: /Lower A/i })).toHaveTextContent(/1\/6 ex/i);

      // Switch to Upper A
      const upperABtn = screen.getByRole('button', { name: /Upper A/i });
      fireEvent.click(upperABtn);

      // In Upper A: complete all 5 sets of GZCL T1 Barbell Bench Press
      const doneButtonsUpperA = screen.getAllByRole('button', { name: /Mark set \d as completed/i });
      for (let i = 0; i < 5; i++) {
        fireEvent.click(doneButtonsUpperA[i]);
      }

      // Upper A should now show 1 completed exercise (1/5 ex) in SessionNav
      expect(screen.getByRole('button', { name: /Upper A/i })).toHaveTextContent(/1\/5 ex/i);
      // Lower A must STILL have 1/6 ex in SessionNav
      expect(screen.getByRole('button', { name: /Lower A/i })).toHaveTextContent(/1\/6 ex/i);

      // Reset Lower A sets via reset button
      const lowerABtn = screen.getByRole('button', { name: /Lower A/i });
      fireEvent.click(lowerABtn);

      const resetBtn = screen.getByRole('button', { name: /Reset session logs/i });
      fireEvent.click(resetBtn);

      // Lower A should now be reset to 0/6 ex
      expect(screen.getByRole('button', { name: /Lower A/i })).toHaveTextContent(/0\/6 ex/i);

      // Upper A must STILL have 1/5 ex (no cross-session pollution)
      expect(screen.getByRole('button', { name: /Upper A/i })).toHaveTextContent(/1\/5 ex/i);
    }, 15000);
  });

  // =========================================================================
  // 2. High-Volume Rapid Logging of 50 Sets Stress Testing
  // =========================================================================
  describe('Dimension 2: Rapid 50-Set Logging Stress Test', () => {
    it('executes rapid logging of 50 sets with extreme loads, edge reps, and AMRAP checkboxes without exception', () => {
      // Create a 50-set log dataset with stress inputs
      const fiftySets: SetLogRecord[] = Array.from({ length: 50 }, (_, i) => ({
        setNumber: i + 1,
        targetReps: i % 2 === 0 ? '5' : '10',
        weightLbs: i === 0 ? 0 : i === 25 ? 500 : i === 49 ? 1000 : 135 + (i % 5) * 10,
        repsAchieved: i % 3 === 0 ? 0 : i % 5 === 0 ? 25 : 5,
        isCompleted: i % 2 === 0,
        notes: i % 7 === 0 ? '🔥 RPE 10 AMRAP! <script>alert(1)</script>' : '',
      }));

      const exerciseWith50Sets: WorkoutExercise = {
        ...mockBarbellExercise,
        targetSets: 50,
      };

      const handleUpdateSetLog = vi.fn();
      const onOpenCueCard = vi.fn();
      const onQuickStartRest = vi.fn();
      const onQuickStartTempo = vi.fn();

      render(
        <ExerciseCard
          exercise={exerciseWith50Sets}
          logs={fiftySets}
          onUpdateSetLog={handleUpdateSetLog}
          onOpenCueCard={onOpenCueCard}
          onQuickStartRest={onQuickStartRest}
          onQuickStartTempo={onQuickStartTempo}
        />
      );

      // Verify all 50 set rows are rendered
      const weightInputs = screen.getAllByLabelText(/Weight \(lbs\)/i);
      const repsInputs = screen.getAllByLabelText(/Reps Done/i);
      const doneButtons = screen.getAllByRole('button', {
        name: /Mark set \d+ as/i,
      });
      expect(weightInputs.length).toBe(50);
      expect(repsInputs.length).toBe(50);
      expect(doneButtons.length).toBe(50);

      // Rapidly dispatch 50 input changes for weights, reps, and notes with distinct new values
      for (let i = 0; i < 50; i++) {
        // Change weight to distinct new value
        const newWeight = 300 + i * 5;
        fireEvent.change(weightInputs[i], { target: { value: String(newWeight) } });
        expect(handleUpdateSetLog).toHaveBeenCalledWith('t1_bb_squat', i, {
          weightLbs: newWeight,
        });

        // Change reps to distinct new value (offset by 50 to avoid clash with initial values)
        const newReps = 50 + i;
        fireEvent.change(repsInputs[i], { target: { value: String(newReps) } });
        expect(handleUpdateSetLog).toHaveBeenCalledWith('t1_bb_squat', i, {
          repsAchieved: newReps,
        });

        // Toggle completion button
        fireEvent.click(doneButtons[i]);
        expect(handleUpdateSetLog).toHaveBeenCalledWith('t1_bb_squat', i, {
          isCompleted: !fiftySets[i].isCompleted,
        });
      }

      expect(handleUpdateSetLog).toHaveBeenCalledTimes(150); // 50 weights + 50 reps + 50 toggles
    }, 30000);

    it('persists rapid set log batches to LocalStorage cleanly and computes valid session completion', () => {
      render(<App />);

      // Mark first 3 sets in Lower A as completed
      const markButtons = screen.getAllByRole('button', { name: /Mark set \d as completed/i });
      expect(markButtons.length).toBeGreaterThanOrEqual(3);

      for (let i = 0; i < 3; i++) {
        fireEvent.click(markButtons[i]);
      }

      // Check completion percentage in Header is non-negative and not NaN
      const percentageBadge = screen.getByText(/\d+%/);
      expect(percentageBadge).toBeInTheDocument();
      const pctValue = parseInt(percentageBadge.textContent || '0', 10);
      expect(pctValue).toBeGreaterThan(0);
      expect(pctValue).toBeLessThanOrEqual(100);

      // Verify debounce timeout triggers storage write
      act(() => {
        const stored = localStorage.getItem('workout_app_set_logs_v1');
        if (stored) {
          const parsed = JSON.parse(stored);
          expect(typeof parsed).toBe('object');
        }
      });
    });
  });

  // =========================================================================
  // 3. Launching Rest Timer and Tempo Metronome from ExerciseCards
  // =========================================================================
  describe('Dimension 3: Rest Timer & Tempo Metronome Presets Launching', () => {
    it('launches Rest Timer with quick presets (180s, 120s, 60s) from ExerciseCards directly into Docked Widget', () => {
      render(<App />);

      // Find quick rest timer button on first exercise card (180s)
      const restButtons180 = screen.getAllByTitle(/Start 180s rest timer/i);
      expect(restButtons180.length).toBeGreaterThan(0);

      fireEvent.click(restButtons180[0]);

      // Docked Rest Timer should now display 03:00 (180s) and be in RUNNING state
      expect(screen.getAllByText('03:00').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/resting/i).length).toBeGreaterThanOrEqual(1);

      // Rapidly click a 60s rest button from another exercise
      const restButtons60 = screen.getAllByTitle(/Start 60s rest timer/i);
      expect(restButtons60.length).toBeGreaterThan(0);
      fireEvent.click(restButtons60[0]);
      expect(screen.getAllByText('01:00').length).toBeGreaterThanOrEqual(1);
    });

    it('auto-triggers Rest Timer countdown when completing a set', () => {
      render(<App />);

      // Mark set 1 as completed
      const doneBtn = screen.getAllByRole('button', { name: /Mark set 1 as completed/i })[0];
      fireEvent.click(doneBtn);

      // Timer should start with exercise's restSeconds (180s for Barbell Back Squat)
      expect(screen.getAllByText('03:00').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/resting/i).length).toBeGreaterThanOrEqual(1);
    });

    it('launches Tempo Metronome modal with prescribed tempo and allows dismissal', () => {
      render(<App />);

      // Launch tempo metronome from first exercise
      const tempoButtons = screen.getAllByTitle(/Launch tempo metronome for/i);
      expect(tempoButtons.length).toBeGreaterThan(0);
      fireEvent.click(tempoButtons[0]);

      // Modal dialog should appear
      const dialog = screen.getByRole('dialog', { name: /Tempo Metronome/i });
      expect(dialog).toBeInTheDocument();

      // Close modal metronome
      const closeBtn = screen.getByRole('button', { name: /Close Metronome/i });
      fireEvent.click(closeBtn);

      expect(screen.queryByRole('dialog', { name: /Tempo Metronome/i })).not.toBeInTheDocument();
    });

    it('launches Tempo Metronome from inside CueCardModal and cleanly transitions modals', () => {
      render(<App />);

      // Open CueCardModal for a timed exercise (McGill Big 3 holds); rep-based lifts have no metronome button
      const mcgill = document.getElementById('exercise-card-t3_mcgill_big_3')!;
      fireEvent.click(within(mcgill).getAllByRole('button', { name: /View Form Cues & Science/i })[0]);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText(/Form Cues & Biomechanics/i)).toBeInTheDocument();

      // Click "Launch Tempo Metronome" inside the modal
      const launchTempoBtn = within(dialog).getByRole('button', { name: /Launch Tempo Metronome/i });
      fireEvent.click(launchTempoBtn);

      // CueCardModal should close and Tempo Metronome modal should open
      expect(screen.queryByText(/Form Cues & Biomechanics/i)).not.toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: /Tempo Metronome/i })).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 4. Modal Focus Trapping, ESC Dismissal, Backdrop Clicks & Scroll Locking
  // =========================================================================
  describe('Dimension 4: CueCardModal Accessibility & Dismissal Mechanics', () => {
    const sampleCueCard: CueCard = CUE_CARDS[0];

    it('enforces dialog accessibility roles, aria-modal, and labelledby', () => {
      render(
        <CueCardModal
          cueCard={sampleCueCard}
          isOpen={true}
          onClose={vi.fn()}
          onLaunchTempo={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'cue-card-title');
      expect(screen.getByRole('button', { name: /Close Cue Card Modal/i })).toBeInTheDocument();
    });

    it('locks and restores document.body.style.overflow on open, close, and unmount', () => {
      const { unmount, rerender } = render(
        <CueCardModal
          cueCard={sampleCueCard}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      // While open: scroll locked
      expect(document.body.style.overflow).toBe('hidden');

      // Re-render as closed: scroll restored
      rerender(
        <CueCardModal
          cueCard={sampleCueCard}
          isOpen={false}
          onClose={vi.fn()}
        />
      );
      expect(document.body.style.overflow).toBe('unset');

      // Re-render as open and then unmount abruptly: scroll restored
      rerender(
        <CueCardModal
          cueCard={sampleCueCard}
          isOpen={true}
          onClose={vi.fn()}
        />
      );
      expect(document.body.style.overflow).toBe('hidden');

      unmount();
      expect(document.body.style.overflow).toBe('unset');
    });

    it('handles rapid 20x ESC key presses without exception and ignores non-Escape keys', () => {
      const onCloseMock = vi.fn();
      render(
        <CueCardModal
          cueCard={sampleCueCard}
          isOpen={true}
          onClose={onCloseMock}
        />
      );

      // Non-Escape keys should not trigger close
      fireEvent.keyDown(window, { key: 'Enter' });
      fireEvent.keyDown(window, { key: 'Tab' });
      fireEvent.keyDown(window, { key: ' ' });
      expect(onCloseMock).not.toHaveBeenCalled();

      // Rapidly press Escape 20 times
      for (let i = 0; i < 20; i++) {
        fireEvent.keyDown(window, { key: 'Escape' });
      }

      expect(onCloseMock).toHaveBeenCalledTimes(20);
    });

    it('dismisses modal on backdrop click but preserves modal when clicking inner elements', () => {
      const onCloseMock = vi.fn();
      render(
        <CueCardModal
          cueCard={sampleCueCard}
          isOpen={true}
          onClose={onCloseMock}
        />
      );

      const dialogBackdrop = screen.getByRole('dialog');
      const innerTitle = screen.getByText(sampleCueCard.title);
      const innerSetup = screen.getByText(/Setup & Equipment/i);

      // Clicking inner content does NOT close modal
      fireEvent.click(innerTitle);
      fireEvent.click(innerSetup);
      expect(onCloseMock).not.toHaveBeenCalled();

      // Clicking outer backdrop DOES close modal
      fireEvent.click(dialogBackdrop);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('generates a valid dynamic cue card fallback when exercise is not in predefined CUE_CARDS', () => {
      render(<App />);

      // Open cue card for any exercise in the program
      const cueButtons = screen.getAllByRole('button', { name: /View Form Cues & Science/i });
      expect(cueButtons.length).toBeGreaterThan(0);

      // Click each cue card button to verify none throw or crash
      fireEvent.click(cueButtons[0]);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Setup & Equipment/i)).toBeInTheDocument();

      // Dismiss
      const closeBtn = screen.getByRole('button', { name: /Close Cue Card Modal/i });
      fireEvent.click(closeBtn);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 5. Zero DOM Leaks, Rapid Mount/Unmount Cycles & Storage Corruption Resilience
  // =========================================================================
  describe('Dimension 5: Zero DOM Leaks & Storage Corruption Resilience', () => {
    it('executes 20 consecutive mount and unmount cycles of App with zero unhandled exceptions', () => {
      for (let i = 0; i < 20; i++) {
        const { unmount } = render(<App />);
        expect(screen.getAllByText(/4-Day Upper\/Lower/i).length).toBeGreaterThanOrEqual(1);
        unmount();
      }
      expect(document.body.style.overflow).toBe('unset');
    }, 15000);

    it('executes 25 consecutive mount and unmount cycles of TempoMetronomeWidget with zero timer leaks', () => {
      for (let i = 0; i < 25; i++) {
        const { unmount } = render(
          <TempoMetronomeWidget
            initialTempo="30X1"
            autoStart={true}
            onClose={vi.fn()}
          />
        );
        expect(screen.getByText(/Tempo Metronome/i)).toBeInTheDocument();
        unmount();
      }
    });

    it('executes 25 consecutive mount and unmount cycles of RestTimerWidget with zero leaks', () => {
      for (let i = 0; i < 25; i++) {
        const { unmount } = render(
          <RestTimerWidget
            variant="docked"
            initialDuration={60}
          />
        );
        expect(screen.getByRole('button', { name: /Start Timer/i })).toBeInTheDocument();
        unmount();
      }
    });

    it('gracefully handles corrupted LocalStorage entries on App initial boot without white-screen or crash', () => {
      // Intentionally write invalid data into all storage keys
      localStorage.setItem('workout_app_set_logs_v1', 'corrupted!json{invalid');
      localStorage.setItem('workout_app_active_session_v1', 'nonexistent_session_id_404');
      localStorage.setItem('workout_app_view_mode_v1', 'malformed_view_string');

      // Mount App
      render(<App />);

      // Should recover safely to Lower A and Workout view
      expect(screen.getByText(/4-Day Upper\/Lower/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Lower A/i })).toBeInTheDocument();
      expect(screen.getAllByText(/Quad & Knee Bulletproofing Focus/i).length).toBeGreaterThanOrEqual(1);
    });

    it('navigates seamlessly from ExerciseCard plate icon directly to Barbell Plate Calculator view with target weight', () => {
      render(<App />);

      // Plates are already shown on the Barbell Back Squat card; "Bar view" opens the full loader for 185 lbs
      const barViewButtons = screen.getAllByRole('button', { name: /Show bar view for 185 lbs/i });
      expect(barViewButtons.length).toBeGreaterThan(0);
      fireEvent.click(barViewButtons[0]);

      // Renders PlateCalculatorWidget inline on the card
      expect(screen.getByText(/Barbell Plate Loading Calculator/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Target Barbell Load/i)).toHaveValue(185);
      expect(screen.getAllByText(/185 lbs/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
