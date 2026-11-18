import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PostureAssessmentWidget } from '../../src/components/PostureAssessmentWidget';
import { POSTURE_TESTS, STORAGE_KEY_POSTURE, loadPostureState } from '../../src/domain/postureAssessment';

describe('PostureAssessmentWidget', () => {
  beforeEach(() => localStorage.removeItem(STORAGE_KEY_POSTURE));

  it('runs the six tests, starts the plan and shows the day-2 stretches', () => {
    const { rerender } = render(<PostureAssessmentWidget now={new Date(2026, 10, 17)} />);
    fireEvent.click(screen.getByTestId('posture-start'));
    expect(screen.getByTestId('posture-save')).toBeDisabled();

    for (const t of POSTURE_TESTS) {
      // each test opens in turn after the previous one is fully marked
      const labels = t.perSide ? ['Left', 'Right'] : ['Result'];
      labels.forEach((label) => {
        const fail = t.id === 'hamstrings' && label === 'Right';
        fireEvent.click(screen.getByLabelText(`${label} ${fail ? 'fail' : 'pass'}`));
      });
    }
    fireEvent.click(screen.getByTestId('posture-save'));

    expect(loadPostureState().plan?.startDate).toBe('2026-11-17');
    expect(screen.getByTestId('posture-day')).toHaveTextContent('Day 1 / 22');

    rerender(<PostureAssessmentWidget now={new Date(2026, 10, 18)} />);
    expect(screen.getByTestId('posture-day')).toHaveTextContent('Day 2 / 22');
    const routine = screen.getByTestId('posture-routine');
    expect(routine).toHaveTextContent('Hamstring wall stretch');
    expect(routine).toHaveTextContent('right side only');
    expect(routine).not.toHaveTextContent('Kneeling T-spine stretch');

    fireEvent.click(screen.getByTestId('posture-mark-done'));
    expect(loadPostureState().plan?.completedDays).toEqual([1, 2]);
  });
});
