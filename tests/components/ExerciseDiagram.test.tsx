import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ExerciseDiagram } from '../../src/components/ExerciseDiagram';
import { EXERCISE_VISUALS } from '../../src/domain/exerciseVisualsData';

describe('ExerciseDiagram Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders compact thumbnail variant with accessible zoom trigger', () => {
    const handleZoom = vi.fn();
    render(
      <ExerciseDiagram
        diagramType="squat"
        exerciseName="Barbell Back Squat"
        compact={true}
        onOpenZoom={handleZoom}
      />
    );

    const button = screen.getByRole('button', { name: /View form demonstration for Barbell Back Squat/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('w-11');
    expect(button).toHaveClass('h-11');

    fireEvent.click(button);
    expect(handleZoom).toHaveBeenCalledTimes(1);
  });

  it('renders full interactive diagram with position buttons and phase indicators', () => {
    render(<ExerciseDiagram diagramType="split_squat" exerciseName="ATG Split Squat" />);

    expect(screen.getByRole('button', { name: /1\. Setup \/ Lockout/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2\. Peak Contraction \/ Depth/i })).toBeInTheDocument();
    expect(screen.getByText(/Phase: Setup \/ Lockout/i)).toBeInTheDocument();
  });

  it('switches between setup and peak contraction phases when buttons are clicked', () => {
    render(<ExerciseDiagram diagramType="squat" exerciseName="Barbell Back Squat" />);

    const bottomBtn = screen.getByRole('button', { name: /2\. Peak Contraction \/ Depth/i });
    fireEvent.click(bottomBtn);

    expect(screen.getByText(/Phase: Bottom Contraction/i)).toBeInTheDocument();

    const startBtn = screen.getByRole('button', { name: /1\. Setup \/ Lockout/i });
    fireEvent.click(startBtn);

    expect(screen.getByText(/Phase: Setup \/ Lockout/i)).toBeInTheDocument();
  });

  it('plays the tempo timeline: top hold, 3s lowering, bottom, explosive drive', () => {
    render(<ExerciseDiagram diagramType="rdl" tempo="30X1" />);

    // 30X1 → 1s top hold, 3s eccentric, short bottom pause, explosive concentric
    expect(screen.getByText(/Phase: Setup \/ Lockout/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByText(/Phase: Lower · 3s/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2600); // t ≈ 4.1s
    });
    expect(screen.getByText(/Phase: Bottom Contraction/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500); // t ≈ 4.6s
    });
    expect(screen.getByText(/Phase: Drive · explosive/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(700); // wraps past 5.05s
    });
    expect(screen.getByText(/Phase: Setup \/ Lockout/i)).toBeInTheDocument();
  });

  it('pauses the loop and keeps the figure still', () => {
    render(<ExerciseDiagram diagramType="squat" tempo="30X1" />);
    fireEvent.click(screen.getByTitle(/Pause animation loop/i));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText(/Phase: Setup \/ Lockout/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Auto-play motion demonstration/i)).toBeInTheDocument();
  });

  it('draws the trajectory, ghosts, angle readout and tempo timeline, and toggles them', () => {
    render(<ExerciseDiagram diagramType="bench_press" tempo="30X1" />);
    fireEvent.click(screen.getByTestId('diagram-view-side'));
    expect(screen.getByTestId('diagram-trajectory')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-ghosts')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-angle-readout')).toHaveTextContent(/\d+°/);
    expect(screen.getByText('J-curve bar path')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-timeline').children.length).toBeGreaterThanOrEqual(4);

    fireEvent.click(screen.getByRole('button', { name: /Toggle trajectory/i }));
    expect(screen.queryByTestId('diagram-trajectory')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Toggle ghost poses/i }));
    expect(screen.queryByTestId('diagram-ghosts')).not.toBeInTheDocument();
  });

  it('highlights the worked muscles', () => {
    const { container } = render(<ExerciseDiagram diagramType="squat" />);
    const worked = [...container.querySelectorAll('[data-worked]')].map((e) => e.getAttribute('data-worked'));
    expect(worked).toEqual(expect.arrayContaining(['thN', 'thF']));
  });

  it('opens each exercise in its best camera angle', () => {
    const cases: [string, string, string][] = [
      ['squat', 'Barbell Back Squat', 'front45'],
      ['rdl', 'Barbell Romanian Deadlift (RDL)', 'rear45'],
      ['pullup', 'Pull-Up Ladder & Negatives', 'rear45'],
      ['face_pull', 'Athlean-X Face Pull', 'rear45'],
      ['single_leg_atw', 'Single-Leg Kettlebell Around-the-Worlds', 'top'],
      ['carry', 'Heavy Kettlebell Suitcase Carry', 'top'],
      ['pullup', 'Athlean-X Hanging Knee Raise with Pelvic Curl', 'front45'],
    ];
    cases.forEach(([type, name, cam]) => {
      const { unmount } = render(<ExerciseDiagram diagramType={type as never} exerciseName={name} />);
      expect(screen.getByTestId(`diagram-view-${cam}`)).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByTestId('diagram-oblique')).toHaveAttribute('data-view', cam);
      expect(screen.queryByTestId('diagram-frontal')).not.toBeInTheDocument();
      unmount();
    });
  });

  it('shows the shoulder blades, spine and hip line from behind, and twist lines from above', () => {
    const { unmount } = render(<ExerciseDiagram diagramType="rdl" />);
    expect(screen.getByTestId('oblique-scapulae')).toBeInTheDocument();
    expect(screen.getByTestId('oblique-spine')).toBeInTheDocument();
    expect(screen.getByTestId('oblique-hip-line')).toBeInTheDocument();
    expect(screen.getByTestId('oblique-trajectory')).toBeInTheDocument();
    unmount();
    render(<ExerciseDiagram diagramType="single_leg_atw" />);
    expect(screen.getByTestId('oblique-twist-lines')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-oblique-cue')).toHaveTextContent(/Top view: Bell circles the waist/);
  });

  it('switches through every camera, all driven by the same clock', () => {
    render(<ExerciseDiagram diagramType="bench_press" tempo="30X1" />);
    (['front45', 'rear45', 'top'] as const).forEach((cam) => {
      fireEvent.click(screen.getByTestId(`diagram-view-${cam}`));
      expect(screen.getByTestId('diagram-oblique')).toHaveAttribute('data-view', cam);
      expect(screen.queryByTestId('diagram-frontal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('diagram-trajectory')).not.toBeInTheDocument();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByText(/Phase: Lower/i)).toBeInTheDocument();
    expect(screen.getAllByTestId(/^diagram-view-/).map((b) => b.textContent)).toEqual(['Side', 'Head-end', '¾ Front', '¾ Rear', 'Top', 'Both']);
  });

  it('switches between side, front/back and both in sync', () => {
    render(<ExerciseDiagram diagramType="squat" tempo="30X1" />);
    fireEvent.click(screen.getByTestId('diagram-view-both'));
    expect(screen.getByTestId('diagram-view-both')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('diagram-frontal')).toHaveAttribute('data-view', 'front');
    expect(screen.getByTestId('diagram-trajectory')).toBeInTheDocument();
    expect(screen.queryByTestId('diagram-oblique')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('diagram-view-frontal'));
    expect(screen.getByTestId('diagram-frontal')).toBeInTheDocument();
    expect(screen.queryByTestId('diagram-trajectory')).not.toBeInTheDocument();
    expect(screen.getByTestId('diagram-frontal-cue')).toHaveTextContent(/Front view: Knees track over the toes/);
    expect(screen.getByTestId('frontal-guide')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('diagram-view-side'));
    expect(screen.queryByTestId('diagram-frontal')).not.toBeInTheDocument();
    expect(screen.getByTestId('diagram-trajectory')).toBeInTheDocument();
    expect(screen.getByText(/Phase: Setup \/ Lockout/i)).toBeInTheDocument();
  });

  it('uses a back view with shoulder blades for pulling and hinging work', () => {
    render(<ExerciseDiagram diagramType="rdl" />);
    expect(screen.getByTestId('diagram-view-frontal')).toHaveTextContent('Back');
    fireEvent.click(screen.getByTestId('diagram-view-frontal'));
    expect(screen.getByTestId('diagram-frontal')).toHaveAttribute('data-view', 'back');
    expect(screen.getByTestId('frontal-scapulae')).toBeInTheDocument();
  });

  it('respects forcedPhase prop when synchronized with tempo metronome', () => {
    const { rerender } = render(
      <ExerciseDiagram diagramType="bench_press" forcedPhase="bottom" />
    );

    expect(screen.getByText(/Phase: Bottom Contraction/i)).toBeInTheDocument();

    rerender(<ExerciseDiagram diagramType="bench_press" forcedPhase="start" />);
    expect(screen.getByText(/Phase: Setup \/ Lockout/i)).toBeInTheDocument();
  });

  it('renders all 30 diagram types without errors in both compact and full modes', () => {
    const allDiagramTypes = [
      'squat',
      'split_squat',
      'tibialis',
      'step_down',
      'core_mcgill',
      'bench_press',
      'kb_row',
      'floor_press',
      'face_pull',
      'dead_hang',
      'rdl',
      'good_morning',
      'biering_sorensen',
      'carry',
      'ohp',
      'pullup',
      'z_press',
      'lsit',
      'arms',
      'warmup_row',
      'warmup_90_90',
      'warmup_calf',
      'warmup_ankle',
      'warmup_club',
      'warmup_scapular',
      'warmup_elephant',
      'warmup_dead_hang',
      'warmup_wall_slide',
      'warmup_walk',
      'warmup_hip',
    ] as const;

    allDiagramTypes.forEach((type) => {
      // Test compact variant
      const { unmount: unmountCompact } = render(<ExerciseDiagram diagramType={type} compact={true} />);
      unmountCompact();

      // Test full interactive variant
      const { unmount: unmountFull } = render(<ExerciseDiagram diagramType={type} compact={false} />);
      unmountFull();
    });
  });


  it('validates EXERCISE_VISUALS dictionary completeness including all warmup drills', () => {
    expect(EXERCISE_VISUALS.t1_bb_squat).toBeDefined();
    expect(EXERCISE_VISUALS.t2_atg_split_squat).toBeDefined();
    expect(EXERCISE_VISUALS.t1_bb_bench_press).toBeDefined();
    expect(EXERCISE_VISUALS.t1_bb_rdl).toBeDefined();
    expect(EXERCISE_VISUALS.t1_bb_ohp).toBeDefined();

    // Verify all 14 warmup drills exist in EXERCISE_VISUALS
    const warmupDrillIds = [
      'w_lower_a_1', 'w_lower_a_2', 'w_lower_a_3', 'w_lower_a_4', 'w_lower_a_5',
      'w_upper_a_1', 'w_upper_a_2', 'w_upper_a_3',
      'w_lower_b_1', 'w_lower_b_2', 'w_lower_b_3', 'w_lower_b_4',
      'w_upper_b_1', 'w_upper_b_2', 'w_upper_b_3',
    ];

    warmupDrillIds.forEach((id) => {
      expect(EXERCISE_VISUALS[id]).toBeDefined();
      expect(EXERCISE_VISUALS[id].diagramType).toBeTruthy();
    });

    Object.values(EXERCISE_VISUALS).forEach((visual) => {
      expect(visual.exerciseName).toBeTruthy();
      expect(visual.caption).toBeTruthy();
      expect(visual.keyCues.length).toBeGreaterThan(0);
      expect(visual.jointAngleCues.start).toBeTruthy();
      expect(visual.jointAngleCues.bottom).toBeTruthy();
      expect(visual.trajectoryNote).toBeTruthy();
    });
  });
});

