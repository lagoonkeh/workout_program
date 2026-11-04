import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExerciseVariationModal } from '../../src/components/ExerciseVariationModal';
import { ExerciseCard, SetLogRecord } from '../../src/components/ExerciseCard';
import { WORKOUT_PROGRAM } from '../../src/domain/programData';
import { getExerciseVariations } from '../../src/domain/exerciseVariations';

describe('Exercise Variations & Rotations UI', () => {
  const baseSquat = WORKOUT_PROGRAM.lower_a.exercises[0]; // t1_bb_squat
  const squatVariations = getExerciseVariations('t1_bb_squat');

  const defaultLogs: SetLogRecord[] = Array.from({ length: 5 }, (_, i) => ({
    setNumber: i + 1,
    targetReps: '3',
    weightLbs: 185,
    repsAchieved: 3,
    isCompleted: false,
    notes: '',
  }));

  it('renders ExerciseVariationModal with all scientific variations and triggers onSelectVariation', () => {
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    render(
      <ExerciseVariationModal
        isOpen={true}
        onClose={handleClose}
        baseExercise={baseSquat}
        variations={squatVariations}
        activeVariationId={baseSquat.id}
        onSelectVariation={handleSelect}
        currentCycle="A"
      />
    );

    expect(screen.getByText('Exercise Variations & Rotations')).toBeInTheDocument();
    expect(screen.getAllByText('Barbell Back Squat').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Barbell 2-Second Pause Squat')).toBeInTheDocument();

    // Select the pause squat variation
    const selectBtn = screen.getByLabelText('Select Barbell 2-Second Pause Squat');
    fireEvent.click(selectBtn);

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 't1_bb_pause_squat',
        name: 'Barbell 2-Second Pause Squat',
        tempo: '32X1',
      })
    );
    expect(handleClose).toHaveBeenCalled();
  });

  it('renders Variations button on ExerciseCard when variations exist and opens modal', () => {
    const handleSelectVariation = vi.fn();

    render(
      <ExerciseCard
        exercise={baseSquat}
        logs={defaultLogs}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
        defaultCollapsed={false}
        onSelectVariation={handleSelectVariation}
        currentCycle="A"
      />
    );

    const varBtn = screen.getByTestId(`exercise-variations-btn-${baseSquat.id}`);
    expect(varBtn).toBeInTheDocument();
    expect(varBtn).toHaveTextContent(/Variations \(3\)/);

    // Open variation modal
    fireEvent.click(varBtn);
    expect(screen.getByText('Exercise Variations & Rotations')).toBeInTheDocument();
    expect(screen.getByText('Barbell 2-Second Pause Squat')).toBeInTheDocument();
  });

  it('renders variations button in collapsed mode and opens modal', () => {
    render(
      <ExerciseCard
        exercise={baseSquat}
        logs={defaultLogs}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
        defaultCollapsed={true}
        currentCycle="A"
      />
    );

    const collapsedVarBtn = screen.getByTestId(`collapsed-variations-btn-${baseSquat.id}`);
    expect(collapsedVarBtn).toBeInTheDocument();

    fireEvent.click(collapsedVarBtn);
    expect(screen.getByText('Exercise Variations & Rotations')).toBeInTheDocument();
  });

  it('allows switching variations directly on card and updating the active exercise name and tempo', () => {
    let currentExercise = baseSquat;
    const handleSelectVariation = vi.fn((_baseId, variation) => {
      currentExercise = {
        ...baseSquat,
        name: variation.name,
        tempo: variation.tempo,
      };
    });

    const { rerender } = render(
      <ExerciseCard
        exercise={currentExercise}
        logs={defaultLogs}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
        defaultCollapsed={false}
        onSelectVariation={handleSelectVariation}
        currentCycle="A"
      />
    );

    const varBtn = screen.getByTestId(`exercise-variations-btn-${baseSquat.id}`);
    fireEvent.click(varBtn);

    const pauseSquatSelectBtn = screen.getByLabelText('Select Barbell 2-Second Pause Squat');
    fireEvent.click(pauseSquatSelectBtn);

    expect(handleSelectVariation).toHaveBeenCalled();

    // Rerender with updated exercise
    rerender(
      <ExerciseCard
        exercise={currentExercise}
        logs={defaultLogs}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
        defaultCollapsed={false}
        onSelectVariation={handleSelectVariation}
        currentCycle="B"
      />
    );

    expect(screen.getByText('Barbell 2-Second Pause Squat')).toBeInTheDocument();
  });
});
