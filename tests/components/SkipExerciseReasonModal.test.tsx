// tests/components/SkipExerciseReasonModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkipExerciseReasonModal } from '../../src/components/SkipExerciseReasonModal';

describe('SkipExerciseReasonModal Component', () => {
  it('returns null when isOpen is false', () => {
    const { container } = render(
      <SkipExerciseReasonModal
        isOpen={false}
        onClose={vi.fn()}
        exerciseId="t2_atg_split_squat"
        exerciseName="ATG Split Squat"
        exerciseTier="T2"
        isCurrentlySkipped={false}
        onConfirmSkip={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal dialog with exercise details, preset chips, and input field', () => {
    render(
      <SkipExerciseReasonModal
        isOpen={true}
        onClose={vi.fn()}
        exerciseId="t2_atg_split_squat"
        exerciseName="ATG Split Squat"
        exerciseTier="T2"
        isCurrentlySkipped={false}
        onConfirmSkip={vi.fn()}
      />
    );

    expect(screen.getByTestId('skip-exercise-modal')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Skip Exercise/i })).toBeInTheDocument();
    expect(screen.getByText('ATG Split Squat')).toBeInTheDocument();
    expect(screen.getByText('T2')).toBeInTheDocument();

    // Preset chips
    expect(screen.getByTestId('skip-preset-time')).toHaveTextContent('Ran out of time');
    expect(screen.getByTestId('skip-preset-equipment')).toHaveTextContent('Equipment occupied/unavailable');
    expect(screen.getByTestId('skip-preset-joint')).toHaveTextContent('Joint/knee discomfort');
    expect(screen.getByTestId('skip-preset-fatigue')).toHaveTextContent('High fatigue / drained');

    // Free text input
    expect(screen.getByTestId('skip-reason-input')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-skip-exercise-btn')).toHaveTextContent('Skip Exercise');
  });

  it('populates reason when clicking a preset chip', () => {
    const handleConfirm = vi.fn();
    render(
      <SkipExerciseReasonModal
        isOpen={true}
        onClose={vi.fn()}
        exerciseId="t2_atg_split_squat"
        exerciseName="ATG Split Squat"
        exerciseTier="T2"
        isCurrentlySkipped={false}
        onConfirmSkip={handleConfirm}
      />
    );

    const timeChip = screen.getByTestId('skip-preset-time');
    fireEvent.click(timeChip);

    const textarea = screen.getByTestId('skip-reason-input') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Ran out of time');

    const confirmBtn = screen.getByTestId('confirm-skip-exercise-btn');
    fireEvent.click(confirmBtn);

    expect(handleConfirm).toHaveBeenCalledWith('t2_atg_split_squat', 'Ran out of time');
  });

  it('allows athlete to type custom free-text reason for analysis', () => {
    const handleConfirm = vi.fn();
    render(
      <SkipExerciseReasonModal
        isOpen={true}
        onClose={vi.fn()}
        exerciseId="t1_bb_squat"
        exerciseName="Barbell Back Squat"
        exerciseTier="T1"
        isCurrentlySkipped={false}
        onConfirmSkip={handleConfirm}
      />
    );

    const textarea = screen.getByTestId('skip-reason-input');
    fireEvent.change(textarea, {
      target: { value: 'Patellar tendon felt sharp during warmups' },
    });

    const confirmBtn = screen.getByTestId('confirm-skip-exercise-btn');
    fireEvent.click(confirmBtn);

    expect(handleConfirm).toHaveBeenCalledWith(
      't1_bb_squat',
      'Patellar tendon felt sharp during warmups'
    );
  });

  it('shows currently skipped banner and Unskip button when isCurrentlySkipped is true', () => {
    const handleUnskip = vi.fn();
    render(
      <SkipExerciseReasonModal
        isOpen={true}
        onClose={vi.fn()}
        exerciseId="t3_seated_calf_raise"
        exerciseName="Seated Soleus Calf Raise"
        exerciseTier="T3"
        isCurrentlySkipped={true}
        initialReason="Ran out of time"
        onConfirmSkip={vi.fn()}
        onUnskip={handleUnskip}
      />
    );

    expect(screen.getByTestId('currently-skipped-alert')).toBeInTheDocument();
    expect(screen.getByText('Edit Skip Reason')).toBeInTheDocument();

    const textarea = screen.getByTestId('skip-reason-input') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Ran out of time');

    const unskipBtn = screen.getByTestId('unskip-exercise-btn');
    expect(unskipBtn).toHaveTextContent('Unskip & Restore Sets');
    fireEvent.click(unskipBtn);

    expect(handleUnskip).toHaveBeenCalledWith('t3_seated_calf_raise');
  });

  it('closes on Escape key press or close button click', () => {
    const handleClose = vi.fn();
    render(
      <SkipExerciseReasonModal
        isOpen={true}
        onClose={handleClose}
        exerciseId="t2_atg_split_squat"
        exerciseName="ATG Split Squat"
        exerciseTier="T2"
        isCurrentlySkipped={false}
        onConfirmSkip={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByTestId('close-skip-modal-btn');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
