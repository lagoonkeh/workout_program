import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExerciseCard } from '../../src/components/ExerciseCard';
import { WorkoutExercise } from '../../src/domain/programData';

const MOCK_LLP_EXERCISE: WorkoutExercise = {
  id: 't2_sa_kb_row',
  name: 'Single-Arm Kettlebell Row',
  tier: 'T2',
  targetSets: 3,
  targetReps: '8–10 / arm',
  isAmrapLastSet: false,
  tempo: '31X1',
  restSeconds: 120,
  equipment: 'kettlebell',
  defaultWeight: 35,
  defaultWeightLbs: 35,
  muscleGroups: ['Latissimus Dorsi', 'Teres Major'],
  biomechanicalRationale: 'Bench-supported horizontal pull aligned with lat fibers.',
  progressionRule: 'Double progression: 10 strict reps/arm before next notch.',
  llpEligible: true,
  llpProtocolNotes: 'Jeff Nippard LLP: After full ROM reps, pump 3–5 partials in the deep bottom lat stretch at 0–1 RIR.',
};

describe('ExerciseCard - Jeff Nippard Long-Length Partials (LLP) Protocol', () => {
  it('renders LLP badges and protocol banner for eligible exercises', () => {
    const mockUpdate = vi.fn();
    render(
      <ExerciseCard
        exercise={MOCK_LLP_EXERCISE}
        logs={[
          { setNumber: 1, targetReps: '8–10', weightLbs: 35, repsAchieved: 10, isCompleted: true, notes: '' },
          { setNumber: 2, targetReps: '8–10', weightLbs: 35, repsAchieved: 10, isCompleted: true, notes: '' },
          { setNumber: 3, targetReps: '8–10', weightLbs: 35, repsAchieved: 0, isCompleted: false, notes: '' },
        ]}
        onUpdateSetLog={mockUpdate}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
      />
    );

    expect(screen.getByTestId('expanded-llp-badge')).toBeInTheDocument();
    expect(screen.getByTestId('llp-protocol-banner')).toBeInTheDocument();
    expect(screen.getByText(/Lengthened Partials \(LLPs, Jeff Nippard\)/i)).toBeInTheDocument();
  });

  it('toggles the scientific rationale explanation when clicking science cue button', () => {
    render(
      <ExerciseCard
        exercise={MOCK_LLP_EXERCISE}
        logs={[
          { setNumber: 1, targetReps: '8–10', weightLbs: 35, repsAchieved: 0, isCompleted: false, notes: '' },
        ]}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
      />
    );

    const toggleBtn = screen.getByTestId('toggle-llp-guide-btn');
    expect(screen.queryByText(/What the research shows/i)).not.toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(screen.getByText(/What the research shows/i)).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(screen.queryByText(/What the research shows/i)).not.toBeInTheDocument();
  });

  it('allows logging +LLPs on a set and updates notes and llpPerformed flag', () => {
    const mockUpdate = vi.fn();
    render(
      <ExerciseCard
        exercise={MOCK_LLP_EXERCISE}
        logs={[
          { setNumber: 1, targetReps: '8–10', weightLbs: 35, repsAchieved: 0, isCompleted: false, notes: '', llpPerformed: false },
        ]}
        onUpdateSetLog={mockUpdate}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
      />
    );

    const llpBtn = screen.getByTestId('llp-toggle-btn-0');
    fireEvent.click(llpBtn);

    expect(mockUpdate).toHaveBeenCalledWith(
      't2_sa_kb_row',
      0,
      expect.objectContaining({
        llpPerformed: true,
        notes: expect.stringContaining('+3–5 LLPs'),
      })
    );
  });

  it('displays collapsed LLP badge when any set has llpPerformed set to true', () => {
    render(
      <ExerciseCard
        exercise={MOCK_LLP_EXERCISE}
        logs={[
          { setNumber: 1, targetReps: '8–10', weightLbs: 35, repsAchieved: 10, isCompleted: true, notes: '', llpPerformed: true },
        ]}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
      />
    );

    expect(screen.getByTestId('collapsed-llp-badge')).toBeInTheDocument();
  });

  it('offers the +LLPs toggle on the final set only', () => {
    render(
      <ExerciseCard
        exercise={MOCK_LLP_EXERCISE}
        logs={[1, 2, 3].map((n) => ({ setNumber: n, targetReps: '8', weightLbs: 35, repsAchieved: 0, isCompleted: false, notes: '' }))}
        onUpdateSetLog={vi.fn()}
        onOpenCueCard={vi.fn()}
        onQuickStartRest={vi.fn()}
        onQuickStartTempo={vi.fn()}
      />
    );

    expect(screen.queryByTestId('llp-toggle-btn-0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('llp-toggle-btn-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('llp-toggle-btn-2')).toBeInTheDocument();
  });
});
