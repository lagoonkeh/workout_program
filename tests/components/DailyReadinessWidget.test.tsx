// tests/components/DailyReadinessWidget.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DailyReadinessWidget, STORAGE_KEY_READINESS_LOGS } from '../../src/components/DailyReadinessWidget';
import { WORKOUT_PROGRAM } from '../../src/domain/programData';

describe('DailyReadinessWidget Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders check-in form controls, sliders, and journal notes textarea', () => {
    render(
      <DailyReadinessWidget
        activeSession={WORKOUT_PROGRAM.lower_a}
        onApplyAdaptations={vi.fn()}
      />
    );

    expect(screen.getByText(/Daily Body Readiness & Recovery Check-In/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Knee Tendon Discomfort Score/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hamstring Tightness Score/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Energy Score/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sleep Score/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Daily Body Feeling Journal Notes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Analyze Body Readiness and Generate Adjustments/i })).toBeInTheDocument();
  });

  it('toggles quick body region tags on click', () => {
    render(
      <DailyReadinessWidget
        activeSession={WORKOUT_PROGRAM.lower_a}
        onApplyAdaptations={vi.fn()}
      />
    );

    const kneeTag = screen.getByRole('button', { name: 'Knees Sore' });
    expect(kneeTag).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(kneeTag);
    expect(kneeTag).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(kneeTag);
    expect(kneeTag).toHaveAttribute('aria-pressed', 'false');
  });

  it('generates biomechanical analysis and allows applying adaptations to today workout', () => {
    const onApplyMock = vi.fn();
    const onNavigateMock = vi.fn();

    render(
      <DailyReadinessWidget
        activeSession={WORKOUT_PROGRAM.lower_a}
        onApplyAdaptations={onApplyMock}
        onNavigateToWorkout={onNavigateMock}
      />
    );

    // Enter notes mentioning knee ache
    const notesInput = screen.getByLabelText(/Daily Body Feeling Journal Notes/i);
    fireEvent.change(notesInput, {
      target: { value: 'Patellar tendon ache stepping down stairs this morning (4/10).' },
    });

    // Set knee pain slider to 4
    const kneeSlider = screen.getByLabelText(/Knee Tendon Discomfort Score/i);
    fireEvent.change(kneeSlider, { target: { value: '4' } });

    // Click Analyze
    const analyzeBtn = screen.getByRole('button', { name: /Analyze Body Readiness and Generate Adjustments/i });
    fireEvent.click(analyzeBtn);

    // Analysis card appears
    expect(screen.getByTestId('readiness-analysis-card')).toBeInTheDocument();
    expect(screen.getByText(/Biomechanical Readiness Assessment:/i)).toBeInTheDocument();
    expect(screen.getByText(/Recommended Workout Adjustments/i)).toBeInTheDocument();

    // Click Apply to Today's Workout
    const applyBtn = screen.getByRole('button', { name: /Apply readiness adjustments to workout/i });
    fireEvent.click(applyBtn);

    expect(onApplyMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Adjustments Applied ✓/i)).toBeInTheDocument();

    // Click Navigate to workout
    const navigateBtn = screen.getByRole('button', { name: /View Adjusted Exercises in Routine/i });
    fireEvent.click(navigateBtn);
    expect(onNavigateMock).toHaveBeenCalledTimes(1);
  });

  it('loads historical entries from localStorage and populates state', () => {
    const mockHistory = [
      {
        id: 'readiness_2026-10-16_123',
        date: '2026-10-16',
        timestamp: 12345,
        kneePainScore: 2,
        hamstringTightness: 3,
        energyScore: 8,
        sleepScore: 8,
        sorenessTags: ['Feeling Fresh & Strong'],
        journalNotes: 'Felt springy and ready.',
        readinessScore: 92,
        statusTier: 'peak',
        biomechanicalFindings: ['All clear.'],
        recommendedAdaptations: [],
        applied: true,
      },
    ];
    localStorage.setItem(STORAGE_KEY_READINESS_LOGS, JSON.stringify(mockHistory));

    render(
      <DailyReadinessWidget
        activeSession={WORKOUT_PROGRAM.lower_a}
        onApplyAdaptations={vi.fn()}
      />
    );

    expect(screen.getByText(/Past Check-Ins & Recovery Log \(1 Entries\)/i)).toBeInTheDocument();

    // Toggle history drawer
    const historyBtn = screen.getByRole('button', { name: /Past Check-Ins & Recovery Log/i });
    fireEvent.click(historyBtn);

    expect(screen.getByText(/2026-10-16/i)).toBeInTheDocument();
    expect(screen.getByText(/Felt springy and ready/i)).toBeInTheDocument();
  });

  it('opens Rating Terms Guide modal when clicking section information button and individual slider info icons', () => {
    render(
      <DailyReadinessWidget
        activeSession={WORKOUT_PROGRAM.lower_a}
        onApplyAdaptations={vi.fn()}
      />
    );

    // Click the main section Information button
    const openGuideBtn = screen.getByTestId('open-rating-terms-guide');
    fireEvent.click(openGuideBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Rating Terms & Clinical Scale Definitions/i)).toBeInTheDocument();

    // Close the modal
    const closeBtn = screen.getByRole('button', { name: /Close rating definitions modal/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Click individual Knee Discomfort Information Icon
    const kneeInfoBtn = screen.getByTestId('info-knee-rating');
    fireEvent.click(kneeInfoBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Knee Discomfort/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/Iron Knees \(Pain-Free \/ Fully Prepared\)/i)).toBeInTheDocument();

    // Close and click Hamstring Tightness Information Icon
    fireEvent.click(screen.getByRole('button', { name: /Close rating definitions modal/i }));
    const hamstringInfoBtn = screen.getByTestId('info-hamstring-rating');
    fireEvent.click(hamstringInfoBtn);
    expect(screen.getByRole('tab', { name: /Hamstring Tightness/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/Loose & Open \(Supple \/ Full Dynamic Reach\)/i)).toBeInTheDocument();
  });
});
