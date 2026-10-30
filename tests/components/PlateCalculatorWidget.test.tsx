// tests/components/PlateCalculatorWidget.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlateCalculatorWidget } from '../../src/components/PlateCalculatorWidget';

describe('PlateCalculatorWidget Component', () => {
  it('calculates optimal plates for default 135 lbs', () => {
    render(<PlateCalculatorWidget initialWeight={135} />);

    expect(screen.getByText('135 lbs')).toBeInTheDocument();
    expect(screen.getByText('[45]')).toBeInTheDocument();
    expect(screen.getByText(/Exact plate combination calculated/i)).toBeInTheDocument();
  });

  it('solves 165 lbs greedy trap correctly with [35, 25]', () => {
    render(<PlateCalculatorWidget initialWeight={165} />);

    expect(screen.getByText('165 lbs')).toBeInTheDocument();
    expect(screen.getByText('[35, 25]')).toBeInTheDocument();
  });

  it('solves 185 lbs and 225 lbs accurately', () => {
    const { rerender } = render(<PlateCalculatorWidget initialWeight={185} />);
    expect(screen.getByText('[45, 25]')).toBeInTheDocument();

    rerender(<PlateCalculatorWidget initialWeight={225} />);
    expect(screen.getByText('[45, 35, 10]')).toBeInTheDocument();
  });

  it('solves maximum capacity 300 lbs cleanly', () => {
    render(<PlateCalculatorWidget initialWeight={300} />);
    expect(screen.getByText('300 lbs')).toBeInTheDocument();
    expect(screen.getByText('[45, 35, 25, 10, 5, 5, 2.5]')).toBeInTheDocument();
  });

  it('displays warning when target is below empty bar (< 45 lbs)', () => {
    render(<PlateCalculatorWidget initialWeight={35} />);
    expect(screen.getByText(/below empty bar/i)).toBeInTheDocument();
  });

  it('adjusts weight using step bumper buttons (+5 lb and -5 lb)', () => {
    render(<PlateCalculatorWidget initialWeight={135} />);

    const plus5Btn = screen.getByRole('button', { name: /Increase weight by 5 lbs/i });
    fireEvent.click(plus5Btn);
    expect(screen.getByText('140 lbs')).toBeInTheDocument();

    const minus5Btn = screen.getByRole('button', { name: /Decrease weight by 5 lbs/i });
    fireEvent.click(minus5Btn);
    expect(screen.getByText('135 lbs')).toBeInTheDocument();
  });

  it('updates target weight when quick preset button is clicked', () => {
    render(<PlateCalculatorWidget initialWeight={135} />);

    const preset225 = screen.getByRole('button', { name: '225 lb' });
    fireEvent.click(preset225);

    expect(screen.getByText('225 lbs')).toBeInTheDocument();
    expect(screen.getByText('[45, 35, 10]')).toBeInTheDocument();
  });

  it('copies load summary to clipboard', () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<PlateCalculatorWidget initialWeight={225} />);

    const copyBtn = screen.getByRole('button', { name: /Copy Plate Load/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('225 lbs (45 lb bar + [45, 35, 10] per side)')
    );
  });

  it('supports collapsing and expanding main card, sleeve graphic, and load breakdown', () => {
    render(<PlateCalculatorWidget initialWeight={225} />);

    // Initially all expanded
    expect(screen.getByLabelText(/Target Barbell Load/i)).toBeInTheDocument();
    expect(screen.getByText(/Barbell Sleeve Loading/i)).toBeInTheDocument();
    expect(screen.getByText(/Load Breakdown & Olympic Color Key/i)).toBeInTheDocument();
    expect(screen.getByText(/Olympic Color Key:/i)).toBeInTheDocument();

    // 1. Collapse sleeve graphic
    const collapseSleeveBtn = screen.getByRole('button', { name: /Collapse sleeve loading graphic/i });
    fireEvent.click(collapseSleeveBtn);
    expect(screen.queryByText(/45 LB BAR/i)).not.toBeInTheDocument();

    // Expand sleeve graphic
    const expandSleeveBtn = screen.getByRole('button', { name: /Expand sleeve loading graphic/i });
    fireEvent.click(expandSleeveBtn);
    expect(screen.getByText(/45 LB BAR/i)).toBeInTheDocument();

    // 2. Collapse load breakdown
    const collapseBreakdownBtn = screen.getByRole('button', { name: /Collapse load breakdown/i });
    fireEvent.click(collapseBreakdownBtn);
    expect(screen.queryByText(/Olympic Color Key:/i)).not.toBeInTheDocument();

    // Expand load breakdown
    const expandBreakdownBtn = screen.getByRole('button', { name: /Expand load breakdown/i });
    fireEvent.click(expandBreakdownBtn);
    expect(screen.getByText(/Olympic Color Key:/i)).toBeInTheDocument();

    // 3. Collapse entire plate calculator card
    const collapseCardBtn = screen.getByRole('button', { name: /Collapse plate calculator/i });
    fireEvent.click(collapseCardBtn);
    expect(screen.queryByLabelText(/Target Barbell Load/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Barbell Sleeve Loading/i)).not.toBeInTheDocument();

    // Expand entire plate calculator card
    const expandCardBtn = screen.getByRole('button', { name: /Expand plate calculator/i });
    fireEvent.click(expandCardBtn);
    expect(screen.getByLabelText(/Target Barbell Load/i)).toBeInTheDocument();
  });
});

