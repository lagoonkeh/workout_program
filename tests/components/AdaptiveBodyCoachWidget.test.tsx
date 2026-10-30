// tests/components/AdaptiveBodyCoachWidget.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdaptiveBodyCoachWidget } from '../../src/components/AdaptiveBodyCoachWidget';
import { WORKOUT_PROGRAM } from '../../src/domain/programData';

describe('AdaptiveBodyCoachWidget Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders collapsed by default and displays expand button', () => {
    render(
      <AdaptiveBodyCoachWidget
        activeSession={WORKOUT_PROGRAM.lower_a}
        onApplyAdaptations={vi.fn()}
        onResetAdaptations={vi.fn()}
      />
    );

    expect(screen.getByText(/Adaptive Body Feeling & Mobility Coach/i)).toBeInTheDocument();
    expect(screen.getByText(/Tap to tell me how your body feels/i)).toBeInTheDocument();
  });

  it('toggles expanded view when expand button is clicked', () => {
    render(
      <AdaptiveBodyCoachWidget
        activeSession={WORKOUT_PROGRAM.lower_a}
        onApplyAdaptations={vi.fn()}
        onResetAdaptations={vi.fn()}
      />
    );

    const toggleBtn = screen.getByTestId('toggle-body-coach-btn');
    fireEvent.click(toggleBtn);

    expect(screen.getByText(/Quick 1-Tap Feeling Chips:/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\., 'Right knee is feeling tender/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Analyze My Body & Adapt Routine/i })).toBeInTheDocument();
  });

  it('allows selecting quick symptom chips and typing in textarea', () => {
    render(
      <AdaptiveBodyCoachWidget
        activeSession={WORKOUT_PROGRAM.lower_a}
        onApplyAdaptations={vi.fn()}
        onResetAdaptations={vi.fn()}
        defaultExpanded={true}
      />
    );

    const kneeChip = screen.getByTestId('feeling-chip-knee');
    fireEvent.click(kneeChip);

    const textarea = screen.getByPlaceholderText(/e\.g\., 'Right knee is feeling tender/i);
    fireEvent.change(textarea, { target: { value: 'Patellar tendon feels tender on depth' } });
    expect((textarea as HTMLTextAreaElement).value).toBe('Patellar tendon feels tender on depth');
  });

  it('generates adaptations on analyze and triggers onApplyAdaptations when clicked', () => {
    const onApply = vi.fn();
    render(
      <AdaptiveBodyCoachWidget
        activeSession={WORKOUT_PROGRAM.lower_a}
        onApplyAdaptations={onApply}
        onResetAdaptations={vi.fn()}
        defaultExpanded={true}
      />
    );

    const kneeChip = screen.getByTestId('feeling-chip-knee');
    fireEvent.click(kneeChip);

    const analyzeBtn = screen.getByRole('button', { name: /Analyze My Body & Adapt Routine/i });
    fireEvent.click(analyzeBtn);

    // Analysis results appear
    expect(screen.getByText(/Biomechanical Findings & Longevity Strategy/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Patellar Tendon \/ Knee Strain/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Targeted Joint Prehab & Warmup Injections:/i)).toBeInTheDocument();

    const applyBtn = screen.getByTestId('apply-body-feeling-adaptations-btn');
    fireEvent.click(applyBtn);

    expect(onApply).toHaveBeenCalledTimes(1);
    const passedAdaptations = onApply.mock.calls[0][0];
    expect(passedAdaptations.length).toBeGreaterThan(0);
  });

  it('displays active adaptations indicator and allows resetting adaptations', () => {
    const onReset = vi.fn();
    render(
      <AdaptiveBodyCoachWidget
        activeSession={WORKOUT_PROGRAM.lower_a}
        appliedAdaptations={{ t1_bb_squat: { name: 'Box Squat' } }}
        onApplyAdaptations={vi.fn()}
        onResetAdaptations={onReset}
        defaultExpanded={true}
      />
    );

    expect(screen.getByText(/Revert to Original Routine/i)).toBeInTheDocument();
    const revertBtn = screen.getByRole('button', { name: /Revert to Original Routine/i });
    fireEvent.click(revertBtn);

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
