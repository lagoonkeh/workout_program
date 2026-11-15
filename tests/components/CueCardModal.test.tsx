// tests/components/CueCardModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CueCardModal } from '../../src/components/CueCardModal';
import { CueCard } from '../../src/domain/cueCardsData';

const mockCueCard: CueCard = {
  id: 'cue_01_bb_squat',
  exerciseId: 't1_bb_squat',
  exerciseName: 'Barbell Back Squat',
  title: 'Barbell Back Squat',
  tier: 'T1',
  tempo: '31X1',
  prescribedTempo: '31X1',
  primaryMuscles: ['Quadriceps', 'Glutes', 'Adductors'],
  equipment: 'Olympic Barbell & Squat Rack',
  setup: 'Position barbell at mid-sternum height.',
  setupInstructions: [
    'Position barbell at mid-sternum height.',
    'Step underneath and rest the bar securely across upper trapezius.',
  ],
  creatorCues: [
    {
      creator: 'Dr. Aaron Horschig (Squat University)',
      quote: 'Establish your foot tripod. Screw your feet into the floor.',
      biomechanicalRationale: 'Rooting the foot tripod maintains the medial longitudinal arch.',
    },
    {
      creator: 'Ben Patrick (ATG)',
      quote: 'Full knee bend under control creates structural remodeling.',
      biomechanicalRationale: 'Tendon strain rates are safe at slow eccentrics.',
    },
  ],
  commonFaults: ['Inward knee cave (valgus collapse)', 'Rushing the eccentric'],
  rehabRegressions: ['Barbell Box Squat to parallel', 'Landmine Hack Squat'],
};

describe('CueCardModal Component', () => {
  it('returns null when isOpen is false or cueCard is null', () => {
    const { container: c1 } = render(
      <CueCardModal cueCard={mockCueCard} isOpen={false} onClose={vi.fn()} />
    );
    expect(c1).toBeEmptyDOMElement();

    const { container: c2 } = render(
      <CueCardModal cueCard={null} isOpen={true} onClose={vi.fn()} />
    );
    expect(c2).toBeEmptyDOMElement();
  });

  it('renders modal content with creator cues, setup instructions, and regressions', () => {
    render(<CueCardModal cueCard={mockCueCard} isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
    expect(screen.getByText('Tempo: 31X1')).toBeInTheDocument();
    expect(screen.getByText(/Setup & Equipment/i)).toBeInTheDocument();
    expect(screen.getByText(/Form Cue 1/i)).toBeInTheDocument();
    expect(screen.getByText(/"Establish your foot tripod\. Screw your feet into the floor\."/i)).toBeInTheDocument();
    expect(screen.getByText(/Common Faults to Avoid/i)).toBeInTheDocument();
    expect(screen.getByText(/Inward knee cave \(valgus collapse\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Pain-Free Rehab Regressions/i)).toBeInTheDocument();
    expect(screen.getByText(/Barbell Box Squat to parallel/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onCloseMock = vi.fn();
    render(<CueCardModal cueCard={mockCueCard} isOpen={true} onClose={onCloseMock} />);

    const closeBtn = screen.getByRole('button', { name: /Close Cue Card Modal/i });
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when ESC key is pressed', () => {
    const onCloseMock = vi.fn();
    render(<CueCardModal cueCard={mockCueCard} isOpen={true} onClose={onCloseMock} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('launches tempo metronome and closes modal when Launch button is clicked', () => {
    const launchTempoMock = vi.fn();
    const onCloseMock = vi.fn();

    render(
      <CueCardModal
        cueCard={mockCueCard}
        isOpen={true}
        onClose={onCloseMock}
        onLaunchTempo={launchTempoMock}
      />
    );

    const launchBtn = screen.getByRole('button', { name: /Launch Tempo Metronome/i });
    fireEvent.click(launchBtn);

    expect(launchTempoMock).toHaveBeenCalledWith('31X1');
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on backdrop click but does not close on dialog inner click', () => {
    const onCloseMock = vi.fn();
    render(<CueCardModal cueCard={mockCueCard} isOpen={true} onClose={onCloseMock} />);

    const dialog = screen.getByRole('dialog');
    const content = screen.getByText('Barbell Back Squat');

    fireEvent.click(content);
    expect(onCloseMock).not.toHaveBeenCalled();

    fireEvent.click(dialog);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('renders Lengthened Partials protocol when lengthenedPartialsProtocol is provided', () => {
    const cueWithPartials: CueCard = {
      ...mockCueCard,
      lengthenedPartialsProtocol: {
        recommendation: 'Perform 3–5 lengthened partial pulses in the bottom 50% range after full-ROM fatigue.',
        targetRangeNote: 'Bottom 50% range of motion.',
        scientificRationale: 'Milo Wolf et al. (2023/2024): Loading at long muscle lengths stimulates stretch-mediated hypertrophy.',
      },
    };

    render(<CueCardModal cueCard={cueWithPartials} isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId('cue-card-lengthened-partials')).toBeInTheDocument();
    expect(screen.getByText(/Lengthened Partials & Stretch Science \(Wolf et al\. 2023\/2024\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Perform 3–5 lengthened partial pulses in the bottom 50% range/i)).toBeInTheDocument();
    expect(screen.getByText(/Bottom 50% range of motion\./i)).toBeInTheDocument();
  });

  it('renders setup phase tasks as actionable checkboxes with progress tracking and toggling', () => {
    localStorage.clear();
    const onPhaseToggleMock = vi.fn();

    render(
      <CueCardModal
        cueCard={mockCueCard}
        isOpen={true}
        onClose={vi.fn()}
        onPhaseTaskToggle={onPhaseToggleMock}
      />
    );

    // Initial progress 0 / 2 Done (0%)
    expect(screen.getByText(/0 \/ 2 Done \(0%\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mark all tasks completed/i })).toBeInTheDocument();

    // Toggle Phase 1
    const taskCheckboxes = screen.getAllByRole('checkbox');
    expect(taskCheckboxes).toHaveLength(2);
    expect(taskCheckboxes[0]).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(taskCheckboxes[0]);

    // Phase 1 toggled to true
    expect(taskCheckboxes[0]).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/1 \/ 2 Done \(50%\)/i)).toBeInTheDocument();
    expect(onPhaseToggleMock).toHaveBeenCalledWith('t1_bb_squat_phase_0', true);

    // Click "Mark All Tasks Done"
    const markAllBtn = screen.getByRole('button', { name: /Mark all tasks completed/i });
    fireEvent.click(markAllBtn);

    expect(screen.getByText(/2 \/ 2 Done \(100%\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reset all tasks/i })).toBeInTheDocument();
  });
});
