// tests/components/AthleanDailyAbs.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  WORKOUT_PROGRAM,
  SESSION_DAILY_ABS,
  WORKOUT_SESSIONS,
  RECOVERY_SESSIONS,
  ALL_SESSIONS,
  ALL_APP_SESSIONS,
} from '../../src/domain/programData';
import { CUE_CARDS } from '../../src/domain/cueCardsData';
import { EXERCISE_VISUALS } from '../../src/domain/exerciseVisualsData';
import { SessionNav } from '../../src/components/SessionNav';
import { storageManager } from '../../src/storage/storageManager';
import App from '../../src/App';

describe('Daily Core Routine Protocol & Kinetic Chain Science', () => {
  beforeEach(() => {
    localStorage.clear();
    storageManager.clear();
    vi.useRealTimers();
  });

  describe('1. Scientific Kinetic Sequence & Equipment Constraints', () => {
    it('implements the exact 6-stage kinetic sequence in SESSION_DAILY_ABS', () => {
      expect(SESSION_DAILY_ABS).toBeDefined();
      expect(SESSION_DAILY_ABS.id).toBe('daily_abs');
      expect(SESSION_DAILY_ABS.title).toBe('Daily Core Routine');
      expect(SESSION_DAILY_ABS.subtitle).toContain('Kinetic Chain 6-Minute Core Progression');
      expect(SESSION_DAILY_ABS.estimatedDurationMinutes).toBe(10);
      expect(Array.isArray(SESSION_DAILY_ABS.creatorInfluences)).toBe(true);

      const exercises = SESSION_DAILY_ABS.exercises;
      expect(exercises).toHaveLength(5);

      // 1. Bottom-Up (Pelvis to Ribcage)
      expect(exercises[0].id).toBe('t3_athlean_hanging_knee_raise');
      expect(exercises[0].muscleGroups).toContain('Lower Rectus Abdominis');
      expect(exercises[0].equipment).toBe('pull_up_bar');

      // 2. Bottom-Up Rotational
      expect(exercises[1].id).toBe('t3_athlean_hanging_corkscrew');
      expect(exercises[1].muscleGroups).toContain('Internal Obliques');
      expect(exercises[1].muscleGroups).toContain('External Obliques');
      expect(exercises[1].equipment).toBe('pull_up_bar');

      // 3. Mid-Range Anti-Extension & Core Compression
      expect(exercises[2].id).toBe('t3_athlean_hollow_body_hold');
      expect(exercises[2].tempo).toBe('Isometric Hold');
      expect(exercises[2].equipment).toBe('bodyweight');

      // 4. Top-Down Flexion (Ribcage to Pelvis)
      expect(exercises[3].id).toBe('t3_athlean_iso_crunch');
      expect(exercises[3].muscleGroups).toContain('Upper Rectus Abdominis');
      expect(exercises[3].tempo).toBe('2112');

      // 5. Transverse Abdominis & Core Cylinder Finisher
      expect(exercises[4].id).toBe('t3_athlean_serratus_plank');
      expect(exercises[4].muscleGroups).toContain('Transversus Abdominis');
      expect(exercises[4].tempo).toBe('Isometric Hold');
    });

    it('contains Dr. Stuart McGill Cat-Camel and Athlean-X 90/90 vacuum breath warmups', () => {
      const warmups = SESSION_DAILY_ABS.warmup;
      expect(warmups).toHaveLength(2);

      expect(warmups[0].id).toBe('w_abs_1');
      expect(warmups[0].name).toContain('Cat-Camel');
      expect(warmups[0].creatorAttribution).toBeDefined();

      expect(warmups[1].id).toBe('w_abs_2');
      expect(warmups[1].name).toContain('90/90 Diaphragmatic Vacuum Breath');
      expect(warmups[1].creatorAttribution).toBeDefined();
    });

    it('strictly adheres to user home gym equipment (pull-up bar, bodyweight, kettlebell)', () => {
      const allowedEquipment = new Set(['pull_up_bar', 'bodyweight', 'kettlebell']);
      for (const ex of SESSION_DAILY_ABS.exercises) {
        expect(allowedEquipment.has(ex.equipment)).toBe(true);
      }
      for (const wu of SESSION_DAILY_ABS.warmup) {
        expect(allowedEquipment.has(wu.equipment)).toBe(true);
      }
    });
  });

  describe('2. Navigation & Session Roster Architecture', () => {
    it('preserves 4 GZCL sessions and 2 recovery sessions while registering daily_abs', () => {
      expect(WORKOUT_SESSIONS).toHaveLength(4);
      expect(RECOVERY_SESSIONS).toHaveLength(2);
      expect(ALL_SESSIONS).toHaveLength(6);
      expect(ALL_APP_SESSIONS).toHaveLength(7);
      expect(WORKOUT_PROGRAM.daily_abs).toBeDefined();
      expect(WORKOUT_PROGRAM.daily_abs.id).toBe('daily_abs');
    });

    it('renders Daily Core Routine in SessionNav expanded card view', () => {
      const selectMock = vi.fn();
      const dummyStats = {
        daily_abs: { completedSets: 0, totalSets: 18, completedExercises: 0, totalExercises: 6, isComplete: false },
      };

      render(
        <SessionNav
          sessions={WORKOUT_SESSIONS}
          extraSessions={[...RECOVERY_SESSIONS, SESSION_DAILY_ABS]}
          activeSessionId="lower_a"
          onSelectSession={selectMock}
          sessionStats={dummyStats}
        />
      );

      const dailyAbsCard = screen.getByTestId('session-nav-card-daily_abs');
      expect(dailyAbsCard).toBeInTheDocument();
      expect(dailyAbsCard).toHaveTextContent(/Daily Core Routine/i);
      expect(dailyAbsCard).toHaveTextContent(/Bottom-Up ➔ Rotational ➔ Top-Down ➔ Plank/i);

      fireEvent.click(dailyAbsCard);
      expect(selectMock).toHaveBeenCalledWith('daily_abs');
    });

    it('renders Daily Core Routine in SessionNav collapsed pill bar', () => {
      const selectMock = vi.fn();
      localStorage.setItem('workout_session_nav_collapsed_v1', 'true');

      render(
        <SessionNav
          sessions={WORKOUT_SESSIONS}
          extraSessions={[...RECOVERY_SESSIONS, SESSION_DAILY_ABS]}
          activeSessionId="lower_a"
          onSelectSession={selectMock}
          sessionStats={{}}
        />
      );

      const dailyAbsPill = screen.getByTestId('session-nav-pill-daily_abs');
      expect(dailyAbsPill).toBeInTheDocument();
      expect(dailyAbsPill).toHaveTextContent(/Daily Core Routine/i);

      fireEvent.click(dailyAbsPill);
      expect(selectMock).toHaveBeenCalledWith('daily_abs');
    });
  });

  describe('3. Cue Cards & Biomechanical Form Rationale Coverage', () => {
    const requiredIds = [
      't3_athlean_hanging_knee_raise',
      't3_athlean_hanging_corkscrew',
      't3_athlean_hollow_body_hold',
      't3_athlean_iso_crunch',
      't3_athlean_serratus_plank',
      't3_core_lying_pelvic_curl',
      't3_core_side_plank_lifts',
      't3_core_marching_plank',
      't3_core_9090_crunch',
      't3_core_twisted_t_plank',
      't3_core_hanging_bat_tuck',
      't3_core_russian_twists',
      't3_core_cliffhanger_plank',
      't3_core_frog_crunch',
      't3_core_twisting_pistons',
      't3_core_hanging_scissors',
      't3_core_statue_liberty',
      't3_core_alligator_plank',
      't3_core_janda_crunch',
      't3_core_sprinter_tuck_plank',
      'w_abs_1',
      'w_abs_2',
    ];

    it('provides comprehensive creator cue cards for all daily abs exercises and warmups', () => {
      for (const id of requiredIds) {
        const card = CUE_CARDS.find((c) => c.exerciseId === id);
        expect(card, `Cue card missing for exerciseId ${id}`).toBeDefined();
        expect(card?.creatorCues.length).toBeGreaterThan(0);
        expect(card?.setupInstructions.length).toBeGreaterThan(0);
        expect(card?.commonFaults.length).toBeGreaterThan(0);
      }
    });

    it('provides interactive visual diagrams for all daily abs exercises and warmups', () => {
      for (const id of requiredIds) {
        const visual = EXERCISE_VISUALS[id];
        expect(visual, `Visual missing for ${id}`).toBeDefined();
        expect(visual.keyCues.length).toBeGreaterThan(0);
        expect(visual.caption).toBeTruthy();
      }
    });
  });

  describe('4. Full App Integration & Post-BJJ Ab Workout', () => {
    it('verifies Daily Core Routine is removed from conditioning & recovery nav in App and integrated into Post-BJJ 1-Hr Reset', () => {
      render(<App />);

      // Daily Abs card is removed from conditioning & recovery protocols section
      expect(screen.queryByTestId('session-nav-card-daily_abs')).toBeNull();

      // Post-BJJ card is present
      const postBjjCard = screen.getByTestId('session-nav-card-post_bjj_recovery');
      expect(postBjjCard).toBeInTheDocument();
      fireEvent.click(postBjjCard);

      // Verify Post-BJJ 1-Hr Reset header
      expect(screen.getAllByText(/Post-BJJ 1-Hr Reset/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Grappler Ab Reset/i).length).toBeGreaterThan(0);

      // Verify integrated ab workout exercises in Post-BJJ Reset
      expect(screen.getByText(/Post-Grappling Hanging Knee Raise & Pelvic Decompression/i)).toBeInTheDocument();
      expect(screen.getByText(/Grappler Hollow Body Core Compression Hold/i)).toBeInTheDocument();
      expect(screen.queryByText(/Cross-Body Oblique Climbers & Serratus Punch/i)).toBeNull();
      expect(screen.getByText(/Post-Grappling Isometric Curl-Up & Vacuum Brace/i)).toBeInTheDocument();
    });

    it('does not offer a separate Daily Abs session after a workout: the finisher is already in every workout', () => {
      render(<App />);

      // Mark the active workout (Lower A) as completed via 1-tap button
      const markCompletedBtn = screen.getByRole('button', { name: /Mark Workout as Completed/i });
      fireEvent.click(markCompletedBtn);

      // If completion modal appears for unperformed exercises, confirm adjustments to complete
      const modalConfirmBtn = screen.queryByTestId('confirm-completion-adjustments-btn');
      if (modalConfirmBtn) {
        fireEvent.click(modalConfirmBtn);
      }

      // The toast no longer duplicates the in-workout finisher with a "Daily Abs" button
      expect(screen.getByTestId('session-completion-toast')).toBeInTheDocument();
      expect(screen.queryByTestId('toast-daily-abs-btn')).not.toBeInTheDocument();
      expect(screen.queryByTestId('daily-abs-finisher-prompt')).not.toBeInTheDocument();

      // The next workout carries the Daily Core Finisher itself
      expect(screen.getByTestId('daily-core-finisher-section')).toBeInTheDocument();
    });
  });

  describe('5. Regular Session Incorporation (Lower A, Upper A, Lower B, Upper B)', () => {
    const regularSessionKeys = ['lower_a', 'upper_a', 'lower_b', 'upper_b'] as const;

    it('incorporates distinct 5-stage core finisher routines into all 4 regular sessions without mountain climbers', () => {
      regularSessionKeys.forEach((key) => {
        const session = WORKOUT_PROGRAM[key];
        expect(session).toBeDefined();

        const coreCircuitExercises = session.dailyCoreFinisher || [];
        expect(coreCircuitExercises).toHaveLength(5);

        // Every core finisher exercise is T3, 1 target set, 30s rest
        coreCircuitExercises.forEach((ex) => {
          expect(ex.tier).toBe('T3');
          expect(ex.targetSets).toBe(1);
          expect(ex.restSeconds).toBe(30);
          expect(ex.name.toLowerCase()).not.toContain('mountain climber');
        });
      });

      // Verify session-specific rotating core themes
      expect(WORKOUT_PROGRAM.lower_a.dailyCoreFinisher?.[0].name).toContain('Hanging Knee Raise');
      expect(WORKOUT_PROGRAM.upper_a.dailyCoreFinisher?.[0].name).toContain('Lying Reverse Pelvic Curls');
      expect(WORKOUT_PROGRAM.lower_b.dailyCoreFinisher?.[0].name).toContain('Hanging Bent-Leg L-Sit');
      expect(WORKOUT_PROGRAM.upper_b.dailyCoreFinisher?.[0].name).toContain('Hanging Alternating Scissor Raises');
    });

    it('guarantees pull-up bar is in equipmentRequired for lower sessions for hanging core movements', () => {
      expect(WORKOUT_PROGRAM.lower_a.equipmentRequired).toContain('pull_up_bar');
      expect(WORKOUT_PROGRAM.lower_b.equipmentRequired).toContain('pull_up_bar');
    });

    it('keeps all regular sessions strictly within 45 to 60 minute limit', () => {
      regularSessionKeys.forEach((key) => {
        const session = WORKOUT_PROGRAM[key];
        expect(session.estimatedDurationMinutes).toBeGreaterThanOrEqual(45);
        expect(session.estimatedDurationMinutes).toBeLessThanOrEqual(60);
      });
    });

    it('renders the daily core finisher exercises and badge within Lower A in App', () => {
      render(<App />);

      // Lower A is active by default; expand Tier 3 or check presence of ab exercises
      expect(screen.getByText(/Hanging Knee Raise with Posterior Pelvic Tilt/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Daily Core Finisher/i).length).toBeGreaterThan(0);
    });

    it('allows 1-tap completion and toggling of all 6 core sets in Lower A', () => {
      render(<App />);

      const markAllBtn = screen.getByRole('button', { name: /Mark All 6 Core Sets Done/i });
      expect(markAllBtn).toBeInTheDocument();

      // 1-tap completes all 6 core finisher sets
      fireEvent.click(markAllBtn);
      expect(screen.getByRole('button', { name: /All 6 Core Sets Done ✓/i })).toBeInTheDocument();

      // 1-tap toggle uncompletes them
      fireEvent.click(screen.getByRole('button', { name: /All 6 Core Sets Done ✓/i }));
      expect(screen.getByRole('button', { name: /Mark All 6 Core Sets Done/i })).toBeInTheDocument();
    });

    it('clears core finisher logs when resetting the entire workout session', () => {
      render(<App />);

      // Mark all 6 core sets done
      const markAllBtn = screen.getByRole('button', { name: /Mark All 6 Core Sets Done/i });
      fireEvent.click(markAllBtn);
      expect(screen.getByRole('button', { name: /All 6 Core Sets Done ✓/i })).toBeInTheDocument();

      // Reset the session
      const resetBtn = screen.getAllByRole('button', { name: /Reset session logs/i })[0];
      fireEvent.click(resetBtn);

      // Core finisher button returns to uncompleted state
      expect(screen.getByRole('button', { name: /Mark All 6 Core Sets Done/i })).toBeInTheDocument();
    });
  });
});
