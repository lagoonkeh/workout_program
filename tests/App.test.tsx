// tests/App.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '../src/App';
import { storageManager } from '../src/storage/storageManager';
import { restTimerSingleton } from '../src/timer/restTimerSingleton';

describe('App Component (Milestone 3 Full Application)', { timeout: 15000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    restTimerSingleton.reset();
    storageManager.saveImmediate({
      activeSessionId: 'lower_a',
      currentLogs: {},
      mobilityHistory: [],
      // the app opens the workout after the last one finished, so start each test with no history
      completedWorkouts: {},
    });
  });

  it('renders application header, title, and Strength & Hypertrophy badge', () => {
    render(<App />);
    expect(screen.getByText(/4-Day Upper\/Lower/i)).toBeInTheDocument();
    expect(screen.getByText(/Strength & Hypertrophy/i)).toBeInTheDocument();
    expect(screen.getByText(/Lower A:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Quad & Knee Bulletproofing Focus/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders session navigation tabs and allows switching between sessions', () => {
    render(<App />);

    // Switch to Upper A
    const upperABtn = screen.getByRole('button', { name: /Upper A/i });
    fireEvent.click(upperABtn);

    expect(screen.getAllByText(/Horizontal Push\/Pull/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Barbell Bench Press/i)).toBeInTheDocument();

    // Switch to Lower B
    const lowerBBtn = screen.getByRole('button', { name: /Lower B/i });
    fireEvent.click(lowerBBtn);

    expect(screen.getAllByText(/Posterior Chain & Hamstring Restoration/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Barbell Romanian Deadlift/i)).toBeInTheDocument();
  });

  it('verifies Plates tab is removed and interacts with the inline Barbell Plate Calculator', () => {
    render(<App />);

    // Plates tab is removed from header navigation
    expect(screen.queryByRole('tab', { name: /Plates/i })).not.toBeInTheDocument();

    // Barbell Back Squat has the inline plate calculator button
    const plateToggle = screen.getByTestId('barbell-plates-toggle-t1_bb_squat');
    fireEvent.click(plateToggle);

    // Plate calculator drawer should be rendered inline
    expect(screen.getByTestId('inline-plate-calculator-t1_bb_squat')).toBeInTheDocument();
    expect(screen.getByText(/Barbell Plate Loader:/i)).toBeInTheDocument();

    // Find the weight input inside the inline PlateCalculatorWidget
    const weightInput = screen.getByLabelText(/Target Barbell Load/i) as HTMLInputElement;
    expect(weightInput).toBeInTheDocument();

    // Change target weight to 225 lbs
    fireEvent.change(weightInput, { target: { value: '225' } });
    expect(screen.getAllByText(/225 lbs/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/\[45, 35, 10\]/)).toBeInTheDocument();
  });

  it('switches to Mobility view and renders MobilityTrackerWidget with protocols', () => {
    render(<App />);

    // Switch to Mobility tab
    const mobilityTab = screen.getByRole('tab', { name: /Mobility/i });
    fireEvent.click(mobilityTab);

    expect(screen.getByText(/Mobility & Flexibility Tracker/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Elephant Walks/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Knee-to-Wall/i).length).toBeGreaterThanOrEqual(1);
  });

  it('switches to Progress view and renders ProgressChartWidget with forecast matrix', () => {
    render(<App />);

    // Switch to Progress tab
    const progressTab = screen.getByRole('tab', { name: /Progress/i });
    fireEvent.click(progressTab);

    expect(screen.getByText(/Progress Chart & Projected Trajectories/i)).toBeInTheDocument();
    expect(screen.getByText(/Complete Strength Forecast Matrix/i)).toBeInTheDocument();
  });

  it('logs workout sets and updates session progress', () => {
    render(<App />);

    // Check first set as completed
    const doneButtons = screen.getAllByRole('button', { name: /Mark set 1 as completed/i });
    fireEvent.click(doneButtons[0]);

    // Progress counter should update
    expect(screen.getByText(/\d+%/)).toBeInTheDocument();
  });

  it('opens and closes the Form Cue Card Modal', () => {
    render(<App />);

    // Open cue card for the first exercise
    const openCueCardButtons = screen.getAllByRole('button', { name: /View Form Cues & Science/i });
    fireEvent.click(openCueCardButtons[0]);

    // Modal should be visible
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Form Cues & Biomechanics/i)).toBeInTheDocument();

    // Close the modal
    const closeBtn = screen.getByRole('button', { name: /Close Cue Card Modal/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens and closes the Tempo Metronome modal', () => {
    render(<App />);

    // Launch metronome for first exercise
    const tempoBtn = screen.getAllByTitle(/Launch tempo metronome for/i)[0];
    fireEvent.click(tempoBtn);

    // Modal with Tempo Metronome should appear (the first timed exercise is a hold, so it shows the isometric clock)
    expect(screen.getByRole('dialog', { name: /Tempo Metronome/i })).toBeInTheDocument();

    // Close metronome
    const closeBtn = screen.getByRole('button', { name: /Close Metronome/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog', { name: /Tempo Metronome/i })).not.toBeInTheDocument();
  });

  it('renders docked Rest Timer Widget at bottom of screen', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /Start Timer/i })).toBeInTheDocument();
    expect(screen.getByText(/idle/i)).toBeInTheDocument();
  });

  it('toggles warm-up accordion to view biomechanical priming drills', () => {
    render(<App />);
    const warmupToggle = screen.getByRole('button', { name: /Warm-Up & Biomechanical Priming Sequence/i });
    expect(screen.getByText(/Rowing Machine Reverse Leg-Drive/i)).toBeInTheDocument();

    fireEvent.click(warmupToggle);
    expect(screen.queryByText(/Rowing Machine Reverse Leg-Drive/i)).not.toBeInTheDocument();

    fireEvent.click(warmupToggle);
    expect(screen.getByText(/Rowing Machine Reverse Leg-Drive/i)).toBeInTheDocument();
  });

  it('resets session logs when clicking the reset session button', () => {
    render(<App />);
    const doneButtons = screen.getAllByRole('button', { name: /Mark set 1 as completed/i });
    fireEvent.click(doneButtons[0]);

    const resetBtn = screen.getByRole('button', { name: /Reset session logs/i });
    fireEvent.click(resetBtn);

    expect(screen.getByText(/0%/)).toBeInTheDocument();
  });

  it('resets individual exercise card without wiping other exercises', () => {
    render(<App />);
    // Complete set 1 of first exercise
    const doneButtons = screen.getAllByRole('button', { name: /Mark set 1 as completed/i });
    fireEvent.click(doneButtons[0]);

    // Progress counter should be > 0%
    expect(screen.queryByText(/0%/)).not.toBeInTheDocument();

    // Click individual reset for Barbell Back Squat
    const cardResetBtn = screen.getByRole('button', { name: /Reset Barbell Back Squat sets/i });
    fireEvent.click(cardResetBtn);

    // Progress is now back to 0% because only that exercise had logged sets
    expect(screen.getByText(/0%/)).toBeInTheDocument();
  });

  it('toggles session overview card between collapsed summary and expanded views', () => {
    render(<App />);

    // Initially expanded: focus text is visible, Collapse button is present
    expect(screen.getByText(/VMO tendon remodeling, knee joint decompression/i)).toBeInTheDocument();
    const collapseBtn = screen.getByRole('button', { name: /Collapse session overview/i });
    expect(collapseBtn).toBeInTheDocument();

    // Click collapse
    fireEvent.click(collapseBtn);

    // Collapsed: focus text is hidden, Expand button is present
    expect(screen.queryByText(/VMO tendon remodeling, knee joint decompression/i)).not.toBeInTheDocument();
    const expandBtn = screen.getByRole('button', { name: /^Expand session overview$/i });
    expect(expandBtn).toBeInTheDocument();

    // Click expand
    fireEvent.click(expandBtn);

    // Expanded again: focus text is restored
    expect(screen.getByText(/VMO tendon remodeling, knee joint decompression/i)).toBeInTheDocument();
  });

  it('allows collapsing and expanding individual warm-up drill cards and auto-collapses on completion', () => {
    render(<App />);

    // In warm-up sequence, find a drill's details
    expect(screen.getByText(/Rowing Machine Reverse Leg-Drive/i)).toBeInTheDocument();
    expect(screen.getByText(/Simulates backward sled pulling at home/i)).toBeInTheDocument();

    // Collapse drill via its Collapse button
    const collapseDrillBtn = screen.getByRole('button', { name: /Collapse warmup drill Rowing Machine Reverse Leg-Drive/i });
    fireEvent.click(collapseDrillBtn);

    // Purpose text is now hidden
    expect(screen.queryByText(/Simulates backward sled pulling at home/i)).not.toBeInTheDocument();

    // Expand drill back
    const expandDrillBtn = screen.getByRole('button', { name: /Expand warmup drill Rowing Machine Reverse Leg-Drive/i });
    fireEvent.click(expandDrillBtn);
    expect(screen.getByText(/Simulates backward sled pulling at home/i)).toBeInTheDocument();

    // Auto-collapse when marking drill complete
    const completeDrillBtn = screen.getByRole('button', { name: /Mark drill Rowing Machine Reverse Leg-Drive as completed/i });
    fireEvent.click(completeDrillBtn);

    // Now auto-collapsed
    expect(screen.queryByText(/Simulates backward sled pulling at home/i)).not.toBeInTheDocument();
  });

  it('supports Focus Mode (Auto-Accordion), 1-Tap Collapse/Expand All, and Mobile Thumb-Zone Navigation', () => {
    render(<App />);

    // Toggle Focus Mode on: keeps first uncompleted exercise (Barbell Back Squat) expanded and collapses subsequent cards
    const focusBtn = screen.getByRole('button', { name: /Toggle Focus Mode/i });
    fireEvent.click(focusBtn);
    expect(focusBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Collapse Barbell Back Squat/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Expand ATG Split Squat/i })).toBeInTheDocument();

    // 1-Tap Collapse All cards
    const collapseAllBtn = screen.getByRole('button', { name: /Collapse all cards/i });
    fireEvent.click(collapseAllBtn);

    // 1-Tap Expand All cards
    const expandAllBtn = screen.getByRole('button', { name: /Expand all cards/i });
    fireEvent.click(expandAllBtn);
    expect(screen.getByRole('button', { name: /Collapse Barbell Back Squat/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Collapse ATG Split Squat/i })).toBeInTheDocument();

    // Mobile Thumb-Zone Navigation switches views
    const quickMobilityBtn = screen.getByRole('button', { name: /Quick switch to Mobility view/i });
    fireEvent.click(quickMobilityBtn);
    expect(screen.getByText(/Mobility & Flexibility Tracker/i)).toBeInTheDocument();
  });

  it('auto-fills target reps upon one-tap set check-off when reps achieved is 0', () => {
    render(<App />);

    const repsInputs = screen.getAllByLabelText(/Set 1 Reps Done/i);
    const firstSetRepsInput = repsInputs[0] as HTMLInputElement;
    expect(firstSetRepsInput.value).toBe('');

    // Click Done check button for set 1
    const doneButtons = screen.getAllByRole('button', { name: /Mark set 1 as completed/i });
    fireEvent.click(doneButtons[0]);

    // Target reps (3) auto-populates in input
    expect(firstSetRepsInput.value).toBe('3');
  });

  it('updates live session volume tonnage and shows the totals in the completion card when done', () => {
    render(<App />);

    // Initially 0 tonnage badge is hidden
    expect(screen.queryByTestId('session-tonnage-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('session-summary-card')).not.toBeInTheDocument();

    // Mark set 1 of Barbell Back Squat complete (auto-fills 3 reps at 185 lbs = 555 lbs tonnage)
    const doneButtons = screen.getAllByRole('button', { name: /Mark set 1 as completed/i });
    fireEvent.click(doneButtons[0]);

    // Live tonnage badge appears in session overview
    expect(screen.getByTestId('session-tonnage-badge')).toHaveTextContent(/Tonnage: 555 lbs/i);

    // Complete all exercises in session Lower A using exercise-level complete buttons
    const completeAllExButtons = screen.getAllByRole('button', { name: /Mark entire exercise .* as complete/i });
    completeAllExButtons.forEach((btn) => fireEvent.click(btn));

    // The completion card at the end carries the totals (no second scorecard at the top)
    expect(screen.queryByTestId('session-summary-card')).not.toBeInTheDocument();
    expect(screen.getByTestId('workout-completion-badge')).toHaveTextContent(/100 \/ 100 Done/i);
    expect(within(screen.getByTestId('workout-completion-card')).getByText(/Total Volume/i)).toBeInTheDocument();
  });

  it('switches to Readiness view and renders DailyReadinessWidget with check-in controls', () => {
    render(<App />);

    // Switch to Check-In tab
    const readinessTab = screen.getByRole('tab', { name: /Check-In/i });
    fireEvent.click(readinessTab);

    expect(screen.getByText(/Daily Body Readiness & Recovery Check-In/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Daily Body Feeling Journal Notes/i)).toBeInTheDocument();
  });

  it('marks bodyweight sets as complete when using the tempo metronome', () => {
    render(<App />);

    // Rep-based bodyweight work (Tibialis Wall Raises, 15-20 reps) has no tempo timer
    expect(screen.queryByTitle(/Launch tempo metronome for 2011/i)).not.toBeInTheDocument();

    // In Lower A, the Serratus Plank finisher is a timed bodyweight hold (30-45s)
    const plank = document.getElementById('exercise-card-t3_athlean_serratus_plank_lower_a')!;
    fireEvent.click(within(plank).getByTitle(/Launch tempo metronome for HOLD-45/i));

    // Metronome modal opens
    expect(screen.getByRole('dialog', { name: /Tempo Metronome/i })).toBeInTheDocument();

    // Click "Log Set Complete" in metronome
    const logCompleteBtn = screen.getByRole('button', { name: /Mark set complete/i });
    fireEvent.click(logCompleteBtn);

    // Close metronome modal
    const closeBtn = screen.getByRole('button', { name: /Close Metronome/i });
    fireEvent.click(closeBtn);

    // Plank Set 1 is now marked as complete (button label changed from 'as completed' to 'as incomplete')
    // a one-set exercise collapses once done: expand it to see the set
    const plankCard = within(document.getElementById('exercise-card-t3_athlean_serratus_plank_lower_a')!);
    const expand = plankCard.queryAllByRole('button', { name: /^Expand /i })[0];
    if (expand) fireEvent.click(expand);
    const completedSetBtn = plankCard.getByRole('button', { name: /Mark set 1 as incomplete/i });
    expect(completedSetBtn).toBeInTheDocument();
  });

  it('splits unilateral exercise into independent Left and Right side workouts with separate completion tracking', () => {
    render(<App />);

    // In Lower A, ATG Split Squat is an exercise with split button
    expect(screen.getByText('ATG Split Squat')).toBeInTheDocument();

    const splitBtn = screen.getByRole('button', {
      name: /Split ATG Split Squat into separate Left and Right workouts/i,
    });
    expect(splitBtn).toBeInTheDocument();

    // Click to split sides into independent workouts
    fireEvent.click(splitBtn);

    // Left and Right workout cards are rendered
    expect(screen.getByText('ATG Split Squat (Left Leg)')).toBeInTheDocument();
    expect(screen.getByText('ATG Split Squat (Right Leg)')).toBeInTheDocument();

    expect(screen.getByTestId('side-badge-left')).toBeInTheDocument();
    expect(screen.getByTestId('side-badge-right')).toBeInTheDocument();

    // Switch sides quick navigation buttons are present
    const switchBtns = screen.getAllByTestId('switch-to-paired-side-btn');
    expect(switchBtns.length).toBe(2);

    // Merge sides button merges back
    const mergeBtns = screen.getAllByTestId('merge-sides-btn');
    expect(mergeBtns.length).toBe(2);
    fireEvent.click(mergeBtns[0]);

    // Merged back to single unified card
    expect(screen.getByText('ATG Split Squat')).toBeInTheDocument();
    expect(screen.queryByText('ATG Split Squat (Left Leg)')).not.toBeInTheDocument();
  });

  it('splits and merges all unilateral exercises at once using session overview [L/R Sides] toggle', () => {
    render(<App />);

    const splitAllBtn = screen.getByTestId('split-all-unilateral-btn');
    expect(splitAllBtn).toBeInTheDocument();

    // Click split all
    fireEvent.click(splitAllBtn);

    // Unilateral exercises in Lower A are split (ATG Split Squat, Single-Leg Step-Downs)
    expect(screen.getByText('ATG Split Squat (Left Leg)')).toBeInTheDocument();
    expect(screen.getByText('ATG Split Squat (Right Leg)')).toBeInTheDocument();
    expect(screen.getByText('Single-Leg Step-Downs (Left Leg)')).toBeInTheDocument();
    expect(screen.getByText('Single-Leg Step-Downs (Right Leg)')).toBeInTheDocument();

    // Click again to merge all back
    fireEvent.click(splitAllBtn);

    expect(screen.getByText('ATG Split Squat')).toBeInTheDocument();
    expect(screen.getByText('Single-Leg Step-Downs')).toBeInTheDocument();
    expect(screen.queryByText('ATG Split Squat (Left Leg)')).not.toBeInTheDocument();
  });

  it('renders Workout Completion Card at the end of all exercise cards and allows 1-tap completion', () => {
    render(<App />);

    // Workout Completion Card is present
    const completionCard = screen.getByTestId('workout-completion-card');
    expect(completionCard).toBeInTheDocument();
    expect(screen.getByText(/Workout Completion/i)).toBeInTheDocument();

    // Mark Workout as Completed button is present
    const markCompleteBtn = screen.getByTestId('mark-workout-completed-btn');
    expect(markCompleteBtn).toBeInTheDocument();
    expect(markCompleteBtn).toHaveTextContent(/Mark Workout as Completed/i);

    // Click to complete entire workout
    fireEvent.click(markCompleteBtn);

    // Confirm completion and adjustments in modal
    const confirmBtn = screen.getByTestId('confirm-completion-adjustments-btn');
    fireEvent.click(confirmBtn);

    // Automatically advances to Upper A and displays celebratory announcement toast
    const completionToast = screen.getByTestId('session-completion-toast');
    expect(completionToast).toBeInTheDocument();
    expect(screen.getByText(/Lower A Completed!/i)).toBeInTheDocument();
    expect(screen.getByText(/Moved to Upper A/i)).toBeInTheDocument();

    // In SessionNav, Lower A is automatically hidden
    expect(screen.queryByRole('button', { name: /^Lower A/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('toggle-hide-completed-sessions-btn')).toHaveTextContent(/Show Completed \(1\)/i);

    // View Lower A via toast shortcut to inspect completed card
    const viewCompletedBtn = screen.getByRole('button', { name: /View Lower A/i });
    fireEvent.click(viewCompletedBtn);

    // Badge on Lower A confirms 100 Done
    expect(screen.getByTestId('workout-completion-badge')).toHaveTextContent(/100 Done/i);
    // one finish button only ("Next Workout" did the same thing and was removed)
    expect(screen.queryByTestId('move-to-next-session-btn')).not.toBeInTheDocument();

    // Post-workout shortcuts are available
    const stretchShortcutBtn = screen.getByRole('button', { name: /Post-Workout Stretching ➔/i });
    expect(stretchShortcutBtn).toBeInTheDocument();

    fireEvent.click(stretchShortcutBtn);
    expect(screen.getByText(/Evidence-Based Stretching Routine/i)).toBeInTheDocument();
  });
});




