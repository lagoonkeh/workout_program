// tests/components/SparklineChart.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SparklineChart } from '../../src/components/SparklineChart';
import {
  PROTOCOL_KNEE_TO_WALL,
  PROTOCOL_SPLIT_SQUAT_ELEVATION,
  MobilityEntry,
} from '../../src/domain/mobility';

describe('SparklineChart Component (Zero-Dependency SVG)', () => {
  it('renders empty placeholder state when entries array is empty', () => {
    render(<SparklineChart entries={[]} protocol={PROTOCOL_KNEE_TO_WALL} />);
    expect(screen.getByText(/No assessment history logged yet/i)).toBeInTheDocument();
  });

  it('renders SVG element with polyline for multi-point history', () => {
    const entries: MobilityEntry[] = [
      { id: '1', testId: 'knee-to-wall', date: '2026-10-01T08:00:00Z', value: 3.0 },
      { id: '2', testId: 'knee-to-wall', date: '2026-10-08T08:00:00Z', value: 4.5 },
      { id: '3', testId: 'knee-to-wall', date: '2026-10-15T08:00:00Z', value: 5.2 },
    ];

    const { container } = render(
      <SparklineChart entries={entries} protocol={PROTOCOL_KNEE_TO_WALL} />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();

    const polyline = container.querySelector('polyline');
    expect(polyline).toBeInTheDocument();
    expect(polyline?.getAttribute('points')).toBeTruthy();

    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(3);
  });

  it('renders benchmark reference line and target label', () => {
    const entries: MobilityEntry[] = [
      { id: '1', testId: 'knee-to-wall', date: '2026-10-01T08:00:00Z', value: 3.5 },
    ];
    render(<SparklineChart entries={entries} protocol={PROTOCOL_KNEE_TO_WALL} />);
    expect(screen.getByText(/Target: ≥ 4.0–5.0 inches/i)).toBeInTheDocument();
  });

  it('handles inverted polarity for lower-is-better metrics (ATG Split Squat)', () => {
    // 6" elevation improved to 0" elevation
    const entries: MobilityEntry[] = [
      { id: '1', testId: 'split-squat-elevation', date: '2026-10-01T08:00:00Z', value: 6.0 },
      { id: '2', testId: 'split-squat-elevation', date: '2026-10-15T08:00:00Z', value: 0.0 },
    ];

    const { container } = render(
      <SparklineChart entries={entries} protocol={PROTOCOL_SPLIT_SQUAT_ELEVATION} />
    );

    const polyline = container.querySelector('polyline');
    const pointsStr = polyline?.getAttribute('points') || '';
    const [p1, p2] = pointsStr.split(' ');
    const y1 = parseFloat(p1.split(',')[1]);
    const y2 = parseFloat(p2.split(',')[1]);

    // For lower-is-better, lower value (0.0) MUST have lower Y coordinate (higher vertical position on screen)
    expect(y2).toBeLessThan(y1);
  });

  it('renders without division-by-zero or NaN when all values are identical', () => {
    const entries: MobilityEntry[] = [
      { id: '1', testId: 'knee-to-wall', date: '2026-10-01T08:00:00Z', value: 4.0 },
      { id: '2', testId: 'knee-to-wall', date: '2026-10-08T08:00:00Z', value: 4.0 },
    ];

    const { container } = render(
      <SparklineChart entries={entries} protocol={PROTOCOL_KNEE_TO_WALL} />
    );
    const polyline = container.querySelector('polyline');
    expect(polyline?.getAttribute('points')).not.toContain('NaN');
  });
});
