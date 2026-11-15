// tests/domain/adaptiveStretching.test.ts
import { describe, it, expect } from 'vitest';
import {
  generateAdaptiveStretchingRoutine,
  BACHATA_RECOVERY_ROUTINE,
  getBachataRecoveryRoutine
} from '../../src/domain/adaptiveStretching';
import { SetLogRecord } from '../../src/components/ExerciseCard';
import { MobilityEntry } from '../../src/domain/mobility';

describe('Adaptive Stretching Domain Engine', () => {
  it('generates a proactive 4-5 creator recovery routine when no notes or issues are present', () => {
    const routine = generateAdaptiveStretchingRoutine({}, []);

    expect(routine.stretches.length).toBeGreaterThanOrEqual(4);
    expect(routine.totalDurationSeconds).toBeGreaterThan(0);
    expect(routine.detectedIssues).toHaveLength(0);
    expect(routine.summaryText).toContain('Proactive');
    expect(routine.stretches.some((s) => s.id === 'stretch_couch_psoas')).toBe(true);
    expect(routine.stretches.some((s) => s.id === 'stretch_atg_elephant_walks')).toBe(true);
  });

  it('boosts Alyssa Lu Couch Stretch when knee or patellar comments are detected in workout logs', () => {
    const workoutLogs: Record<string, SetLogRecord[]> = {
      t1_bb_squat: [
        {
          setNumber: 1,
          targetReps: '3',
          weightLbs: 185,
          repsAchieved: 3,
          isCompleted: true,
          notes: 'Right patellar tendon felt slightly achy on descent'
        }
      ]
    };

    const routine = generateAdaptiveStretchingRoutine(workoutLogs, []);

    expect(routine.detectedIssues.length).toBeGreaterThan(0);
    expect(routine.detectedIssues[0].category).toBe('knee');
    expect(routine.detectedIssues[0].quote).toContain('patellar tendon felt slightly achy');

    const topStretch = routine.stretches[0];
    expect(topStretch.id).toBe('stretch_couch_psoas');
    expect(topStretch.triggerSource).toBe('comment');
    expect(topStretch.triggerReason).toContain('Triggered by your recent workout comment');
    expect(topStretch.triggerReason).toContain('patellar tendon felt slightly achy');
  });

  it('boosts Elephant Walks when hamstring tightness comments are logged', () => {
    const workoutLogs: Record<string, SetLogRecord[]> = {
      t1_bb_rdl: [
        {
          setNumber: 1,
          targetReps: '5',
          weightLbs: 225,
          repsAchieved: 5,
          isCompleted: true,
          notes: 'Hamstrings felt very tight, limited hip hinge depth'
        }
      ]
    };

    const routine = generateAdaptiveStretchingRoutine(workoutLogs, []);

    const elephantWalk = routine.stretches.find((s) => s.id === 'stretch_atg_elephant_walks');
    expect(elephantWalk).toBeDefined();
    expect(elephantWalk?.triggerSource).toBe('comment');
    expect(elephantWalk?.triggerReason).toContain('Hamstrings felt very tight');
  });

  it('boosts McGill spinal decompression when lower back compression comments are detected', () => {
    const workoutLogs: Record<string, SetLogRecord[]> = {
      t2_good_morning: [
        {
          setNumber: 1,
          targetReps: '8',
          weightLbs: 95,
          repsAchieved: 8,
          isCompleted: true,
          notes: 'Lower back feeling compressed and stiff'
        }
      ]
    };

    const routine = generateAdaptiveStretchingRoutine(workoutLogs, []);

    const mcgillStretch = routine.stretches.find((s) => s.id === 'stretch_mcgill_cat_camel');
    expect(mcgillStretch).toBeDefined();
    expect(mcgillStretch?.triggerSource).toBe('comment');
    expect(mcgillStretch?.triggerReason).toContain('Lower back feeling compressed');
  });

  it('boosts Wall Ankle Dorsiflexion when Knee-to-Wall test is below 4.0 inches benchmark', () => {
    const mobilityHistory: MobilityEntry[] = [
      {
        testId: 'knee-to-wall',
        value: 2.5,
        unit: 'inches',
        side: 'bilateral',
        date: '2026-10-10T10:00:00Z'
      }
    ];

    const routine = generateAdaptiveStretchingRoutine({}, mobilityHistory);

    expect(routine.detectedIssues.some((d) => d.category === 'ankle')).toBe(true);
    const ankleStretch = routine.stretches.find((s) => s.id === 'stretch_wall_ankle_mob');
    expect(ankleStretch).toBeDefined();
    expect(ankleStretch?.triggerSource).toBe('mobility_test');
    expect(ankleStretch?.triggerReason).toContain('2.5"');
    expect(ankleStretch?.triggerReason).toContain('below 4.0" benchmark');
  });

  it('boosts Couch Stretch when Split Squat Elevation test requires > 0 inches elevation', () => {
    const mobilityHistory: MobilityEntry[] = [
      {
        testId: 'split-squat-elevation',
        value: 6,
        unit: 'inches',
        side: 'bilateral',
        date: '2026-10-12T10:00:00Z'
      }
    ];

    const routine = generateAdaptiveStretchingRoutine({}, mobilityHistory);

    expect(routine.detectedIssues.some((d) => d.category === 'knee')).toBe(true);
    const couchStretch = routine.stretches.find((s) => s.id === 'stretch_couch_psoas');
    expect(couchStretch).toBeDefined();
    expect(couchStretch?.triggerReason).toContain('ATG Split Squat requires 6" front-foot elevation');
  });

  it('prioritizes multiple detected issues correctly and sorts by priority score', () => {
    const workoutLogs: Record<string, SetLogRecord[]> = {
      t1_bb_squat: [
        {
          setNumber: 1,
          targetReps: '3',
          weightLbs: 185,
          repsAchieved: 3,
          isCompleted: true,
          notes: 'Knee clicked and felt sore'
        }
      ],
      t2_pullups: [
        {
          setNumber: 1,
          targetReps: '5',
          weightLbs: 0,
          repsAchieved: 5,
          isCompleted: true,
          notes: 'Shoulder impingement pinching on eccentric'
        }
      ]
    };

    const mobilityHistory: MobilityEntry[] = [
      {
        testId: 'knee-to-wall',
        value: 2.0,
        unit: 'inches',
        date: '2026-10-14T08:00:00Z'
      }
    ];

    const routine = generateAdaptiveStretchingRoutine(workoutLogs, mobilityHistory);

    expect(routine.detectedIssues.length).toBeGreaterThanOrEqual(3);
    expect(routine.analyzedNotesCount).toBe(2);
    expect(routine.analyzedMobilityTestsCount).toBe(1);

    // Stretches are sorted descending by priorityScore
    for (let i = 0; i < routine.stretches.length - 1; i++) {
      expect(routine.stretches[i].priorityScore).toBeGreaterThanOrEqual(
        routine.stretches[i + 1].priorityScore
      );
    }
  });

  describe('Post-Bachata Dance Recovery Protocol', () => {
    it('provides all 7 evidence-based dance recovery stretches with precise biomechanical targeting', () => {
      expect(BACHATA_RECOVERY_ROUTINE).toHaveLength(7);

      const stretchIds = BACHATA_RECOVERY_ROUTINE.map((s) => s.id);
      expect(stretchIds).toContain('stretch_bachata_wall_calf_plantar');
      expect(stretchIds).toContain('stretch_bachata_couch_psoas_ql');
      expect(stretchIds).toContain('stretch_bachata_90_90_piriformis');
      expect(stretchIds).toContain('stretch_bachata_mcgill_cat_camel');
      expect(stretchIds).toContain('stretch_bachata_thoracic_open_book');
      expect(stretchIds).toContain('stretch_bachata_doorway_frame_reset');
      expect(stretchIds).toContain('stretch_bachata_venous_drainage_parasympathetic');

      // Verify each stretch has instructions, target muscles, and dance medicine rationale
      BACHATA_RECOVERY_ROUTINE.forEach((stretch) => {
        expect(stretch.instructions.length).toBeGreaterThanOrEqual(4);
        expect(stretch.targetMuscles.length).toBeGreaterThanOrEqual(2);
        expect(stretch.commonFaults.length).toBeGreaterThanOrEqual(1);
        expect(stretch.durationSeconds).toBeGreaterThanOrEqual(60);
        expect(stretch.tags).toContain('dance');
        expect(stretch.tags).toContain('bachata');
      });

      // Verify specific Soleus deceleration & Deep-6 Rotator targeting
      const calfStretch = BACHATA_RECOVERY_ROUTINE.find((s) => s.id === 'stretch_bachata_wall_calf_plantar');
      expect(calfStretch?.name).toContain('Soleus');
      expect(calfStretch?.targetMuscles.some((m) => m.includes('Soleus'))).toBe(true);
      expect(calfStretch?.instructions.some((i) => i.includes('Bent-Knee Soleus Isolation'))).toBe(true);

      const piriformisStretch = BACHATA_RECOVERY_ROUTINE.find((s) => s.id === 'stretch_bachata_90_90_piriformis');
      expect(piriformisStretch?.name).toContain('Deep-6');
      expect(piriformisStretch?.targetMuscles.some((m) => m.includes('Deep Six Rotators'))).toBe(true);
      expect(piriformisStretch?.instructions.some((i) => i.includes('Deep-6 Rotator Focus'))).toBe(true);
    });

    it('getBachataRecoveryRoutine returns complete diagnostic targets and total duration > 10 minutes', () => {
      const routine = getBachataRecoveryRoutine();

      expect(routine.stretches).toHaveLength(7);
      expect(routine.totalDurationSeconds).toBeGreaterThanOrEqual(600); // Over 10 minutes accounting for bilateral sets
      expect(routine.summaryText).toContain('Bachata');
      expect(routine.summaryText).toContain('Cuban motion');
      expect(routine.detectedIssues.length).toBeGreaterThanOrEqual(4);
      expect(routine.detectedIssues.some((i) => i.label.includes('Forefoot & Achilles Overload'))).toBe(true);
      expect(routine.detectedIssues.some((i) => i.label.includes('Cuban Motion'))).toBe(true);
      expect(routine.detectedIssues.some((i) => i.label.includes('Sensual Wave Facet Shear'))).toBe(true);
      expect(routine.detectedIssues.some((i) => i.label.includes('Dance Frame'))).toBe(true);
    });

    it('detects dance and bachata keywords in workout notes and flags dance issue', () => {
      const workoutLogs: Record<string, SetLogRecord[]> = {
        t1_bb_squat: [
          {
            setNumber: 1,
            targetReps: '3',
            weightLbs: 185,
            repsAchieved: 3,
            isCompleted: true,
            notes: 'Hips tight and fatigued after 3 hours of social bachata dancing last night'
          }
        ]
      };

      const routine = generateAdaptiveStretchingRoutine(workoutLogs, []);

      expect(routine.detectedIssues.some((i) => i.category === 'dance')).toBe(true);
      const danceIssue = routine.detectedIssues.find((i) => i.category === 'dance');
      expect(danceIssue?.label).toContain('Latin Social Dancing & Bachata');
      expect(danceIssue?.quote).toContain('social bachata dancing');
    });
  });
});
