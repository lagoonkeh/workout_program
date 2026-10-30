// tests/components/WorkoutCompletionModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkoutCompletionModal } from '../../src/components/WorkoutCompletionModal';
import { WORKOUT_PROGRAM } from '../../src/domain/programData';
import { SessionCompletionAudit } from '../../src/domain/adaptiveAdjustments';

const mockAuditWithSkipped: SessionCompletionAudit = {
  sessionId: 'lower_a',
  sessionTitle: 'Lower A',
  totalExercises: 3,
  completedExercises: [
    { id: 't1_bb_squat', name: 'Barbell Back Squat', targetSets: 5, completedSets: 5, tier: 'T1' },
  ],
  skippedExercises: [
    { id: 't2_atg_split_squat', name: 'ATG Split Squat', targetSets: 3, completedSets: 0, skippedSets: 3, tier: 'T2' },
    { id: 't3_seated_calf_raise', name: 'Seated Soleus Calf Raise', targetSets: 3, completedSets: 1, skippedSets: 2, tier: 'T3' },
  ],
  isFullyCompleted: false,
  proposedAdjustments: [
    {
      exerciseId: 't2_atg_split_squat',
      exerciseName: 'ATG Split Squat',
      sessionId: 'lower_a',
      sessionTitle: 'Lower A',
      tier: 'T2',
      originalSets: 3,
      completedSets: 0,
      skippedSets: 3,
      proposedSets: 2,
      proposedWeightLbs: 0,
      priorityBadge: '⚡ High Priority (Missed in Last Session)',
      reason: 'Not done during Lower A',
      biomechanicalRationale: 'Tier 2 hypertrophy work missed. Volume adjusted from 3 to 2 sets.',
    },
    {
      exerciseId: 't3_seated_calf_raise',
      exerciseName: 'Seated Soleus Calf Raise',
      sessionId: 'lower_a',
      sessionTitle: 'Lower A',
      tier: 'T3',
      originalSets: 3,
      completedSets: 1,
      skippedSets: 2,
      proposedSets: 2,
      proposedWeightLbs: 45,
      priorityBadge: '⚡ High Priority (Missed in Last Session)',
      reason: 'Incomplete (1/3 sets logged)',
      biomechanicalRationale: 'Volume adjusted from 3 to 2 sets for recovery.',
    },
  ],
};

describe('WorkoutCompletionModal Component', () => {
  it('returns null when isOpen is false', () => {
    const { container } = render(
      <WorkoutCompletionModal
        isOpen={false}
        onClose={vi.fn()}
        session={WORKOUT_PROGRAM.lower_a}
        audit={mockAuditWithSkipped}
        onApplyAdjustmentsAndComplete={vi.fn()}
        onCompleteWithoutAdjustments={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders skipped exercises and future adjustment options', () => {
    render(
      <WorkoutCompletionModal
        isOpen={true}
        onClose={vi.fn()}
        session={WORKOUT_PROGRAM.lower_a}
        audit={mockAuditWithSkipped}
        onApplyAdjustmentsAndComplete={vi.fn()}
        onCompleteWithoutAdjustments={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Session Wrap-Up & Future Adjustments/i)).toBeInTheDocument();
    expect(screen.getByTestId('skipped-exercises-alert')).toBeInTheDocument();
    expect(screen.getAllByText(/2 Skipped/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/ATG Split Squat/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Seated Soleus Calf Raise/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Adjust to 2 Sets/i).length).toBeGreaterThanOrEqual(1);
  });

  it('calls onApplyAdjustmentsAndComplete with selected adjustments when apply button is clicked', () => {
    const onApplyMock = vi.fn();

    render(
      <WorkoutCompletionModal
        isOpen={true}
        onClose={vi.fn()}
        session={WORKOUT_PROGRAM.lower_a}
        audit={mockAuditWithSkipped}
        onApplyAdjustmentsAndComplete={onApplyMock}
        onCompleteWithoutAdjustments={vi.fn()}
      />
    );

    const applyBtn = screen.getByTestId('confirm-completion-adjustments-btn');
    fireEvent.click(applyBtn);

    expect(onApplyMock).toHaveBeenCalledTimes(1);
    expect(onApplyMock).toHaveBeenCalledWith(mockAuditWithSkipped.proposedAdjustments);
  });

  it('calls onCompleteWithoutAdjustments when secondary button is clicked', () => {
    const onSkipMock = vi.fn();

    render(
      <WorkoutCompletionModal
        isOpen={true}
        onClose={vi.fn()}
        session={WORKOUT_PROGRAM.lower_a}
        audit={mockAuditWithSkipped}
        onApplyAdjustmentsAndComplete={vi.fn()}
        onCompleteWithoutAdjustments={onSkipMock}
      />
    );

    const skipBtn = screen.getByRole('button', { name: /Complete Without Adjustments/i });
    fireEvent.click(skipBtn);

    expect(onSkipMock).toHaveBeenCalledTimes(1);
  });

  it('closes modal when Escape key is pressed', () => {
    const onCloseMock = vi.fn();

    render(
      <WorkoutCompletionModal
        isOpen={true}
        onClose={onCloseMock}
        session={WORKOUT_PROGRAM.lower_a}
        audit={mockAuditWithSkipped}
        onApplyAdjustmentsAndComplete={vi.fn()}
        onCompleteWithoutAdjustments={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('displays "Bodyweight" for exercises with 0 lbs load and "Held at X lbs" for weighted exercises', () => {
    render(
      <WorkoutCompletionModal
        isOpen={true}
        onClose={vi.fn()}
        session={WORKOUT_PROGRAM.lower_a}
        audit={mockAuditWithSkipped}
        onApplyAdjustmentsAndComplete={vi.fn()}
        onCompleteWithoutAdjustments={vi.fn()}
      />
    );

    expect(screen.getByText(/Load: Bodyweight/i)).toBeInTheDocument();
    expect(screen.getByText(/Load: Held at 45 lbs/i)).toBeInTheDocument();
  });
});
