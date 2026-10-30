// tests/components/TempoMetronomeWidget.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TempoMetronomeWidget } from '../../src/components/TempoMetronomeWidget';

describe('TempoMetronomeWidget Component', () => {
  it('renders 4 cadence tiles for default 30X1', () => {
    render(<TempoMetronomeWidget initialTempo="30X1" />);

    expect(screen.getAllByText('3s').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('0s')).toBeInTheDocument();
    expect(screen.getByText('X')).toBeInTheDocument();
    expect(screen.getByText('1s')).toBeInTheDocument();

    expect(screen.getByText(/Marcus Filly Tempo Metronome/i)).toBeInTheDocument();
  });

  it('renders circular SVG pacing ring with radius 56', () => {
    const { container } = render(<TempoMetronomeWidget initialTempo="30X1" />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();

    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThanOrEqual(2);
    expect(circles[0].getAttribute('r')).toBe('56');
  });

  it('allows starting, pausing, and stopping the cadence', () => {
    render(<TempoMetronomeWidget initialTempo="30X1" />);

    const startBtn = screen.getByRole('button', { name: /Start Cadence/i });
    fireEvent.click(startBtn);

    expect(screen.getByRole('button', { name: /Pause/i })).toBeInTheDocument();

    const pauseBtn = screen.getByRole('button', { name: /Pause/i });
    fireEvent.click(pauseBtn);

    expect(screen.getByRole('button', { name: /Resume/i })).toBeInTheDocument();

    const stopBtn = screen.getByRole('button', { name: /Stop Metronome/i });
    fireEvent.click(stopBtn);

    expect(screen.getByRole('button', { name: /Start Cadence/i })).toBeInTheDocument();
  });

  it('updates target reps when selector pill is clicked', () => {
    render(<TempoMetronomeWidget initialTempo="30X1" initialTargetReps={10} />);

    expect(screen.getByText(/Rep 1 of 10/i)).toBeInTheDocument();

    const target5Btn = screen.getByRole('button', { name: '5' });
    fireEvent.click(target5Btn);

    expect(screen.getByText(/Rep 1 of 5/i)).toBeInTheDocument();
  });

  it('switches tempo when preset is clicked', () => {
    render(<TempoMetronomeWidget initialTempo="30X1" />);

    const preset4010 = screen.getByText('Eccentric Hypertrophy').closest('button')!;
    fireEvent.click(preset4010);

    expect(screen.getAllByText('4s').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('0s').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('1s')).toBeInTheDocument();
  });

  it('validates custom input and shows error message for invalid format', () => {
    render(<TempoMetronomeWidget initialTempo="30X1" />);

    const input = screen.getByPlaceholderText(/Custom 4-digit/i);
    const applyBtn = screen.getByRole('button', { name: /Apply/i });

    fireEvent.change(input, { target: { value: '99999' } });
    fireEvent.click(applyBtn);

    expect(screen.getByText(/Invalid/i)).toBeInTheDocument();
  });

  it('toggles audio mute button', () => {
    render(<TempoMetronomeWidget initialTempo="30X1" />);

    const soundBtn = screen.getByRole('button', { name: /Metronome Audio/i });
    fireEvent.click(soundBtn);

    expect(screen.getByRole('button', { name: /Unmute Metronome Audio/i })).toBeInTheDocument();
  });

  it('invokes onSetComplete when clicking Log Set Complete button', () => {
    const onSetCompleteMock = vi.fn();
    render(
      <TempoMetronomeWidget
        initialTempo="30X1"
        initialTargetReps={8}
        onSetComplete={onSetCompleteMock}
      />
    );

    const logSetBtn = screen.getByRole('button', { name: /Mark set complete/i });
    expect(logSetBtn).toBeInTheDocument();
    fireEvent.click(logSetBtn);

    expect(onSetCompleteMock).toHaveBeenCalledTimes(1);
    expect(onSetCompleteMock).toHaveBeenCalledWith(1);
  });

  it('renders isometric static hold protocol banner and duration for HOLD-10', () => {
    render(<TempoMetronomeWidget initialTempo="HOLD-10" initialTargetReps={4} />);

    expect(screen.getByText(/Isometric Tension Metronome/i)).toBeInTheDocument();
    expect(screen.getByText(/Isometric Tension Hold Protocol/i)).toBeInTheDocument();
    expect(screen.getByText(/10s remaining/i)).toBeInTheDocument();
  });

  it('renders 1-Tap TNT Isometric Analgesia Protocol launcher and loads 5x45s holds', () => {
    render(<TempoMetronomeWidget initialTempo="30X1" initialTargetReps={10} />);

    expect(screen.getByTestId('tnt-metronome-banner')).toBeInTheDocument();
    expect(screen.getByText(/Tendon Neuroplastic Training \(TNT\)/i)).toBeInTheDocument();

    const tntBtn = screen.getByTestId('tnt-metronome-quick-btn');
    fireEvent.click(tntBtn);

    expect(screen.getByText(/Isometric Tension Metronome/i)).toBeInTheDocument();
    expect(screen.getByText(/Rep 1 of 5/i)).toBeInTheDocument();
    expect(screen.getByText(/45s remaining/i)).toBeInTheDocument();
  });
});


