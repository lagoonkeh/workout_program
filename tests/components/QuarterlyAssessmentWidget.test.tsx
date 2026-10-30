// tests/components/QuarterlyAssessmentWidget.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuarterlyAssessmentWidget } from '../../src/components/QuarterlyAssessmentWidget';

describe('QuarterlyAssessmentWidget Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders header banner and demographic profile (DOB: 10/10/1991, Age 35, 5\'6", 168 lbs)', () => {
    render(<QuarterlyAssessmentWidget />);

    expect(screen.getByText(/Quarterly Fitness Testing Battery/i)).toBeInTheDocument();
    expect(screen.getByText(/DOB: 10\/10\/1991 • Age 35/i)).toBeInTheDocument();
    expect(screen.getByText(/5'6" \(66 in\) • 168 lbs/i)).toBeInTheDocument();
    expect(screen.getByText(/< 33.0 in Target/i)).toBeInTheDocument();
    expect(screen.getByText(/120s Dead Hang/i)).toBeInTheDocument();
  });

  it('renders all 6 testing domains', () => {
    render(<QuarterlyAssessmentWidget />);

    expect(screen.getByText(/1. Cardiorespiratory & VO2max/i)).toBeInTheDocument();
    expect(screen.getByText(/2. Relative Strength \(168 lbs BW\)/i)).toBeInTheDocument();
    expect(screen.getByText(/3. Calisthenics & Muscular Endurance/i)).toBeInTheDocument();
    expect(screen.getByText(/4. Dr. Stuart McGill Core Balance Ratios/i)).toBeInTheDocument();
    expect(screen.getByText(/5. Longevity Biomarkers & Grip/i)).toBeInTheDocument();
    expect(screen.getByText(/6. Loaded Mobility & Range of Strength/i)).toBeInTheDocument();
  });

  it('displays rowing 2k and Cooper run metrics in Cardiorespiratory domain', () => {
    render(<QuarterlyAssessmentWidget />);

    expect(screen.getByText(/2,000m Rowing Machine TT/i)).toBeInTheDocument();
    expect(screen.getByText(/Cooper 12-Minute Run Test/i)).toBeInTheDocument();
    expect(screen.getByText(/Resting Heart Rate/i)).toBeInTheDocument();
  });

  it('displays relative compound strength numbers with bodyweight multipliers', () => {
    render(<QuarterlyAssessmentWidget />);

    expect(screen.getByText(/Barbell Deadlift \/ RDL/i)).toBeInTheDocument();
    expect(screen.getByText(/Barbell Back Squat/i)).toBeInTheDocument();
    expect(screen.getByText(/Barbell Bench Press/i)).toBeInTheDocument();
    expect(screen.getByText(/Strict Overhead Press/i)).toBeInTheDocument();
  });

  it('displays McGill clinical ratio analysis', () => {
    render(<QuarterlyAssessmentWidget />);

    expect(screen.getByText(/McGill Clinical Ratios Analysis:/i)).toBeInTheDocument();
    expect(screen.getByText(/Flexion \/ Extension:/i)).toBeInTheDocument();
    expect(screen.getByText(/Side Bridge \/ Extension:/i)).toBeInTheDocument();
    expect(screen.getByText(/Right vs. Left Symmetry:/i)).toBeInTheDocument();
  });

  it('opens edit modal and allows modifying scores and saving', () => {
    render(<QuarterlyAssessmentWidget />);

    const editBtn = screen.getByRole('button', { name: /Edit Scores/i });
    fireEvent.click(editBtn);

    expect(screen.getByText(/Log Assessment: Q4 2026 \(Baseline\)/i)).toBeInTheDocument();

    const deadliftInput = screen.getByLabelText(/Deadlift 1RM/i);
    fireEvent.change(deadliftInput, { target: { value: '345' } });

    const saveBtn = screen.getByRole('button', { name: /Save Assessment/i });
    fireEvent.click(saveBtn);

    // Modal closes
    expect(screen.queryByText(/Log Assessment: Q4 2026 \(Baseline\)/i)).not.toBeInTheDocument();

    // Updated deadlift reflects in UI
    expect(screen.getByText(/345 lbs/i)).toBeInTheDocument();
  });

  it('creates a new quarterly test when clicking New Quarter Test button', () => {
    render(<QuarterlyAssessmentWidget />);

    const newBtn = screen.getByRole('button', { name: /New Quarter Test/i });
    fireEvent.click(newBtn);

    expect(screen.getByText(/Log Assessment: Q/i)).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: /Save Assessment/i });
    fireEvent.click(saveBtn);

    expect(screen.queryByText(/Log Assessment: Q/i)).not.toBeInTheDocument();
  });

  it('toggles category accordion collapse and expansion', () => {
    render(<QuarterlyAssessmentWidget />);

    // Click on Cardiorespiratory category header to collapse
    const aerobicBtn = screen.getByRole('button', { name: /1. Cardiorespiratory & VO2max/i });
    fireEvent.click(aerobicBtn);

    // After collapsing, the 2,000m row details inside are hidden
    expect(screen.queryByText(/2,000m Rowing Machine TT/i)).not.toBeInTheDocument();

    // Click again to expand
    fireEvent.click(aerobicBtn);
    expect(screen.getByText(/2,000m Rowing Machine TT/i)).toBeInTheDocument();
  });
});
