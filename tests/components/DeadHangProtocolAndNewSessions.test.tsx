import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExerciseCard } from '../../src/components/ExerciseCard';
import {
  WORKOUT_PROGRAM,
  SESSION_RUN,
  SESSION_POST_BJJ,
  RECOVERY_SESSIONS,
  ALL_SESSIONS,
  WORKOUT_SESSIONS,
} from '../../src/domain/programData';
import { getMobilityCheckInStatus } from '../../src/domain/mobility';
import App from '../../src/App';

describe('Dead Hang Protocol, Zero-Device Face Pull, Run & BJJ Recovery Workouts', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  describe('1. Active Dead Hang & Indian Club Arm Casts Drill Checklist', () => {
    const deadHangExercise = WORKOUT_PROGRAM.upper_a.exercises.find((e) =>
      e.id === 't3_dead_hang_club_mills'
    )!;

    it('renders the Dead Hang & Indian Club Casts protocol panel with round tabs and all 3 drills', () => {
      const logs = [
        { setNumber: 1, targetReps: '3 Drills', weightLbs: 0, repsAchieved: 0, isCompleted: false, notes: '' },
        { setNumber: 2, targetReps: '3 Drills', weightLbs: 0, repsAchieved: 0, isCompleted: false, notes: '' },
      ];

      render(
        <ExerciseCard
          exercise={deadHangExercise}
          logs={logs}
          onUpdateSetLog={vi.fn()}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );

      // Verify protocol panel is rendered
      expect(screen.getByTestId('deadhang-club-protocol')).toBeInTheDocument();
      expect(screen.getByText(/Active Dead Hang & Indian Club Casts Protocol/i)).toBeInTheDocument();

      // Verify round tabs
      expect(screen.getByTestId('deadhang-round-tab-1')).toBeInTheDocument();
      expect(screen.getByTestId('deadhang-round-tab-2')).toBeInTheDocument();

      // Verify constituent drills
      expect(screen.getByTestId('deadhang-drill-dead_hang')).toBeInTheDocument();
      expect(screen.getByTestId('deadhang-drill-club_casts_left')).toBeInTheDocument();
      expect(screen.getByTestId('deadhang-drill-club_casts_right')).toBeInTheDocument();

      // Verify 1-tap round completion button
      expect(screen.getByTestId('deadhang-round-1-complete-btn')).toBeInTheDocument();
    });

    it('toggling individual drill checkboxes updates set log with drill progress', () => {
      const onUpdateSetLog = vi.fn();
      const logs = [
        { setNumber: 1, targetReps: '3 Drills', weightLbs: 0, repsAchieved: 0, isCompleted: false, notes: '' },
        { setNumber: 2, targetReps: '3 Drills', weightLbs: 0, repsAchieved: 0, isCompleted: false, notes: '' },
      ];

      render(
        <ExerciseCard
          exercise={deadHangExercise}
          logs={logs}
          onUpdateSetLog={onUpdateSetLog}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={vi.fn()}
          onQuickStartTempo={vi.fn()}
        />
      );

      // Click Drill 1 checkbox
      const drill1Btn = screen.getByTestId('deadhang-toggle-drill-dead_hang');
      fireEvent.click(drill1Btn);

      expect(onUpdateSetLog).toHaveBeenCalledWith(
        deadHangExercise.id,
        0,
        expect.objectContaining({
          isCompleted: false,
          repsAchieved: 1,
          notes: '1/3 Drills Done',
        })
      );
    });

    it('1-tap Round Complete button marks all 3 drills done and starts rest timer', () => {
      const onUpdateSetLog = vi.fn();
      const onQuickStartRest = vi.fn();
      const logs = [
        { setNumber: 1, targetReps: '3 Drills', weightLbs: 0, repsAchieved: 0, isCompleted: false, notes: '' },
        { setNumber: 2, targetReps: '3 Drills', weightLbs: 0, repsAchieved: 0, isCompleted: false, notes: '' },
      ];

      render(
        <ExerciseCard
          exercise={deadHangExercise}
          logs={logs}
          onUpdateSetLog={onUpdateSetLog}
          onOpenCueCard={vi.fn()}
          onQuickStartRest={onQuickStartRest}
          onQuickStartTempo={vi.fn()}
        />
      );

      const round1CompleteBtn = screen.getByTestId('deadhang-round-1-complete-btn');
      fireEvent.click(round1CompleteBtn);

      expect(onUpdateSetLog).toHaveBeenCalledWith(
        deadHangExercise.id,
        0,
        expect.objectContaining({
          isCompleted: true,
          repsAchieved: 3,
          notes: '3/3 Drills Complete · Hang & Club Casts',
        })
      );
      expect(onQuickStartRest).toHaveBeenCalledWith(deadHangExercise.restSeconds);
    });
  });

  describe('2. Athlean-X Non-Negotiable Face Pull Alternative (Zero Device Needed)', () => {
    it('uses user BowFlex kettlebell or Indian clubs with zero cables or anchors', () => {
      const facePull = WORKOUT_PROGRAM.upper_a.exercises.find((e) =>
        e.id === 't3_athlean_face_pull'
      );
      expect(facePull).toBeDefined();
      expect(facePull?.name.toLowerCase()).toContain('face pull');
      expect(facePull?.name).toMatch(/Athlean-X Non-Negotiable Face Pull/i);
      expect(facePull?.equipment).toBe('kettlebell');
      expect(facePull?.defaultWeight).toBe(12);
      expect(facePull?.biomechanicalRationale).toContain('BowFlex 840 kettlebell');
    });
  });

  describe('3. Bi-Weekly Mobility Assessment Check-In Prompt', () => {
    it('calculates isDue=true when no prior history or >= 14 days elapsed', () => {
      const emptyStatus = getMobilityCheckInStatus([]);
      expect(emptyStatus.isDue).toBe(true);

      const oldDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
      const oldStatus = getMobilityCheckInStatus([
        { testId: 'knee-to-wall', date: oldDate, value: 12 },
      ]);
      expect(oldStatus.isDue).toBe(true);

      const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const recentStatus = getMobilityCheckInStatus([
        { testId: 'knee-to-wall', date: recentDate, value: 12 },
      ]);
      expect(recentStatus.isDue).toBe(false);
    });

    it('renders bi-weekly mobility reminder prompt in App and allows 1-tap navigation to Mobility tab', () => {
      render(<App />);

      expect(screen.getByTestId('biweekly-mobility-prompt')).toBeInTheDocument();
      expect(screen.getByText(/Bi-Weekly Mobility Assessment Due/i)).toBeInTheDocument();

      const logNowBtn = screen.getByTestId('biweekly-mobility-log-now-btn');
      fireEvent.click(logNowBtn);

      // Should navigate to mobility tab
      expect(screen.getByText(/Mobility & Flexibility Tracker/i)).toBeInTheDocument();
    });

    it('snooze button hides the bi-weekly prompt for 2 days', () => {
      render(<App />);

      const snoozeBtn = screen.getByTestId('biweekly-mobility-snooze-btn');
      fireEvent.click(snoozeBtn);

      expect(screen.queryByTestId('biweekly-mobility-prompt')).not.toBeInTheDocument();
    });
  });

  describe('4. Dedicated Run Conditioning Session & Pre/Post Boosters', () => {
    it('contains SESSION_RUN with Pre-Run Primers and Post-Run Boosters', () => {
      expect(SESSION_RUN).toBeDefined();
      expect(SESSION_RUN.id).toBe('run_conditioning');
      expect(SESSION_RUN.estimatedDurationMinutes).toBe(45);

      // Pre-Run Priming in warmup
      const warmupDrills = SESSION_RUN.warmup.map((w) => w.name);
      expect(warmupDrills).toContain('Squat U Ankle Mobilization & Tripod Rooting');
      expect(warmupDrills).toContain('ATG Tibialis Wall Raises');
      expect(warmupDrills).toContain('Dr. Alyssa Lu Glute Medius & Pelvic Leveling');

      // Working exercises: Aerobic base run, backward locomotion, rowing flush, couch stretch, elephant walks
      const exerciseNames = SESSION_RUN.exercises.map((e) => e.name);
      expect(exerciseNames).toContain('Zone 2 Aerobic Base Run (Mitochondrial Building)');
      expect(exerciseNames).toContain('Ben Patrick Backward Locomotion / Backward Running');
      expect(exerciseNames).toContain('Rowing Machine Active Metabolic Flush');
      expect(exerciseNames).toContain('Ben Patrick ATG Couch Stretch');
      expect(exerciseNames).toContain('ATG Elephant Walks (Active Reciprocal Lengthening)');
    });
  });

  describe('5. Post-BJJ 1-Hour Recovery & Joint Restoration Routine', () => {
    it('contains SESSION_POST_BJJ addressing cervical spine, traction, hip opening, and grip fatigue', () => {
      expect(SESSION_POST_BJJ).toBeDefined();
      expect(SESSION_POST_BJJ.id).toBe('post_bjj_recovery');
      expect(SESSION_POST_BJJ.estimatedDurationMinutes).toBe(20);

      const exerciseNames = SESSION_POST_BJJ.exercises.map((e) => e.name);
      expect(exerciseNames).toContain('Dr. Stuart McGill Cervical Retraction & Chin Tuck');
      expect(exerciseNames).toContain('Active Scapular Overhead Dead Hang Traction');
      expect(exerciseNames).toContain('Thoracic Spine Open-Book Rotations with Positional Reach');
      expect(exerciseNames).toContain('Dr. Alyssa Lu 90/90 Hip Reset & Groin Adductor Release');
      expect(exerciseNames).toContain('Indian Club Synovial Wrist & Forearm Flush');
      expect(exerciseNames).toContain('Athlean-X Post-Grappling Hanging Knee Raise & Pelvic Decompression');
      expect(exerciseNames).toContain('Athlean-X Grappler Hollow Body Core Compression Hold');
      expect(exerciseNames).toContain('Athlean-X Cross-Body Oblique Climbers & Serratus Punch');
      expect(exerciseNames).toContain('Dr. Stuart McGill Post-Grappling Isometric Curl-Up & Vacuum Brace');
    });
  });

  describe('6. Navigation & Session Roster Architecture', () => {
    it('maintains exactly 4 GZCL Upper/Lower sessions in WORKOUT_SESSIONS and 2 in RECOVERY_SESSIONS', () => {
      expect(WORKOUT_SESSIONS).toHaveLength(4);
      expect(RECOVERY_SESSIONS).toHaveLength(2);
      expect(ALL_SESSIONS).toHaveLength(6);
      expect(WORKOUT_PROGRAM.run_conditioning).toBeDefined();
      expect(WORKOUT_PROGRAM.post_bjj_recovery).toBeDefined();
    });
  });
});
