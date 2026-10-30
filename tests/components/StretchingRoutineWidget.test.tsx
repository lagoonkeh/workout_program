// tests/components/StretchingRoutineWidget.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StretchingRoutineWidget } from '../../src/components/StretchingRoutineWidget';
import { SetLogRecord } from '../../src/components/ExerciseCard';
import { MobilityEntry } from '../../src/domain/mobility';

describe('StretchingRoutineWidget Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  const mockLogs: Record<string, SetLogRecord[]> = {
    t1_bb_squat: [
      {
        setNumber: 1,
        targetReps: '3',
        weightLbs: 185,
        repsAchieved: 3,
        isCompleted: true,
        notes: 'Patellar tendon felt tight after 3rd set'
      }
    ]
  };

  const mockMobility: MobilityEntry[] = [
    {
      testId: 'knee-to-wall',
      value: 3.0,
      unit: 'inches',
      date: '2026-10-14T10:00:00Z'
    }
  ];

  it('renders hero header, diagnostic insights panel, and adaptive stretch cards', () => {
    render(<StretchingRoutineWidget workoutLogs={mockLogs} mobilityHistory={mockMobility} />);

    expect(screen.getByText(/Evidence-Based Stretching Routine/i)).toBeInTheDocument();
    expect(screen.getByText(/Diagnostic Insights from Past 2 Weeks/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Patellar tendon felt tight after 3rd set/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Alyssa Lu Couch Stretch & Psoas Contract-Relax/i)).toBeInTheDocument();
  });

  it('toggles completion checkboxes and updates progress percentage', () => {
    render(<StretchingRoutineWidget workoutLogs={mockLogs} mobilityHistory={mockMobility} />);

    // Initially 0 / 5 Completed (0%)
    expect(screen.getByText(/0 \/ 5 Completed \(0%\)/i)).toBeInTheDocument();

    const checkButtons = screen.getAllByRole('button', { name: /Mark stretch .* as complete/i });
    fireEvent.click(checkButtons[0]);

    // Progress updates to 1 / 5 Completed (20%)
    expect(screen.getByText(/1 \/ 5 Completed \(20%\)/i)).toBeInTheDocument();

    // Click again to uncomplete
    const completedButtons = screen.getAllByRole('button', { name: /Mark stretch .* as incomplete/i });
    fireEvent.click(completedButtons[0]);
    expect(screen.getByText(/0 \/ 5 Completed \(0%\)/i)).toBeInTheDocument();
  });

  it('supports "Mark All Done" and "Reset Routine" actions', () => {
    render(<StretchingRoutineWidget workoutLogs={mockLogs} mobilityHistory={mockMobility} />);

    const markAllBtn = screen.getByRole('button', { name: /Mark All Done/i });
    fireEvent.click(markAllBtn);

    expect(screen.getByText(/5 \/ 5 Completed \(100%\)/i)).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /Reset stretching routine/i });
    fireEvent.click(resetBtn);

    expect(screen.getByText(/0 \/ 5 Completed \(0%\)/i)).toBeInTheDocument();
  });

  it('expands and collapses step-by-step protocol instructions and displays common faults', () => {
    render(<StretchingRoutineWidget workoutLogs={mockLogs} mobilityHistory={mockMobility} />);

    const protocolButtons = screen.getAllByRole('button', { name: /View Step-by-Step Protocol/i });
    fireEvent.click(protocolButtons[0]);

    expect(screen.getByText(/Step-by-Step Execution Protocol/i)).toBeInTheDocument();
    expect(screen.getByText(/Common Faults to Avoid:/i)).toBeInTheDocument();

    // Click to hide
    const hideBtn = screen.getByRole('button', { name: /Hide Protocol/i });
    fireEvent.click(hideBtn);
    expect(screen.queryByText(/Step-by-Step Execution Protocol/i)).not.toBeInTheDocument();
  });

  it('runs the interactive countdown timer and dispatches audio chime on completion', () => {
    vi.useFakeTimers();
    const chimeMock = vi.fn();

    render(
      <StretchingRoutineWidget
        workoutLogs={mockLogs}
        mobilityHistory={mockMobility}
        onPlayChime={chimeMock}
      />
    );

    const startButtons = screen.getAllByRole('button', { name: /Start Timer/i });
    fireEvent.click(startButtons[0]);

    // Timer shows pause button while active
    expect(screen.getByRole('button', { name: /Pause/i })).toBeInTheDocument();

    // Fast-forward 90 seconds (Side 1)
    act(() => {
      vi.advanceTimersByTime(90000);
    });

    // Chime fired for Side 1 transition
    expect(chimeMock).toHaveBeenCalled();

    // Fast-forward 90 seconds for Side 2
    act(() => {
      vi.advanceTimersByTime(90000);
    });

    expect(chimeMock).toHaveBeenCalledTimes(2);
  });

  it('allows collapsing and expanding the Adaptive Recovery Protocol card, Diagnostic Insights panel, and individual Stretch cards', () => {
    render(<StretchingRoutineWidget workoutLogs={mockLogs} mobilityHistory={mockMobility} />);

    // Both start expanded
    expect(screen.getByText(/Routine Progress:/i)).toBeInTheDocument();
    expect(screen.getByText(/Ankle Dorsiflexion at 3"/i)).toBeInTheDocument();

    // Collapse the Protocol overview card via its top-right Collapse button
    const collapseProtocolBtn = screen.getByRole('button', { name: /^Collapse protocol$/i });
    fireEvent.click(collapseProtocolBtn);

    expect(screen.queryByText(/Routine Progress:/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Expand protocol$/i })).toBeInTheDocument();
    expect(localStorage.getItem('workout_stretch_protocol_collapsed_v1')).toBe('true');

    // Expand the Protocol overview card back
    fireEvent.click(screen.getByRole('button', { name: /Expand protocol$/i }));
    expect(screen.getByText(/Routine Progress:/i)).toBeInTheDocument();
    expect(localStorage.getItem('workout_stretch_protocol_collapsed_v1')).toBe('false');

    // Collapse the Diagnostic Insights panel
    const collapseDiagnosticBtn = screen.getByRole('button', { name: /Collapse diagnostic$/i });
    fireEvent.click(collapseDiagnosticBtn);

    expect(screen.queryByText(/Ankle Dorsiflexion at 3"/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Expand diagnostic$/i })).toBeInTheDocument();
    expect(localStorage.getItem('workout_stretch_diagnostic_collapsed_v1')).toBe('true');

    // Expand the Diagnostic Insights panel back
    fireEvent.click(screen.getByRole('button', { name: /Expand diagnostic$/i }));
    expect(screen.getByText(/Ankle Dorsiflexion at 3"/i)).toBeInTheDocument();
    expect(localStorage.getItem('workout_stretch_diagnostic_collapsed_v1')).toBe('false');

    // Collapse an individual stretch card
    const collapseStretchBtns = screen.getAllByRole('button', { name: /Collapse stretch /i });
    expect(collapseStretchBtns.length).toBeGreaterThan(0);
    fireEvent.click(collapseStretchBtns[0]);

    const expandStretchBtns = screen.getAllByRole('button', { name: /Expand stretch /i });
    expect(expandStretchBtns.length).toBe(1);

    // Expand the individual stretch card back
    fireEvent.click(expandStretchBtns[0]);
    expect(screen.queryAllByRole('button', { name: /Expand stretch /i }).length).toBe(0);
  });

  it('switches between Adaptive Workout Protocol and Post-Bachata Dance Recovery modes', () => {
    render(<StretchingRoutineWidget workoutLogs={mockLogs} mobilityHistory={mockMobility} />);

    // Initially in Adaptive mode
    expect(screen.getByRole('tab', { name: /Adaptive Workout Protocol/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/Evidence-Based Stretching Routine/i)).toBeInTheDocument();

    // Click "Post-Bachata Dance Recovery" tab
    const bachataTab = screen.getByRole('tab', { name: /Post-Bachata Dance Recovery/i });
    fireEvent.click(bachataTab);

    // Verifies tab selection and mode persistence
    expect(bachataTab).toHaveAttribute('aria-selected', 'true');
    expect(localStorage.getItem('workout_stretching_routine_mode_v1')).toBe('bachata');

    // Header updates to Bachata routine
    expect(screen.getByText(/Post-Bachata Dance Recovery Routine/i)).toBeInTheDocument();
    expect(screen.getByText(/Dance Medicine Biomechanical Targets/i)).toBeInTheDocument();
    expect(screen.getByText(/Forefoot & Achilles Overload/i)).toBeInTheDocument();
    expect(screen.getByText(/Cuban Motion & Beat-4 Hip Pop/i)).toBeInTheDocument();
    expect(screen.getByText(/Sensual Wave Facet Shear/i)).toBeInTheDocument();
    expect(screen.getByText(/Dance Frame Anterior Chain Contracture/i)).toBeInTheDocument();

    // All 7 Bachata stretches are present
    expect(screen.getByText(/Ben Patrick \(ATG\) Dual-Angle Calf & Plantar Fascia Decompression/i)).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Alyssa Lu Couch Stretch & Psoas-QL Lateral Reach \(Hip Pop Reset\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Coach Eugene Teo 90\/90 Cuban Motion Hip Rotator & Piriformis Reset/i)).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Stuart McGill Sensual Wave Decompression & Lateral Child's Pose/i)).toBeInTheDocument();
    expect(screen.getByText(/Side-Lying Thoracic Windmill & Ribcage Decompression/i)).toBeInTheDocument();
    expect(screen.getByText(/Jeff Cavaliere \(ATHLEAN-X\) Dance Frame Reset & Pec Minor Distraction/i)).toBeInTheDocument();
    expect(screen.getByText(/Viparita Karani \(Legs-Up-The-Wall\) & Autonomic Parasympathetic Sigh/i)).toBeInTheDocument();

    // Progress shows 0 / 7 Completed (0%)
    expect(screen.getByText(/0 \/ 7 Completed \(0%\)/i)).toBeInTheDocument();

    // Mark all done in Bachata mode
    const markAllBtn = screen.getByRole('button', { name: /Mark All Done/i });
    fireEvent.click(markAllBtn);
    expect(screen.getByText(/7 \/ 7 Completed \(100%\)/i)).toBeInTheDocument();
    expect(localStorage.getItem('workout_completed_bachata_stretches_v1')).toContain('stretch_bachata_wall_calf_plantar');

    // Switch back to Adaptive mode - verify adaptive completion is isolated from Bachata completion
    const adaptiveTab = screen.getByRole('tab', { name: /Adaptive Workout Protocol/i });
    fireEvent.click(adaptiveTab);
    expect(screen.getByText(/Evidence-Based Stretching Routine/i)).toBeInTheDocument();
    expect(screen.getByText(/0 \/ 5 Completed \(0%\)/i)).toBeInTheDocument();
  });
});

