// tests/components/StrengthHeatmapWidget.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { StrengthHeatmapWidget } from '../../src/components/StrengthHeatmapWidget';
import {
  DEFAULT_BASELINE_ASSESSMENT,
  STORAGE_KEY_ASSESSMENTS,
  saveQuarterlyAssessment,
} from '../../src/domain/fitnessAssessment';

const NOW = new Date('2026-10-30T12:00:00Z');

describe('StrengthHeatmapWidget', () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY_ASSESSMENTS);
  });

  it('renders the heatmap, legend, lift table and sources in general mode', () => {
    render(<StrengthHeatmapWidget assessment={DEFAULT_BASELINE_ASSESSMENT} now={NOW} />);
    expect(screen.getByText('Strength Development Heatmap')).toBeInTheDocument();
    expect(screen.getByTestId('strength-svg-front')).toBeInTheDocument();
    expect(screen.getByTestId('strength-svg-back')).toBeInTheDocument();
    const legend = screen.getByTestId('strength-legend');
    ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite', 'No data'].forEach((t) =>
      expect(within(legend).getByText(t, { exact: false })).toBeInTheDocument()
    );
    expect(screen.getByTestId('strength-overall')).toHaveTextContent(/^\d+(st|nd|rd|th)$/);
    expect(within(screen.getByTestId('strength-lift-row-bench')).getByText(/vs all men 35 \(Cooper\)/)).toBeInTheDocument();
    expect(screen.getByTestId('strength-sources')).toHaveTextContent('Strength Level');
    expect(screen.getByTestId('strength-sources')).toHaveTextContent('Tennis not included');
  });

  it('inspects a muscle when its shape is clicked', () => {
    render(<StrengthHeatmapWidget assessment={DEFAULT_BASELINE_ASSESSMENT} now={NOW} />);
    fireEvent.click(screen.getByTestId('strength-muscle-quads-front'));
    const inspector = screen.getByTestId('strength-inspector');
    expect(within(inspector).getByText('Quads')).toBeInTheDocument();
    expect(screen.getByTestId('strength-inspector-score')).toHaveTextContent(/Novice · \d+(st|nd|rd|th) %ile/);
    fireEvent.click(screen.getByTestId('strength-muscle-calves-back'));
    expect(screen.getByTestId('strength-inspector-score')).toHaveTextContent('No data');
  });

  it('switches to an athlete comparison with percentages and caveats', () => {
    render(<StrengthHeatmapWidget assessment={DEFAULT_BASELINE_ASSESSMENT} now={NOW} />);
    fireEvent.click(screen.getByTestId('strength-compare-basketball'));
    expect(screen.getByTestId('strength-compare-basketball')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('strength-group-caption')).toHaveTextContent('NBA teams do not publish');
    const squatPct = Math.round(((255 / 168) / 1.67) * 100);
    expect(within(screen.getByTestId('strength-lift-row-squat')).getByText(`you = ${squatPct}%`)).toBeInTheDocument();
    expect(within(screen.getByTestId('strength-lift-row-deadlift')).getByText('No published data')).toBeInTheDocument();
    expect(screen.getByTestId('strength-sources')).toHaveTextContent('Latin RW');

    fireEvent.click(screen.getByTestId('strength-compare-sprinters'));
    expect(within(screen.getByTestId('strength-lift-row-squat')).getByText('half squat')).toBeInTheDocument();
  });

  it('shows an empty state when nothing has been tested or logged', () => {
    render(<StrengthHeatmapWidget assessment={null} now={NOW} />);
    expect(screen.getByTestId('strength-overall')).toHaveTextContent('—');
    expect(within(screen.getByTestId('strength-lift-row-squat')).getByText('Not logged')).toBeInTheDocument();
  });

  it('refreshes when the quarterly assessment is saved in the same tab', async () => {
    render(<StrengthHeatmapWidget now={NOW} />);
    expect(screen.getByTestId('strength-lift-row-squat')).toHaveTextContent('Tested 1RM 255 lb');
    await act(async () => {
      saveQuarterlyAssessment({
        ...DEFAULT_BASELINE_ASSESSMENT,
        id: 'q1_2027',
        date: '2027-01-15',
        quarterLabel: 'Q1 2027',
        scores: { ...DEFAULT_BASELINE_ASSESSMENT.scores, squat1rmLbs: 285 },
      });
      await new Promise((r) => setTimeout(r, 5));
    });
    expect(screen.getByTestId('strength-lift-row-squat')).toHaveTextContent('Tested 1RM 285 lb');
  });
});
