// tests/components/WeeklyEvaluationModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WeeklyEvaluationModal } from '../../src/components/WeeklyEvaluationModal';
import { WeeklyEvaluationResult } from '../../src/domain/weeklyEvaluator';

const mockEvaluation: WeeklyEvaluationResult = {
  evaluatedAt: new Date().toISOString(),
  weekNumber: 1,
  overallStatus: 'progressing',
  stats: {
    totalSetsPrescribed: 24,
    totalSetsCompleted: 22,
    adherenceRate: 92,
    totalTonnageLbs: 18450,
    notesAnalyzedCount: 3,
    exercisesCompletedCount: 4,
  },
  commentInsights: [
    {
      exerciseId: 't1_bb_squat',
      exerciseName: 'Barbell Back Squat',
      rawNote: 'Flew up, felt super light',
      sentiment: 'positive',
      keywordsDetected: ['flew up', 'light'],
      biomechanicalFinding: 'High mechanical readiness observed.',
      recommendation: 'Increase working weight for next week.',
    },
  ],
  adaptations: [
    {
      id: 'adapt_t1_bb_squat_weight_up',
      exerciseId: 't1_bb_squat',
      exerciseName: 'Barbell Back Squat',
      action: 'increase_weight',
      parameter: 'weightLbs',
      currentValue: 185,
      proposedValue: 195,
      proposedLabel: '+10 lbs (185 → 195 lbs)',
      rationale: 'AMRAP set exceeded target reps. GZCL linear progression applies.',
      creatorInfluence: 'GZCL & Jeff Nippard',
      applied: false,
    },
  ],
  coachVerdict: 'Outstanding training execution! Adherence is strong at 92%.',
  nextWeekFocus: 'Emphasize explosive concentric drive with 3-second descent.',
};

describe('WeeklyEvaluationModal Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <WeeklyEvaluationModal
        isOpen={false}
        onClose={vi.fn()}
        evaluation={mockEvaluation}
        onApplyAdaptations={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders coach verdict, stats grid, and proposed adaptations when open', () => {
    render(
      <WeeklyEvaluationModal
        isOpen={true}
        onClose={vi.fn()}
        evaluation={mockEvaluation}
        onApplyAdaptations={vi.fn()}
      />
    );

    expect(screen.getByText(/Weekly Evaluation & Adaptations/i)).toBeInTheDocument();
    expect(screen.getByText(/Outstanding training execution/i)).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('+10 lbs (185 → 195 lbs)')).toBeInTheDocument();
    expect(screen.getByText(/GZCL & Jeff Nippard/i)).toBeInTheDocument();
  });

  it('displays parsed athlete comment notes and sentiment tags', () => {
    render(
      <WeeklyEvaluationModal
        isOpen={true}
        onClose={vi.fn()}
        evaluation={mockEvaluation}
        onApplyAdaptations={vi.fn()}
      />
    );

    expect(screen.getByText(/"Flew up, felt super light"/i)).toBeInTheDocument();
    expect(screen.getByText(/High Readiness/i)).toBeInTheDocument();
  });

  it('allows toggling adaptations and invokes onApplyAdaptations', () => {
    const onApplyMock = vi.fn();
    render(
      <WeeklyEvaluationModal
        isOpen={true}
        onClose={vi.fn()}
        evaluation={mockEvaluation}
        onApplyAdaptations={onApplyMock}
      />
    );

    const applyBtn = screen.getByRole('button', { name: /Apply Adaptations \(1\)/i });
    fireEvent.click(applyBtn);

    expect(onApplyMock).toHaveBeenCalledWith([mockEvaluation.adaptations[0]]);
  });

  it('invokes onClose when clicking close button', () => {
    const onCloseMock = vi.fn();
    render(
      <WeeklyEvaluationModal
        isOpen={true}
        onClose={onCloseMock}
        evaluation={mockEvaluation}
        onApplyAdaptations={vi.fn()}
      />
    );

    const closeBtn = screen.getByLabelText(/Close Weekly Evaluation Modal/i);
    fireEvent.click(closeBtn);

    expect(onCloseMock).toHaveBeenCalled();
  });

  it('invokes onResetAdaptations when reset button is clicked', () => {
    const onResetMock = vi.fn();
    render(
      <WeeklyEvaluationModal
        isOpen={true}
        onClose={vi.fn()}
        evaluation={mockEvaluation}
        onApplyAdaptations={vi.fn()}
        onResetAdaptations={onResetMock}
        hasAppliedAdaptations={true}
      />
    );

    const resetBtn = screen.getByRole('button', { name: /Reset to Defaults/i });
    fireEvent.click(resetBtn);

    expect(onResetMock).toHaveBeenCalled();
  });
});
