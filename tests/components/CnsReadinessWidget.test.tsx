import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CnsReadinessWidget } from '../../src/components/CnsReadinessWidget';
import { loadCnsChecks } from '../../src/domain/cnsReadiness';
import { collectAppBackup } from '../../src/services/appBackupService';

const NOW = new Date('2026-11-09T08:00:00');

describe('CnsReadinessWidget', () => {
  beforeEach(() => localStorage.clear());

  it('runs a check with the tests skipped and saves the result', () => {
    render(<CnsReadinessWidget now={NOW} />);
    expect(screen.getByText(/Building your baseline: 0 of 3/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cns-start'));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByTestId('cns-drive-5'));
    fireEvent.click(screen.getByTestId('cns-focus-4'));
    fireEvent.click(screen.getByTestId('cns-stress-2'));
    fireEvent.click(screen.getByTestId('cns-finish'));
    expect(screen.getByTestId('cns-tier')).toHaveTextContent('Ready');
    const saved = loadCnsChecks();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ date: '2026-11-09', drive: 5, taps: null, tier: 'ready' });
    expect(collectAppBackup().cnsChecks).toHaveLength(1);
  });

  it('counts taps on the tap pad', () => {
    render(<CnsReadinessWidget now={NOW} />);
    fireEvent.click(screen.getByTestId('cns-start'));
    const pad = screen.getByTestId('cns-tap-pad');
    for (let i = 0; i < 7; i++) fireEvent.pointerDown(pad);
    expect(pad).toHaveTextContent('7');
  });

  it('opens on today’s saved result', () => {
    localStorage.setItem('workout_cns_readiness_checks_v1', JSON.stringify([
      { id: 'cns_2026-11-09', date: '2026-11-09', timestamp: 1, taps: null, reactionMs: null, drive: 1, focus: 1, stress: 5, score: 64, tier: 'low' },
    ]));
    render(<CnsReadinessWidget now={NOW} />);
    expect(screen.getByTestId('cns-result')).toBeInTheDocument();
  });
});
