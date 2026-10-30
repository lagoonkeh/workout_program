// tests/components/ProgressChartWidget.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgressChartWidget } from '../../src/components/ProgressChartWidget';
import { SetLogRecord } from '../../src/components/ExerciseCard';
import { MobilityEntry } from '../../src/domain/mobility';

describe('ProgressChartWidget Component', () => {
  const sampleWorkoutLogs: Record<string, SetLogRecord[]> = {
    t1_bb_squat: [
      { setNumber: 1, targetReps: '3', weightLbs: 185, isCompleted: true, repsAchieved: 3, notes: '' },
      { setNumber: 2, targetReps: '3', weightLbs: 185, isCompleted: true, repsAchieved: 3, notes: '' },
      { setNumber: 3, targetReps: '3+', weightLbs: 185, isCompleted: true, repsAchieved: 5, notes: 'AMRAP hit 5' },
    ],
    t1_bench: [
      { setNumber: 1, targetReps: '3', weightLbs: 135, isCompleted: true, repsAchieved: 3, notes: '' },
    ],
  };

  const sampleMobilityHistory: MobilityEntry[] = [
    {
      id: 'entry-1',
      date: '2026-10-10',
      testId: 'knee-to-wall',
      value: 3.5,
      notes: 'Initial test',
    },
    {
      id: 'entry-2',
      date: '2026-10-14',
      testId: 'elephant-walk',
      value: 2,
      notes: 'Fingertips to toes',
    },
  ];

  it('renders top banner and default 3-month horizon with strength lifts', () => {
    render(
      <ProgressChartWidget
        workoutLogs={sampleWorkoutLogs}
        mobilityHistory={sampleMobilityHistory}
      />
    );

    expect(screen.getByText(/Progress Chart & Projected Trajectories/i)).toBeInTheDocument();
    expect(screen.getByText(/Biomechanical forecasting across 1 month, 3 months, 6 months, and 1 year horizons/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Strength Lifts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mobility Protocols/i })).toBeInTheDocument();

    // Default 3M horizon active
    const threeMBadge = screen.getByRole('button', { name: '3 Months' });
    expect(threeMBadge).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches between time horizons (1M, 3M, 6M, 1Y)', () => {
    render(
      <ProgressChartWidget
        workoutLogs={sampleWorkoutLogs}
        mobilityHistory={sampleMobilityHistory}
      />
    );

    const oneMBtn = screen.getByRole('button', { name: '1 Month' });
    fireEvent.click(oneMBtn);
    expect(oneMBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Target Horizon \(1M\):/i)).toBeInTheDocument();

    const sixMBtn = screen.getByRole('button', { name: '6 Months' });
    fireEvent.click(sixMBtn);
    expect(sixMBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Target Horizon \(6M\):/i)).toBeInTheDocument();

    const oneYBtn = screen.getByRole('button', { name: '1 Year' });
    fireEvent.click(oneYBtn);
    expect(oneYBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Target Horizon \(1Y\):/i)).toBeInTheDocument();
  });

  it('switches categories between Strength Lifts and Mobility Protocols', () => {
    render(
      <ProgressChartWidget
        workoutLogs={sampleWorkoutLogs}
        mobilityHistory={sampleMobilityHistory}
      />
    );

    // Click Mobility Protocols
    const mobilityCategoryBtn = screen.getByRole('button', { name: /Mobility Protocols/i });
    fireEvent.click(mobilityCategoryBtn);

    // Verify mobility metrics pills appear
    expect(screen.getByRole('button', { name: /Knee-to-Wall Ankle Dorsiflexion/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ATG Elephant Walks/i })).toBeInTheDocument();

    // Switch back to Strength Lifts
    const strengthCategoryBtn = screen.getByRole('button', { name: /Strength Lifts/i });
    fireEvent.click(strengthCategoryBtn);

    expect(screen.getByRole('button', { name: /Barbell Back Squat/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Barbell Bench Press/i })).toBeInTheDocument();
  });

  it('switches active metric when clicking a metric pill', () => {
    render(
      <ProgressChartWidget
        workoutLogs={sampleWorkoutLogs}
        mobilityHistory={sampleMobilityHistory}
      />
    );

    // Default is Barbell Back Squat
    expect(screen.getAllByText(/Barbell Back Squat/i).length).toBeGreaterThanOrEqual(1);

    // Click Barbell Bench Press pill
    const benchPill = screen.getByRole('button', { name: /Barbell Bench Press/i });
    fireEvent.click(benchPill);

    // Bench press should now be the main header
    expect(screen.getAllByText(/Barbell Bench Press/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/45-degree elbow tuck with retracted/i)).toBeInTheDocument();
  });

  it('renders SVG interactive chart with trajectory nodes and milestone forecast matrix', () => {
    render(
      <ProgressChartWidget
        workoutLogs={sampleWorkoutLogs}
        mobilityHistory={sampleMobilityHistory}
      />
    );

    // SVG elements rendered
    const svgElement = document.querySelector('svg');
    expect(svgElement).toBeInTheDocument();

    // Milestone forecast cards
    expect(screen.getByText(/1M Goal/i)).toBeInTheDocument();
    expect(screen.getByText(/3M Goal/i)).toBeInTheDocument();
    expect(screen.getByText(/6M Goal/i)).toBeInTheDocument();
    expect(screen.getByText(/1Y Goal/i)).toBeInTheDocument();

    // Comparison Forecast Matrix table
    expect(screen.getByText(/Complete Strength Forecast Matrix/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Barbell Romanian Deadlift/i).length).toBeGreaterThanOrEqual(1);
  });

  it('supports collapsing and expanding executive summary, trajectory chart, and forecast matrix', () => {
    render(
      <ProgressChartWidget
        workoutLogs={sampleWorkoutLogs}
        mobilityHistory={sampleMobilityHistory}
      />
    );

    // Initially all expanded
    expect(screen.getByText(/Biomechanical forecasting across 1 month, 3 months, 6 months, and 1 year horizons/i)).toBeInTheDocument();
    expect(screen.getByText(/Current Baseline/i)).toBeInTheDocument();
    expect(screen.getByText(/Complete Strength Forecast Matrix/i)).toBeInTheDocument();

    // 1. Collapse Executive Summary banner
    const collapseSummaryBtn = screen.getByRole('button', { name: /Collapse progress summary/i });
    fireEvent.click(collapseSummaryBtn);
    expect(screen.queryByText(/Biomechanical forecasting across 1 month, 3 months, 6 months, and 1 year horizons/i)).not.toBeInTheDocument();

    // Expand Executive Summary banner
    const expandSummaryBtn = screen.getByRole('button', { name: /Expand progress summary/i });
    fireEvent.click(expandSummaryBtn);
    expect(screen.getByText(/Biomechanical forecasting across 1 month, 3 months, 6 months, and 1 year horizons/i)).toBeInTheDocument();

    // 2. Collapse Trajectory Chart
    const collapseChartBtns = screen.getAllByRole('button', { name: /Collapse trajectory chart/i });
    fireEvent.click(collapseChartBtns[0]);
    expect(screen.queryByText(/Current Baseline/i)).not.toBeInTheDocument();

    // Expand Trajectory Chart
    const expandChartBtns = screen.getAllByRole('button', { name: /Expand trajectory chart/i });
    fireEvent.click(expandChartBtns[0]);
    expect(screen.getByText(/Current Baseline/i)).toBeInTheDocument();

    // 3. Collapse Forecast Matrix
    const collapseMatrixBtn = screen.getByRole('button', { name: /Collapse forecast matrix/i });
    fireEvent.click(collapseMatrixBtn);
    expect(screen.queryByText(/Net Projected Delta/i)).not.toBeInTheDocument();

    // Expand Forecast Matrix
    const expandMatrixBtn = screen.getByRole('button', { name: /Expand forecast matrix/i });
    fireEvent.click(expandMatrixBtn);
    expect(screen.getByText(/Net Projected Delta/i)).toBeInTheDocument();
  });
});

