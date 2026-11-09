// tests/components/ExerciseCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ExerciseCard, SetLogRecord } from '../../src/components/ExerciseCard';
import { WorkoutExercise } from '../../src/domain/programData';

const mockExercise: WorkoutExercise = {
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

const mockLogs: SetLogRecord[] = [
  { setNumber: 1, targetReps: '3', weightLbs: 185, repsAchieved: 3, isCompleted: false, notes: '' },
  { setNumber: 2, targetReps: '3', weightLbs: 185, repsAchieved: 3, isCompleted: false, notes: '' },
  { setNumber: 3, targetReps: '3', weightLbs: 185, repsAchieved: 5, isCompleted: false, notes: '' },
];

// Same lift prescribed by time: timed exercises keep the tempo / hold timers
const timedExercise: WorkoutExercise = { ...mockExercise, targetReps: '45s' };

describe('ExerciseCard Component', () => {
  it('renders exercise header, GZCL tier badge, equipment, AMRAP indicator, and muscles', () => {
    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={mockLogs}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
      />
    );

    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
    expect(screen.getByText(/T1 · Tier 1 \(Strength & AMRAP\)/i)).toBeInTheDocument();
    expect(screen.getByText('barbell')).toBeInTheDocument();
    expect(screen.getByText(/AMRAP Last Set/i)).toBeInTheDocument();
    expect(screen.getByText(/Quadriceps, Glutes, Adductors/i)).toBeInTheDocument();
  });

  it('renders knee-safety protocol callout for knee-sensitive exercises', () => {
    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={mockLogs}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
      />
    );

    expect(screen.getByText(/Knee Tendinitis Safety Protocol:/i)).toBeInTheDocument();
    expect(screen.getByText(/Maintain a strict 3-4 second slow eccentric descent/i)).toBeInTheDocument();
  });

  it('triggers quick rest timer and tempo metronome launchers', () => {
    const onRestMock = vi.fn();
    const onTempoMock = vi.fn();

    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={mockLogs}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={onRestMock}
        onQuickStartTempo={onTempoMock}
      />
    );

    // A rep-based barbell lift has no tempo, hold or set timers, only the rest timer
    expect(screen.queryByTitle(/Launch Marcus Filly metronome/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('inline-tempo-header-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('start-tempo-set-1')).not.toBeInTheDocument();
    expect(onTempoMock).not.toHaveBeenCalled();

    const restBtn = screen.getByTitle(/Start 180s rest timer/i);
    fireEvent.click(restBtn);
    expect(onRestMock).toHaveBeenCalledWith(180);
  });

  it('keeps the tempo launcher on exercises prescribed by time', () => {
    const onTempoMock = vi.fn();
    render(
      <ExerciseCard
        exercise={timedExercise}
        logs={mockLogs}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={onTempoMock}
      />
    );
    fireEvent.click(screen.getByTitle(/Launch Marcus Filly metronome for 31X1/i));
    expect(onTempoMock).toHaveBeenCalledWith('31X1', 't1_bb_squat');
    expect(screen.getByTestId('start-tempo-set-1')).toBeInTheDocument();
  });

  it('handles set completion checkbox toggle and starts rest timer', () => {
    const updateLogMock = vi.fn();
    const restMock = vi.fn();

    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={mockLogs}
        onUpdateSetLog={updateLogMock}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={restMock}
        onQuickStartTempo={vi.fn()}
      />
    );

    const doneButtons = screen.getAllByRole('button', { name: /Mark set \d as completed/i });
    fireEvent.click(doneButtons[0]);

    expect(updateLogMock).toHaveBeenCalledWith('t1_bb_squat', 0, { isCompleted: true });
    expect(restMock).toHaveBeenCalledWith(180);
  });

  it('updates weight and reps inputs dynamically', () => {
    const updateLogMock = vi.fn();

    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={mockLogs}
        onUpdateSetLog={updateLogMock}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
      />
    );

    const weightInputs = screen.getAllByLabelText(/Weight \(lbs\)/i);
    fireEvent.change(weightInputs[0], { target: { value: '205' } });
    expect(updateLogMock).toHaveBeenCalledWith('t1_bb_squat', 0, { weightLbs: 205 });

    const repsInputs = screen.getAllByLabelText(/Reps Done/i);
    fireEvent.change(repsInputs[0], { target: { value: '4' } });
    expect(updateLogMock).toHaveBeenCalledWith('t1_bb_squat', 0, { repsAchieved: 4 });
  });

  it('launches plate calculator for barbell exercises with weight', () => {
    const plateCalcMock = vi.fn();

    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={mockLogs}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
        onOpenPlateCalculator={plateCalcMock}
      />
    );

    // plates are shown without tapping anything; "Bar view" opens the full loader
    expect(screen.getByTestId('plate-load-t1_bb_squat-185')).toHaveTextContent(/185 lb.*45.*25/);
    fireEvent.click(screen.getByRole('button', { name: /Show bar view for 185 lbs/i }));
    expect(plateCalcMock).toHaveBeenCalledWith(185);
  });

  it('toggles pain-free regression callout and biomechanical rationale', () => {
    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={mockLogs}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
      />
    );

    // Regression toggle
    const regressionBtn = screen.getByRole('button', { name: /Need a pain-free regression/i });
    fireEvent.click(regressionBtn);
    expect(screen.getAllByText(/Barbell Box Squat to Parallel/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Patellar tendon pain > 2\/10/i)).toBeInTheDocument();

    // Rationale toggle
    const rationaleBtn = screen.getByRole('button', { name: /Biomechanical Rationale/i });
    fireEvent.click(rationaleBtn);
    expect(screen.getByText(/Primary GZCL strength foundation/i)).toBeInTheDocument();
    expect(screen.getByText(/Add 10 lbs weekly/i)).toBeInTheDocument();
  });

  it('calls onOpenCueCard when View Creator Cues is clicked', () => {
    const openCueCardMock = vi.fn();

    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={mockLogs}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={openCueCardMock}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
      />
    );

    const cuesBtn = screen.getByRole('button', { name: /View Creator Cues & Science/i });
    fireEvent.click(cuesBtn);
    expect(openCueCardMock).toHaveBeenCalledWith('t1_bb_squat');
  });

  it('toggles entire exercise completion with the exercise-level checkbox', () => {
    const updateLogMock = vi.fn();
    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={mockLogs}
        onUpdateSetLog={updateLogMock}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
      />
    );

    const toggleBtn = screen.getByRole('button', { name: /Mark entire exercise Barbell Back Squat as complete/i });
    fireEvent.click(toggleBtn);

    expect(updateLogMock).toHaveBeenCalledTimes(3);
    expect(updateLogMock).toHaveBeenCalledWith('t1_bb_squat', 0, { isCompleted: true });
    expect(updateLogMock).toHaveBeenCalledWith('t1_bb_squat', 1, { isCompleted: true });
    expect(updateLogMock).toHaveBeenCalledWith('t1_bb_squat', 2, { isCompleted: true });
  });

  it('toggles step-by-step instructions drawer and displays execution protocol', () => {
    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={mockLogs}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
      />
    );

    const instructionsBtn = screen.getByRole('button', { name: /Step-by-Step Instructions/i });
    fireEvent.click(instructionsBtn);

    expect(screen.getByText(/Step-by-Step Execution Protocol/i)).toBeInTheDocument();
    expect(screen.getByText(/Phase 1 — Equipment & Barbell Placement/i)).toBeInTheDocument();
    expect(screen.getByText(/Phase 3 — 360° Diaphragmatic Breath & Core Cylinder Brace/i)).toBeInTheDocument();

    // Click again to hide
    const hideBtn = screen.getByRole('button', { name: /Hide Instructions/i });
    fireEvent.click(hideBtn);
    expect(screen.queryByText(/Step-by-Step Execution Protocol/i)).not.toBeInTheDocument();
  });

  it('collapses and expands card manually using Collapse and Expand buttons', () => {
    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={mockLogs}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
      />
    );

    // Initially expanded - Set 1 input is visible
    expect(screen.getByLabelText(/Set 1 Weight \(lbs\)/i)).toBeInTheDocument();

    // Click collapse button
    const collapseBtn = screen.getByRole('button', { name: /Collapse Barbell Back Squat/i });
    fireEvent.click(collapseBtn);

    // Collapsed: Set table hidden, Expand button visible
    expect(screen.queryByLabelText(/Set 1 Weight \(lbs\)/i)).not.toBeInTheDocument();
    const expandBtn = screen.getByRole('button', { name: /Expand Barbell Back Squat/i });
    expect(expandBtn).toBeInTheDocument();

    // Click expand
    fireEvent.click(expandBtn);
    expect(screen.getByLabelText(/Set 1 Weight \(lbs\)/i)).toBeInTheDocument();
  });

  it('auto-collapses card into compact summary when all sets are completed', () => {
    const completedLogs: SetLogRecord[] = [
      { setNumber: 1, targetReps: '3', weightLbs: 185, repsAchieved: 3, isCompleted: true, notes: '' },
      { setNumber: 2, targetReps: '3', weightLbs: 185, repsAchieved: 3, isCompleted: true, notes: '' },
      { setNumber: 3, targetReps: '3', weightLbs: 185, repsAchieved: 5, isCompleted: true, notes: '' },
    ];

    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={completedLogs}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
      />
    );

    // Because isExerciseCompleted is true, it renders in collapsed summary state by default
    expect(screen.getByText(/Done \(3\/3\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Expand Barbell Back Squat/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Set 1 Weight \(lbs\)/i)).not.toBeInTheDocument();

    // User can expand to view details if desired
    fireEvent.click(screen.getByRole('button', { name: /Expand Barbell Back Squat/i }));
    expect(screen.getByLabelText(/Set 1 Weight \(lbs\)/i)).toBeInTheDocument();
  });

  it('calls onResetExercise and uncollapses card when reset button is clicked in expanded state', () => {
    const onResetMock = vi.fn();
    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={mockLogs}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
        onResetExercise={onResetMock}
      />
    );

    const resetBtn = screen.getByRole('button', { name: /Reset Barbell Back Squat sets/i });
    fireEvent.click(resetBtn);

    expect(onResetMock).toHaveBeenCalledWith('t1_bb_squat');
  });

  it('calls onResetExercise and expands card when reset button is clicked in collapsed state', () => {
    const completedLogs: SetLogRecord[] = [
      { setNumber: 1, targetReps: '3', weightLbs: 185, repsAchieved: 3, isCompleted: true, notes: '' },
      { setNumber: 2, targetReps: '3', weightLbs: 185, repsAchieved: 3, isCompleted: true, notes: '' },
      { setNumber: 3, targetReps: '3', weightLbs: 185, repsAchieved: 5, isCompleted: true, notes: '' },
    ];
    const onResetMock = vi.fn();

    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={completedLogs}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
        onResetExercise={onResetMock}
      />
    );

    // Initial state: auto-collapsed
    expect(screen.queryByLabelText(/Set 1 Weight \(lbs\)/i)).not.toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /Reset Barbell Back Squat sets/i });
    fireEvent.click(resetBtn);

    expect(onResetMock).toHaveBeenCalledWith('t1_bb_squat');
    // Card should now be expanded
    expect(screen.getByLabelText(/Set 1 Weight \(lbs\)/i)).toBeInTheDocument();
  });

  it('falls back to resetting each set via onUpdateSetLog when onResetExercise is omitted', () => {
    const updateLogMock = vi.fn();
    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={mockLogs}
        onUpdateSetLog={updateLogMock}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
      />
    );

    const resetBtn = screen.getByRole('button', { name: /Reset Barbell Back Squat sets/i });
    fireEvent.click(resetBtn);

    expect(updateLogMock).toHaveBeenCalledWith('t1_bb_squat', 0, {
      isCompleted: false,
      repsAchieved: 0,
      notes: '',
    });
    expect(updateLogMock).toHaveBeenCalledWith('t1_bb_squat', 1, {
      isCompleted: false,
      repsAchieved: 0,
      notes: '',
    });
    expect(updateLogMock).toHaveBeenCalledWith('t1_bb_squat', 2, {
      isCompleted: false,
      repsAchieved: 0,
      notes: '',
    });
  });

  it('toggles Knee Safety Protocol between compact summary and expanded details', () => {
    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={mockLogs}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
      />
    );

    const toggleBtn = screen.getByRole('button', { name: /Expand Knee Safety Protocol/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Details')).toBeInTheDocument();

    // Click to expand details
    fireEvent.click(toggleBtn);
    expect(screen.getByRole('button', { name: /Collapse Knee Safety Protocol/i })).toBeInTheDocument();
    expect(screen.getByText('Hide')).toBeInTheDocument();

    // Click to collapse back
    fireEvent.click(screen.getByRole('button', { name: /Collapse Knee Safety Protocol/i }));
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('submits set on Enter key press in Reps Done input and starts rest timer', () => {
    const updateLogMock = vi.fn();
    const restMock = vi.fn();

    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={mockLogs}
        onUpdateSetLog={updateLogMock}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={restMock}
        onQuickStartTempo={vi.fn()}
      />
    );

    const repsInputs = screen.getAllByLabelText(/Set 1 Reps Done/i);
    fireEvent.keyDown(repsInputs[0], { key: 'Enter' });

    expect(updateLogMock).toHaveBeenCalledWith('t1_bb_squat', 0, {
      isCompleted: true,
    });
    expect(restMock).toHaveBeenCalledWith(180);
  });

  it('auto-fills target reps on Enter key when repsAchieved is 0', () => {
    const zeroLogs: SetLogRecord[] = [
      { setNumber: 1, targetReps: '5', weightLbs: 185, repsAchieved: 0, isCompleted: false, notes: '' },
    ];
    const updateLogMock = vi.fn();
    const restMock = vi.fn();

    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={zeroLogs}
        onUpdateSetLog={updateLogMock}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={restMock}
        onQuickStartTempo={vi.fn()}
      />
    );

    const repsInput = screen.getByLabelText(/Set 1 Reps Done/i);
    fireEvent.keyDown(repsInput, { key: 'Enter' });

    expect(updateLogMock).toHaveBeenCalledWith('t1_bb_squat', 0, {
      isCompleted: true,
      repsAchieved: 5,
    });
    expect(restMock).toHaveBeenCalledWith(180);
  });

  it('toggles Barbell Warm-Up Ramp Generator, checks off warm-up sets with 60s rest, and opens Plate Calculator', () => {
    const restMock = vi.fn();
    const plateMock = vi.fn();

    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={mockLogs}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={restMock}
        onQuickStartTempo={vi.fn()}
        onOpenPlateCalculator={plateMock}
      />
    );

    const warmupBtn = screen.getByRole('button', { name: /Toggle warm-up ramp for Barbell Back Squat/i });
    fireEvent.click(warmupBtn);

    expect(screen.getByTestId('warmup-ramp-panel')).toBeInTheDocument();
    expect(screen.getByText(/Progressive Barbell Warm-Up Ramp \(Working Load: 185 lbs\)/i)).toBeInTheDocument();

    // Check off Warm-Up Stage 1 (triggers 60s rest)
    const stage1Check = screen.getByRole('button', { name: /Mark warm-up stage 1 as completed/i });
    fireEvent.click(stage1Check);
    expect(restMock).toHaveBeenCalledWith(60);

    // Warm-Up Stage 2 (50% of 185 = 95 lbs) shows its plates per side right on the card
    expect(screen.getByTestId('warmup-plates-2')).toHaveTextContent('per side: 25');
    void plateMock;
  });

  it('toggles 1-Tap RPE & Knee Pain Quick-Chips on the active set notes', () => {
    const updateLogMock = vi.fn();

    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={mockLogs}
        onUpdateSetLog={updateLogMock}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
      />
    );

    const rpeChip = screen.getByRole('button', { name: /Quick tag @RPE 8 for Barbell Back Squat/i });
    fireEvent.click(rpeChip);

    // Active uncompleted set is Set 1 (index 0)
    expect(updateLogMock).toHaveBeenCalledWith('t1_bb_squat', 0, {
      notes: '@RPE 8',
    });
  });

  it('displays live e1RM, Volume Tonnage, and New PR! badge when a completed set exceeds baseline', () => {
    const prLogs: SetLogRecord[] = [
      { setNumber: 1, targetReps: '5', weightLbs: 205, repsAchieved: 6, isCompleted: true, notes: '' },
      { setNumber: 2, targetReps: '5', weightLbs: 185, repsAchieved: 5, isCompleted: false, notes: '' },
    ];

    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={prLogs}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
      />
    );

    // 205 * (1 + 6/30) = 246 lbs e1RM, 205 * 6 = 1,230 lbs volume
    expect(screen.getByText(/e1RM: 246 lbs/i)).toBeInTheDocument();
    expect(screen.getByText(/Vol: 1,230 lbs/i)).toBeInTheDocument();
    expect(screen.getByTestId('pr-badge')).toBeInTheDocument();
    expect(screen.getByText(/New PR!/i)).toBeInTheDocument();
  });

  it('swaps to pain-free regression with 1 tap and updates active tempo cadence', () => {
    const tempoMock = vi.fn();
    const exerciseWithDistinctRegressionTempo: WorkoutExercise = {
      ...timedExercise,
      regression: {
        ...mockExercise.regression!,
        tempo: '3210',
      },
    };

    render(
      <ExerciseCard
        exercise={exerciseWithDistinctRegressionTempo}
        logs={mockLogs}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={tempoMock}
      />
    );

    const swapBtn = screen.getByRole('button', { name: /Swap Barbell Back Squat to regression Barbell Box Squat to Parallel/i });
    fireEvent.click(swapBtn);

    expect(screen.getByTestId('active-regression-badge')).toHaveTextContent(/Swapped: Barbell Box Squat to Parallel/i);

    // Clicking Tempo Pacer now uses regression tempo ('3210') instead of primary tempo ('31X1')
    const tempoBtn = screen.getByTitle(/Launch Marcus Filly metronome for 3210/i);
    fireEvent.click(tempoBtn);
    expect(tempoMock).toHaveBeenCalledWith('3210', 't1_bb_squat');
  });

  it('transforms the card title and renders regression banner when swapped to regression', () => {
    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={mockLogs}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
      />
    );

    // Initial state shows Barbell Back Squat
    expect(screen.getByRole('heading', { level: 2, name: 'Barbell Back Squat' })).toBeInTheDocument();

    // Swap to regression
    const swapBtn = screen.getByRole('button', { name: /Swap Barbell Back Squat to regression Barbell Box Squat to Parallel/i });
    fireEvent.click(swapBtn);

    // Heading transforms to regression name
    expect(screen.getByRole('heading', { level: 2, name: 'Barbell Box Squat to Parallel' })).toBeInTheDocument();
    expect(screen.getByText(/Regressed from primary: Barbell Back Squat/i)).toBeInTheDocument();

    const banner = screen.getByTestId('active-regression-card-banner');
    expect(banner).toBeInTheDocument();
    expect(within(banner).getByText(/Active Regression: Barbell Box Squat to Parallel/i)).toBeInTheDocument();
    expect(within(banner).getByText(/Pause 1s on box without relaxing core/i)).toBeInTheDocument();

    // Restoring primary restores the title
    const restoreBtn = screen.getAllByRole('button', { name: /Restore primary/i })[0];
    fireEvent.click(restoreBtn);
    expect(screen.getByRole('heading', { level: 2, name: 'Barbell Back Squat' })).toBeInTheDocument();
  });

  it('renders the AMRAP reminder banner without a stopwatch', () => {
    const updateLogMock = vi.fn();
    const restMock = vi.fn();

    render(
      <ExerciseCard
        exercise={mockExercise}
        logs={mockLogs}
        onUpdateSetLog={updateLogMock}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={restMock}
        onQuickStartTempo={vi.fn()}
      />
    );

    // AMRAP Banner is displayed
    expect(screen.getByTestId('amrap-reminder-banner')).toBeInTheDocument();
    expect(screen.getByText(/Final Set: As Many Reps As Possible \(AMRAP\)!/i)).toBeInTheDocument();
    expect(screen.getByText(/Leave 1 rep in reserve/i)).toBeInTheDocument();

    // Goal column shows AMRAP target
    expect(screen.getByText('3+')).toBeInTheDocument();
    expect(screen.getByText('MAX')).toBeInTheDocument();

    // Voice Cue button is present
    const voiceCueBtn = screen.getByRole('button', { name: /Play AMRAP voice prompt/i });
    expect(voiceCueBtn).toBeInTheDocument();
    fireEvent.click(voiceCueBtn);

    // The AMRAP stopwatch was removed: the banner is a reminder only
    expect(screen.queryByRole('button', { name: /AMRAP (Set )?Timer/i })).not.toBeInTheDocument();
    expect(updateLogMock).not.toHaveBeenCalled();
    expect(restMock).not.toHaveBeenCalled();
  });

  describe('Inline Card Tempo Metronome & Unilateral Side Workouts', () => {
    it('starts inline tempo metronome from the card header button and renders inline tempo panel', () => {
      render(
        <ExerciseCard
          exercise={timedExercise}
          logs={mockLogs}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );

      // Header inline tempo button is present
      const inlineTempoBtn = screen.getByTestId('inline-tempo-header-btn');
      expect(inlineTempoBtn).toBeInTheDocument();
      expect(inlineTempoBtn).toHaveTextContent(/Tempo: 31X1/i);

      // Click to start inline tempo
      fireEvent.click(inlineTempoBtn);

      // Inline tempo panel appears
      expect(screen.getByTestId('inline-tempo-panel')).toBeInTheDocument();
      expect(screen.getByText(/Tempo Cadence/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Log Set Done/i })).toBeInTheDocument();
      expect(screen.getByTestId('inline-tempo-pause-resume-btn')).toBeInTheDocument();
    });

    it('starts inline tempo for a specific set from the set row play button and logs completion', () => {
      const updateLogMock = vi.fn();
      const restMock = vi.fn();

      render(
        <ExerciseCard
          exercise={timedExercise}
          logs={mockLogs}
          onUpdateSetLog={updateLogMock}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={restMock}
          onQuickStartTempo={vi.fn()}
        />
      );

      // Click row play button for Set 2
      const set2PlayBtn = screen.getByTestId('start-tempo-set-2');
      expect(set2PlayBtn).toBeInTheDocument();
      fireEvent.click(set2PlayBtn);

      // Inline tempo panel shows targeting Set 2
      expect(screen.getByTestId('inline-tempo-panel')).toBeInTheDocument();
      expect(screen.getByText(/Set 2 · Rep/i)).toBeInTheDocument();

      // Click "Log Set Done"
      const logDoneBtn = screen.getByRole('button', { name: /Log Set Done/i });
      fireEvent.click(logDoneBtn);

      // Should have logged set 2 completion
      expect(updateLogMock).toHaveBeenCalledWith('t1_bb_squat', 1, expect.objectContaining({
        isCompleted: true,
      }));
      expect(restMock).toHaveBeenCalledWith(180);
    });

    it('renders unilateral split-sides button for unilateral exercises and fires onToggleSplitSides', () => {
      const toggleSplitSidesMock = vi.fn();
      const mockUnilateralEx: WorkoutExercise = {
        ...mockExercise,
        id: 't2_atg_split_squat',
        name: 'ATG Split Squat',
        isUnilateral: true,
      };

      render(
        <ExerciseCard
          exercise={mockUnilateralEx}
          logs={mockLogs}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
          onToggleSplitSides={toggleSplitSidesMock}
        />
      );

      const splitBtn = screen.getByTestId('split-sides-btn');
      expect(splitBtn).toBeInTheDocument();
      expect(splitBtn).toHaveTextContent(/Switch Sides: Create L\/R Workouts/i);

      fireEvent.click(splitBtn);
      expect(toggleSplitSidesMock).toHaveBeenCalledWith('t2_atg_split_squat');
    });

    it('renders Left Side workout badge and Switch to Right Side button with scroll navigation', () => {
      const switchToPairedSideMock = vi.fn();
      const mockLeftEx: WorkoutExercise = {
        ...mockExercise,
        id: 't2_atg_split_squat__side_left',
        baseExerciseId: 't2_atg_split_squat',
        name: 'ATG Split Squat (Left Leg)',
        side: 'left',
        isUnilateral: true,
      };

      render(
        <ExerciseCard
          exercise={mockLeftEx}
          logs={mockLogs}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
          onSwitchToPairedSide={switchToPairedSideMock}
        />
      );

      // Badge displays Left Side Workout
      expect(screen.getByTestId('side-badge-left')).toBeInTheDocument();
      expect(screen.getByText('Left Side Workout')).toBeInTheDocument();

      // Switch to Right Side button is rendered
      const switchBtn = screen.getByTestId('switch-to-paired-side-btn');
      expect(switchBtn).toBeInTheDocument();
      expect(switchBtn).toHaveTextContent(/Switch to Right Side ➜/i);

      fireEvent.click(switchBtn);
      expect(switchToPairedSideMock).toHaveBeenCalledWith('t2_atg_split_squat__side_right');
    });

    it('renders Right Side workout badge and Merge Sides button', () => {
      const toggleSplitSidesMock = vi.fn();
      const mockRightEx: WorkoutExercise = {
        ...mockExercise,
        id: 't2_atg_split_squat__side_right',
        baseExerciseId: 't2_atg_split_squat',
        name: 'ATG Split Squat (Right Leg)',
        side: 'right',
        isUnilateral: true,
      };

      render(
        <ExerciseCard
          exercise={mockRightEx}
          logs={mockLogs}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
          onToggleSplitSides={toggleSplitSidesMock}
        />
      );

      // Badge displays Right Side Workout
      expect(screen.getByTestId('side-badge-right')).toBeInTheDocument();
      expect(screen.getByText('Right Side Workout')).toBeInTheDocument();

      // Merge sides button is rendered
      const mergeBtn = screen.getByTestId('merge-sides-btn');
      expect(mergeBtn).toBeInTheDocument();
      expect(mergeBtn).toHaveTextContent(/Merge Sides/i);

      fireEvent.click(mergeBtn);
      expect(toggleSplitSidesMock).toHaveBeenCalledWith('t2_atg_split_squat');
    });
  });

  describe('Dr. Stuart McGill Big 3 Tri-Set Protocol & Time Formatting', () => {
    const mcgillExercise: WorkoutExercise = {
      id: 't3_mcgill_big_3',
      name: 'Dr. Stuart McGill Big 3 Endurance Tri-Set',
      tier: 'T3',
      targetSets: 3,
      targetReps: '3 rounds',
      isAmrapLastSet: false,
      tempo: 'Isometric Holds',
      restSeconds: 60,
      equipment: 'bodyweight',
      muscleGroups: ['Rectus Abdominis', 'Quadratus Lumborum', 'Obliques', 'Multifidus', 'Glutes'],
      biomechanicalRationale: 'Spares lumbar discs while building isometric core endurance ratios.',
      progressionRule: 'Maintain 3x10s perfect form holds.',
    };

    const mcgillLogs: SetLogRecord[] = [
      { setNumber: 1, targetReps: '3 rounds', weightLbs: 0, repsAchieved: 0, isCompleted: false, notes: '' },
      { setNumber: 2, targetReps: '3 rounds', weightLbs: 0, repsAchieved: 0, isCompleted: false, notes: '' },
      { setNumber: 3, targetReps: '3 rounds', weightLbs: 0, repsAchieved: 0, isCompleted: false, notes: '' },
    ];

    it('renders McGill Big 3 Tri-Set Protocol Panel with round tabs and all 3 drills', () => {
      render(
        <ExerciseCard
          exercise={mcgillExercise}
          logs={mcgillLogs}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );

      // Protocol panel is rendered
      expect(screen.getByTestId('mcgill-big3-protocol')).toBeInTheDocument();
      expect(screen.getByText(/Dr. McGill Big 3 Core Endurance Protocol/i)).toBeInTheDocument();

      // Round tabs
      expect(screen.getByTestId('mcgill-round-tab-1')).toBeInTheDocument();
      expect(screen.getByTestId('mcgill-round-tab-2')).toBeInTheDocument();
      expect(screen.getByTestId('mcgill-round-tab-3')).toBeInTheDocument();

      // All 3 constituent drills are rendered
      expect(screen.getByTestId('mcgill-drill-curl_up')).toBeInTheDocument();
      expect(screen.getByText('1. Modified Curl-Up')).toBeInTheDocument();
      expect(screen.getByTestId('mcgill-drill-side_bridge')).toBeInTheDocument();
      expect(screen.getByText('2. Side Bridge / Plank')).toBeInTheDocument();
      expect(screen.getByTestId('mcgill-drill-bird_dog')).toBeInTheDocument();
      expect(screen.getByText('3. Quadruped Bird-Dog')).toBeInTheDocument();
    });

    it('allows 1-tap round completion marking 3/3 drills complete and triggering rest timer', () => {
      const updateSetLogMock = vi.fn();
      const quickRestMock = vi.fn();

      render(
        <ExerciseCard
          exercise={mcgillExercise}
          logs={mcgillLogs}
          onUpdateSetLog={updateSetLogMock}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={quickRestMock}
          onQuickStartTempo={vi.fn()}
        />
      );

      const round1CompleteBtn = screen.getByTestId('mcgill-round-1-complete-btn');
      expect(round1CompleteBtn).toBeInTheDocument();
      expect(round1CompleteBtn).toHaveTextContent(/Mark Round 1 Complete/i);

      fireEvent.click(round1CompleteBtn);

      expect(updateSetLogMock).toHaveBeenCalledWith('t3_mcgill_big_3', 0, {
        isCompleted: true,
        repsAchieved: 3,
        weightLbs: 0,
        notes: '3/3 Drills Complete · McGill Tri-Set',
      });
      expect(quickRestMock).toHaveBeenCalledWith(60);
    });

    it('adapts set table columns for McGill with Round labeling, 3 Drills goal, and BW load', () => {
      render(
        <ExerciseCard
          exercise={mcgillExercise}
          logs={mcgillLogs}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );

      // Set column shows R1, R2, R3
      expect(screen.getByText('R1')).toBeInTheDocument();
      expect(screen.getByText('R2')).toBeInTheDocument();
      expect(screen.getByText('R3')).toBeInTheDocument();

      // Goal column shows 3 Drills
      expect(screen.getAllByText('3 Drills').length).toBeGreaterThanOrEqual(1);

      // Weight column shows BW
      expect(screen.getAllByText('BW').length).toBe(3);
    });

    it('formats quick rest button time using MM:SS format', () => {
      render(
        <ExerciseCard
          exercise={mockExercise}
          logs={mockLogs}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );

      // Exercise restSeconds is 180s -> should show 180s (03:00)
      expect(screen.getByText(/180s \(03:00\)/i)).toBeInTheDocument();
    });
  });

  describe('Barbell Plate Loading Calculator on Barbell Cards vs Non-Barbell Cards', () => {
    it('renders Plate Calculator toggle button in header for barbell exercises', () => {
      render(
        <ExerciseCard
          exercise={mockExercise}
          logs={mockLogs}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );

      const toggleBtn = screen.getByTestId('barbell-plates-toggle-t1_bb_squat');
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn).toHaveTextContent(/Bar view/i);

      // Initially closed
      expect(screen.queryByTestId('inline-plate-calculator-t1_bb_squat')).not.toBeInTheDocument();

      // Click to open
      fireEvent.click(toggleBtn);
      expect(screen.getByTestId('inline-plate-calculator-t1_bb_squat')).toBeInTheDocument();
      expect(screen.getByText(/Barbell Plate Loader:/i)).toBeInTheDocument();
      expect(screen.getByText(/Barbell Plate Loading Calculator/i)).toBeInTheDocument();

      // Click to close
      fireEvent.click(toggleBtn);
      expect(screen.queryByTestId('inline-plate-calculator-t1_bb_squat')).not.toBeInTheDocument();
    });

    it('shows plates for each working weight without tapping, and opens the bar view for one', () => {
      render(
        <ExerciseCard
          exercise={mockExercise}
          logs={mockLogs}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );

      expect(screen.getByTestId('plate-load-strip-t1_bb_squat')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Show bar view for 185 lbs/i }));

      expect(screen.getByTestId('inline-plate-calculator-t1_bb_squat')).toBeInTheDocument();
      expect(screen.getAllByText(/185 lbs/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/\[45, 25\]/i)).toBeInTheDocument();
    });

    it('does NOT render plate calculator button or drawer for non-barbell movements (kettlebell, bodyweight, clubs)', () => {
      const nonBarbellExercise: WorkoutExercise = {
        ...mockExercise,
        id: 't2_kb_good_morning',
        name: 'Kettlebell Good Morning',
        equipment: 'kettlebell',
      };

      render(
        <ExerciseCard
          exercise={nonBarbellExercise}
          logs={mockLogs}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );

      expect(screen.queryByTestId('barbell-plates-toggle-t2_kb_good_morning')).not.toBeInTheDocument();
      expect(screen.queryByTestId('inline-plate-calculator-t2_kb_good_morning')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Calculate plates/i)).not.toBeInTheDocument();
    });
  });

  describe('UI Wording, Equipment Formatting, and Target Reps Rendering', () => {
    it('renders clean target sets and reps formatting without duplicate reps units', () => {
      // 1. Standard rep count: "3" with 3 sets -> "3 sets × 3 reps"
      const { rerender } = render(
        <ExerciseCard
          exercise={mockExercise}
          logs={mockLogs}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );
      expect(screen.getByText(/3 sets × 3 reps/i)).toBeInTheDocument();

      // 2. Singular set with explicit reps unit: "1 set x 20 Effective Reps"
      const effectiveRepsEx: WorkoutExercise = {
        ...mockExercise,
        targetSets: 1,
        targetReps: '20 Effective Reps',
      };
      rerender(
        <ExerciseCard
          exercise={effectiveRepsEx}
          logs={[{ setNumber: 1, targetReps: '20 Effective Reps', weightLbs: 0, repsAchieved: 0, isCompleted: false, notes: '' }]}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );
      expect(screen.getByText(/1 set × 20 Effective Reps/i)).toBeInTheDocument();
      expect(screen.queryByText(/reps reps/i)).not.toBeInTheDocument();

      // 3. Timed hold: "45–60s"
      const timedHoldEx: WorkoutExercise = {
        ...mockExercise,
        targetSets: 3,
        targetReps: '45–60s',
      };
      rerender(
        <ExerciseCard
          exercise={timedHoldEx}
          logs={mockLogs}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );
      expect(screen.getByText(/3 sets × 45–60s/i)).toBeInTheDocument();
      expect(screen.queryByText(/45–60s reps/i)).not.toBeInTheDocument();

      // 4. Timed isometric hold: "20–30s hold"
      const holdEx: WorkoutExercise = {
        ...mockExercise,
        targetSets: 3,
        targetReps: '20–30s hold',
      };
      rerender(
        <ExerciseCard
          exercise={holdEx}
          logs={mockLogs}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );
      expect(screen.getByText(/3 sets × 20–30s hold/i)).toBeInTheDocument();
      expect(screen.queryByText(/20–30s hold reps/i)).not.toBeInTheDocument();

      // 5. Distance per side: "50 feet / side"
      const distanceEx: WorkoutExercise = {
        ...mockExercise,
        targetSets: 3,
        targetReps: '50 feet / side',
      };
      rerender(
        <ExerciseCard
          exercise={distanceEx}
          logs={mockLogs}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );
      expect(screen.getByText(/3 sets × 50 feet \/ side/i)).toBeInTheDocument();
      expect(screen.queryByText(/side reps/i)).not.toBeInTheDocument();
    });

    it('formats multi-underscore equipment names cleanly without underscores in expanded and collapsed views', () => {
      const pullUpBarEx: WorkoutExercise = {
        ...mockExercise,
        id: 'pull_up_drill',
        name: 'Dead Hang & Scapular Pulls',
        equipment: 'pull_up_bar',
      };

      const { rerender } = render(
        <ExerciseCard
          exercise={pullUpBarEx}
          logs={mockLogs}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );

      // Expanded card equipment tag replaces ALL underscores to spaces
      expect(screen.getByText(/^pull up bar$/i)).toBeInTheDocument();
      expect(screen.queryByText(/pull up_bar/i)).not.toBeInTheDocument();

      // Collapsed card summary
      rerender(
        <ExerciseCard
          exercise={pullUpBarEx}
          logs={mockLogs}
          defaultCollapsed={true}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );
      expect(screen.getByText(/pull up bar/i)).toBeInTheDocument();
      expect(screen.queryByText(/pull up_bar/i)).not.toBeInTheDocument();
    });

    it('displays "Time" instead of "TUT" in active tempo metronome banner', () => {
      render(
        <ExerciseCard
          exercise={timedExercise}
          logs={mockLogs}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );

      const inlineTempoBtn = screen.getByTestId('inline-tempo-header-btn');
      fireEvent.click(inlineTempoBtn);

      expect(screen.getByTestId('inline-tempo-panel')).toBeInTheDocument();
      expect(screen.getByText(/Time 00:00/i)).toBeInTheDocument();
      expect(screen.queryByText(/\bTUT\b/i)).not.toBeInTheDocument();
    });

    it('accurately resolves isometric hold tempo durations for button labels and metronome launch', () => {
      const isometricEx: WorkoutExercise = {
        ...mockExercise,
        id: 't3_horse_stance',
        name: 'Horse Stance Pulses',
        tempo: 'Isometric Hold',
        targetReps: '25–35s',
      };

      const onTempoMock = vi.fn();
      render(
        <ExerciseCard
          exercise={isometricEx}
          logs={mockLogs}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={onTempoMock}
        />
      );

      // Button label shows exact resolved hold duration (35s rather than generic 10s or generic clock)
      const inlineTempoBtn = screen.getByTestId('inline-tempo-header-btn');
      expect(inlineTempoBtn).toHaveTextContent(/Start 35s Hold/i);

      // Clicking launches inline tempo with resolved hold cadence
      fireEvent.click(inlineTempoBtn);
      expect(screen.getByTestId('inline-tempo-panel')).toBeInTheDocument();
      expect(screen.getByText(/HOLD-35/i)).toBeInTheDocument();

      // Quick visualizer launcher passes resolved tempo
      const visualizerBtn = screen.getByTitle(/Launch Marcus Filly metronome for HOLD-35/i);
      fireEvent.click(visualizerBtn);
      expect(onTempoMock).toHaveBeenCalledWith('HOLD-35', 't3_horse_stance');
    });

    it('opens Rating Definitions Modal when clicking Notes / RPE information icon or quick chips info button', () => {
      const exercise = mockExercise;
      const mockLogs: SetLogRecord[] = [
        { setNumber: 1, targetReps: '3', isCompleted: false, repsAchieved: 0, weightLbs: 185, notes: '' },
      ];

      render(
        <ExerciseCard
          exercise={exercise}
          logs={mockLogs}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );

      const rpeInfoBtn = screen.getByTestId('info-rpe-rating-btn');
      fireEvent.click(rpeInfoBtn);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/RPE & Reps in Reserve \(RIR Scale\)/i)).toBeInTheDocument();

      // Close modal
      fireEvent.click(screen.getByRole('button', { name: /Close rating definitions modal/i }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Click Quick Chips info icon
      const quickChipsInfoBtn = screen.getByTestId('info-quick-chips-btn');
      fireEvent.click(quickChipsInfoBtn);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/RPE & Reps in Reserve \(RIR Scale\)/i)).toBeInTheDocument();
    });

    it('copies Set 1 weight down to Set 2 through Set 5 when clicking Set 1 copy button', () => {
      const exercise = { ...mockExercise, targetSets: 5 };
      const updateLogMock = vi.fn();
      const mockLogs: SetLogRecord[] = [
        { setNumber: 1, targetReps: '5', isCompleted: false, repsAchieved: 0, weightLbs: 225, notes: '' },
        { setNumber: 2, targetReps: '5', isCompleted: false, repsAchieved: 0, weightLbs: 0, notes: '' },
        { setNumber: 3, targetReps: '5', isCompleted: false, repsAchieved: 0, weightLbs: 0, notes: '' },
        { setNumber: 4, targetReps: '5', isCompleted: false, repsAchieved: 0, weightLbs: 0, notes: '' },
        { setNumber: 5, targetReps: '5', isCompleted: false, repsAchieved: 0, weightLbs: 0, notes: '' },
      ];

      render(
        <ExerciseCard
          exercise={exercise}
          logs={mockLogs}
          onUpdateSetLog={updateLogMock}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );

      const copyBtn = screen.getByTestId(`copy-set1-weight-btn-${exercise.id}`);
      expect(copyBtn).toBeInTheDocument();
      expect(copyBtn).toHaveTextContent(/copy ↓/i);

      fireEvent.click(copyBtn);

      // Should copy 225 to sets 2, 3, 4, 5 (indices 1, 2, 3, 4)
      expect(updateLogMock).toHaveBeenCalledWith(exercise.id, 1, { weightLbs: 225 });
      expect(updateLogMock).toHaveBeenCalledWith(exercise.id, 2, { weightLbs: 225 });
      expect(updateLogMock).toHaveBeenCalledWith(exercise.id, 3, { weightLbs: 225 });
      expect(updateLogMock).toHaveBeenCalledWith(exercise.id, 4, { weightLbs: 225 });
    });

    it('copies Set 1 weight down to all sets via header and action bar buttons', () => {
      const exercise = { ...mockExercise, targetSets: 5 };
      const updateLogMock = vi.fn();
      const mockLogs: SetLogRecord[] = [
        { setNumber: 1, targetReps: '5', isCompleted: false, repsAchieved: 0, weightLbs: 315, notes: '' },
        { setNumber: 2, targetReps: '5', isCompleted: false, repsAchieved: 0, weightLbs: 0, notes: '' },
        { setNumber: 3, targetReps: '5', isCompleted: false, repsAchieved: 0, weightLbs: 0, notes: '' },
        { setNumber: 4, targetReps: '5', isCompleted: false, repsAchieved: 0, weightLbs: 0, notes: '' },
        { setNumber: 5, targetReps: '5', isCompleted: false, repsAchieved: 0, weightLbs: 0, notes: '' },
      ];

      render(
        <ExerciseCard
          exercise={exercise}
          logs={mockLogs}
          onUpdateSetLog={updateLogMock}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );

      const actionBtn = screen.getByTestId(`copy-set1-weight-action-${exercise.id}`);
      expect(actionBtn).toBeInTheDocument();
      expect(actionBtn).toHaveTextContent(/Copy Set 1 Weight to Sets 2–5/i);

      fireEvent.click(actionBtn);

      expect(updateLogMock).toHaveBeenCalledWith(exercise.id, 1, { weightLbs: 315 });
      expect(updateLogMock).toHaveBeenCalledWith(exercise.id, 2, { weightLbs: 315 });
      expect(updateLogMock).toHaveBeenCalledWith(exercise.id, 3, { weightLbs: 315 });
      expect(updateLogMock).toHaveBeenCalledWith(exercise.id, 4, { weightLbs: 315 });

      // Also header button
      const thBtn = screen.getByTestId(`copy-set1-weight-th-${exercise.id}`);
      expect(thBtn).toBeInTheDocument();
      fireEvent.click(thBtn);
      expect(updateLogMock).toHaveBeenCalledWith(exercise.id, 4, { weightLbs: 315 });
    });

    it('populates Set 1 through 5 using defaultWeightLbs when Set 1 is 0/empty', () => {
      const exercise = { ...mockExercise, defaultWeightLbs: 185, targetSets: 5 };
      const updateLogMock = vi.fn();
      const mockLogs: SetLogRecord[] = [
        { setNumber: 1, targetReps: '5', isCompleted: false, repsAchieved: 0, weightLbs: 0, notes: '' },
        { setNumber: 2, targetReps: '5', isCompleted: false, repsAchieved: 0, weightLbs: 0, notes: '' },
        { setNumber: 3, targetReps: '5', isCompleted: false, repsAchieved: 0, weightLbs: 0, notes: '' },
        { setNumber: 4, targetReps: '5', isCompleted: false, repsAchieved: 0, weightLbs: 0, notes: '' },
        { setNumber: 5, targetReps: '5', isCompleted: false, repsAchieved: 0, weightLbs: 0, notes: '' },
      ];

      render(
        <ExerciseCard
          exercise={exercise}
          logs={mockLogs}
          onUpdateSetLog={updateLogMock}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );

      const copyBtn = screen.getByTestId(`copy-set1-weight-btn-${exercise.id}`);
      fireEvent.click(copyBtn);

      // Should populate Set 1 (index 0) AND sets 2..5 with defaultWeightLbs 185
      expect(updateLogMock).toHaveBeenCalledWith(exercise.id, 0, { weightLbs: 185 });
      expect(updateLogMock).toHaveBeenCalledWith(exercise.id, 1, { weightLbs: 185 });
      expect(updateLogMock).toHaveBeenCalledWith(exercise.id, 2, { weightLbs: 185 });
      expect(updateLogMock).toHaveBeenCalledWith(exercise.id, 3, { weightLbs: 185 });
      expect(updateLogMock).toHaveBeenCalledWith(exercise.id, 4, { weightLbs: 185 });
    });

    it('copies Set 1 reps down to the sets not done yet, from the Set 1 button and the header', () => {
      const exercise = { ...mockExercise, targetSets: 4 };
      const updateLogMock = vi.fn();
      const mockLogs: SetLogRecord[] = [
        { setNumber: 1, targetReps: '8', isCompleted: true, repsAchieved: 7, weightLbs: 135, notes: '' },
        { setNumber: 2, targetReps: '8', isCompleted: true, repsAchieved: 6, weightLbs: 135, notes: '' },
        { setNumber: 3, targetReps: '8', isCompleted: false, repsAchieved: 0, weightLbs: 135, notes: '' },
        { setNumber: 4, targetReps: '8', isCompleted: false, repsAchieved: 0, weightLbs: 135, notes: '' },
      ];

      render(
        <ExerciseCard
          exercise={exercise}
          logs={mockLogs}
          onUpdateSetLog={updateLogMock}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId(`copy-set1-reps-btn-${exercise.id}`));
      expect(updateLogMock).toHaveBeenCalledWith(exercise.id, 2, { repsAchieved: 7 });
      expect(updateLogMock).toHaveBeenCalledWith(exercise.id, 3, { repsAchieved: 7 });
      // a finished set keeps the reps it was logged with
      expect(updateLogMock).not.toHaveBeenCalledWith(exercise.id, 1, expect.objectContaining({ repsAchieved: expect.any(Number) }));
      expect(updateLogMock).not.toHaveBeenCalledWith(exercise.id, 0, expect.objectContaining({ repsAchieved: expect.any(Number) }));

      updateLogMock.mockClear();
      fireEvent.click(screen.getByTestId(`copy-set1-reps-th-${exercise.id}`));
      expect(updateLogMock).toHaveBeenCalledWith(exercise.id, 3, { repsAchieved: 7 });
    });

    it('uses Set 1 goal reps when Set 1 has no reps logged yet', () => {
      const exercise = { ...mockExercise, targetSets: 3 };
      const updateLogMock = vi.fn();
      const mockLogs: SetLogRecord[] = [
        { setNumber: 1, targetReps: '10', isCompleted: false, repsAchieved: 0, weightLbs: 0, notes: '' },
        { setNumber: 2, targetReps: '10', isCompleted: false, repsAchieved: 0, weightLbs: 0, notes: '' },
        { setNumber: 3, targetReps: '10', isCompleted: false, repsAchieved: 0, weightLbs: 0, notes: '' },
      ];

      render(
        <ExerciseCard
          exercise={exercise}
          logs={mockLogs}
          onUpdateSetLog={updateLogMock}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId(`copy-set1-reps-btn-${exercise.id}`));
      expect(updateLogMock).toHaveBeenCalledWith(exercise.id, 0, { repsAchieved: 10 });
      expect(updateLogMock).toHaveBeenCalledWith(exercise.id, 1, { repsAchieved: 10 });
      expect(updateLogMock).toHaveBeenCalledWith(exercise.id, 2, { repsAchieved: 10 });
    });
  });

  describe('Bowflex SelectTech 840 Quick Dial Selector', () => {
    const kbExercise: WorkoutExercise = {
      ...mockExercise,
      id: 't3_horse_stance',
      name: 'Range of Strength Horse Stance Pulses',
      equipment: 'kettlebell',
      defaultWeight: 20,
      defaultWeightLbs: 20,
      targetSets: 3,
      targetReps: '10',
    };

    it('renders all 6 Bowflex SelectTech 840 dial notches (8, 12, 20, 25, 35, 40 lbs) for kettlebell movements', () => {
      render(
        <ExerciseCard
          exercise={kbExercise}
          logs={mockLogs}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );

      const dialContainer = screen.getByTestId(`bowflex-840-dial-${kbExercise.id}`);
      expect(dialContainer).toBeInTheDocument();
      expect(screen.getByText('Bowflex 840 Dial Setting')).toBeInTheDocument();

      const expectedWeights = [8, 12, 20, 25, 35, 40];
      expectedWeights.forEach((w) => {
        const btn = screen.getByTestId(`bowflex-dial-btn-${kbExercise.id}-${w}`);
        expect(btn).toBeInTheDocument();
        expect(btn).toHaveTextContent(`${w} lbs`);
      });
    });

    it('updates all sets when a Bowflex dial setting is clicked', () => {
      const updateLogMock = vi.fn();
      render(
        <ExerciseCard
          exercise={kbExercise}
          logs={mockLogs}
          onUpdateSetLog={updateLogMock}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );

      const dial25Btn = screen.getByTestId(`bowflex-dial-btn-${kbExercise.id}-25`);
      fireEvent.click(dial25Btn);

      expect(updateLogMock).toHaveBeenCalledWith(kbExercise.id, 0, { weightLbs: 25 });
      expect(updateLogMock).toHaveBeenCalledWith(kbExercise.id, 1, { weightLbs: 25 });
      expect(updateLogMock).toHaveBeenCalledWith(kbExercise.id, 2, { weightLbs: 25 });
    });

    it('does not render Bowflex dial selector for non-kettlebell exercises', () => {
      render(
        <ExerciseCard
          exercise={mockExercise}
          logs={mockLogs}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );

      expect(screen.queryByTestId(`bowflex-840-dial-${mockExercise.id}`)).not.toBeInTheDocument();
    });
  });
});



