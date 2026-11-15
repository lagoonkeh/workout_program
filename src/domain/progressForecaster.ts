// src/domain/progressForecaster.ts
import { WorkoutExercise, WorkoutSession, WORKOUT_PROGRAM } from './programData';
import { SetLogRecord } from '../components/ExerciseCard';
import { MobilityEntry, MOBILITY_PROTOCOLS, MobilityTestId } from './mobility';

export type TimeHorizon = '1m' | '3m' | '6m' | '1y';

export interface HorizonInfo {
  id: TimeHorizon;
  label: string;
  weeks: number;
  months: number;
  description: string;
}

export const TIME_HORIZONS: HorizonInfo[] = [
  { id: '1m', label: '1 Month', weeks: 4, months: 1, description: 'Short-term neuromuscular adaptation & initial tissue tolerance' },
  { id: '3m', label: '3 Months', weeks: 12, months: 3, description: 'Structural tendon collagen remodeling & hypertrophic foundation' },
  { id: '6m', label: '6 Months', weeks: 26, months: 6, description: 'Long-term strength consolidation & full ROM joint bulletproofing' },
  { id: '1y', label: '1 Year', weeks: 52, months: 12, description: 'Peak GZCL strength milestones & master-level mobility benchmarks' },
];

export interface ChartDataPoint {
  label: string;
  weeksOut: number;
  dateStr: string;
  value: number;
  isProjected: boolean;
  milestone?: string;
}

export interface LiftProjection {
  exerciseId: string;
  exerciseName: string;
  tier: string;
  equipment: string;
  currentWeightLbs: number;
  projectedWeightLbs: Record<TimeHorizon, number>;
  projectedGainLbs: Record<TimeHorizon, number>;
  trajectoryPoints: ChartDataPoint[];
  milestones: Array<{ horizon: TimeHorizon; label: string; targetValue: number }>;
  biomechanicalInsight: string;
  creatorPhilosophy: string;
}

export interface MobilityProjection {
  testId: MobilityTestId;
  name: string;
  creator: string;
  unit: string;
  benchmarkGoal: string;
  benchmarkNumeric: number;
  direction: 'higher_is_better' | 'lower_is_better';
  currentValue: number;
  projectedValues: Record<TimeHorizon, number>;
  projectedDelta: Record<TimeHorizon, number>;
  trajectoryPoints: ChartDataPoint[];
  milestones: Array<{ horizon: TimeHorizon; label: string; targetValue: number }>;
  clinicalGuidance: string;
}

export interface ProgramProjectionsReport {
  generatedAt: string;
  activeHorizon: TimeHorizon;
  lifts: LiftProjection[];
  mobility: MobilityProjection[];
  overallSummary: {
    totalProjectedStrengthGainLbs: number;
    mobilityBenchmarksMetCount: number;
    trainingPhaseDescription: string;
  };
}

/**
 * Calculates progressive strength trajectory using periodized GZCL models.
 * Progression curves naturally taper over time (e.g. weeks 1-12 vs 13-26 vs 27-52)
 * to mirror realistic human physiological adaptations without joint overloading.
 */
export function calculateStrengthTrajectory(
  currentWeight: number,
  _tier: string = 'T1',
  isLowerBody: boolean,
  hasTendinitisWarning: boolean = false
): Record<TimeHorizon, number> {
  // Weekly progression rate (lbs/week) adjusted for joint safety and tier
  const baseWeeklyRate = isLowerBody ? 5.0 : 2.5;
  const safeRate = hasTendinitisWarning ? baseWeeklyRate * 0.75 : baseWeeklyRate;

  // 1 Month (4 weeks): Linear neuromuscular gain
  const gain1m = Math.round(safeRate * 4);
  const w1m = currentWeight + gain1m;

  // 3 Months (12 weeks): Early structural hypertrophy (rate slightly tapers)
  const gain3m = Math.round(gain1m + (safeRate * 0.85) * 8);
  const w3m = currentWeight + gain3m;

  // 6 Months (26 weeks): Periodized wave progression
  const gain6m = Math.round(gain3m + (safeRate * 0.7) * 14);
  const w6m = currentWeight + gain6m;

  // 1 Year (52 weeks): Advanced GZCL consolidation
  const gain1y = Math.round(gain6m + (safeRate * 0.5) * 26);
  const w1y = currentWeight + gain1y;

  return {
    '1m': w1m,
    '3m': w3m,
    '6m': w6m,
    '1y': w1y,
  };
}

/**
 * Computes projected mobility metrics based on physiological tendon remodeling timelines
 * (Ben Patrick ATG protocols, Dr. Aaron Horschig ankle restoration).
 */
export function calculateMobilityTrajectory(
  testId: MobilityTestId,
  currentValue: number
): Record<TimeHorizon, number> {
  switch (testId) {
    case 'knee-to-wall': {
      // Ankle dorsiflexion benchmark = 5.0 inches
      const target = 5.0;
      const calc1m = Math.min(target, +(currentValue + 0.35).toFixed(1));
      const calc3m = Math.min(target, +(currentValue + 0.90).toFixed(1));
      const calc6m = Math.min(target, +(currentValue + 1.60).toFixed(1));
      const calc1y = Math.max(target, +(currentValue + 2.0).toFixed(1));
      return { '1m': calc1m, '3m': calc3m, '6m': calc6m, '1y': calc1y };
    }
    case 'elephant-walk': {
      // Level scale: 1 (knees) to 5 (palms flat)
      const target = 5.0;
      const calc1m = Math.min(target, Math.round(currentValue + 0.5));
      const calc3m = Math.min(target, Math.round(currentValue + 1.2));
      const calc6m = Math.min(target, Math.round(currentValue + 2.2));
      const calc1y = 5.0; // full palms flat in 1 year
      return { '1m': calc1m, '3m': calc3m, '6m': calc6m, '1y': calc1y };
    }
    case 'split-squat-elevation': {
      // Elevation in inches: lower is better down to 0" flat ground
      const calc1m = Math.max(0, +(currentValue - 1.5).toFixed(1));
      const calc3m = Math.max(0, +(currentValue - 3.5).toFixed(1));
      const calc6m = Math.max(0, +(currentValue - 6.0).toFixed(1));
      const calc1y = 0; // flat ground full depth
      return { '1m': calc1m, '3m': calc3m, '6m': calc6m, '1y': calc1y };
    }
    case 'biering-sorensen': {
      // Isometric back extensor seconds: benchmark = 120-180s
      const calc1m = Math.round(currentValue + 18);
      const calc3m = Math.round(currentValue + 45);
      const calc6m = Math.round(currentValue + 80);
      const calc1y = Math.max(180, Math.round(currentValue + 120));
      return { '1m': calc1m, '3m': calc3m, '6m': calc6m, '1y': calc1y };
    }
    case 'dead-hang': {
      // Grip & scapular hang seconds: benchmark = 60-120s
      const calc1m = Math.round(currentValue + 12);
      const calc3m = Math.round(currentValue + 30);
      const calc6m = Math.round(currentValue + 55);
      const calc1y = Math.max(120, Math.round(currentValue + 80));
      return { '1m': calc1m, '3m': calc3m, '6m': calc6m, '1y': calc1y };
    }
    case 'pancake-split': {
      // Chest to floor distance in inches: lower is better down to 0"
      const calc1m = Math.max(0, +(currentValue - 1.0).toFixed(1));
      const calc3m = Math.max(0, +(currentValue - 2.5).toFixed(1));
      const calc6m = Math.max(0, +(currentValue - 4.5).toFixed(1));
      const calc1y = 0; // flat on floor
      return { '1m': calc1m, '3m': calc3m, '6m': calc6m, '1y': calc1y };
    }
    case 'jefferson-curl': {
      // Deficit in inches past toes: higher is better towards 4.0"+
      const target = 4.0;
      const calc1m = +(currentValue + 0.5).toFixed(1);
      const calc3m = +(currentValue + 1.2).toFixed(1);
      const calc6m = +(currentValue + 2.2).toFixed(1);
      const calc1y = Math.max(target, +(currentValue + 3.5).toFixed(1));
      return { '1m': calc1m, '3m': calc3m, '6m': calc6m, '1y': calc1y };
    }
    // german-hang, head-to-toe, side-split, back-bridge: no published rate of improvement to project from,
    // so they fall through to a flat projection until logged history exists
    default:
      return {
        '1m': currentValue,
        '3m': currentValue,
        '6m': currentValue,
        '1y': currentValue,
      };
  }
}

/**
 * Builds data points for interactive SVG trajectory charts.
 */
function buildTrajectoryPoints(
  currentVal: number,
  projections: Record<TimeHorizon, number>,
  unitLabel: string
): ChartDataPoint[] {
  const now = new Date();
  const formatOffset = (weeks: number): string => {
    const d = new Date(now.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString([], { month: 'short', year: '2-digit' });
  };

  return [
    {
      label: 'Now',
      weeksOut: 0,
      dateStr: 'Current Baseline',
      value: currentVal,
      isProjected: false,
      milestone: `Baseline: ${currentVal} ${unitLabel}`,
    },
    {
      label: '1M',
      weeksOut: 4,
      dateStr: formatOffset(4),
      value: projections['1m'],
      isProjected: true,
      milestone: `1-Month: ${projections['1m']} ${unitLabel}`,
    },
    {
      label: '3M',
      weeksOut: 12,
      dateStr: formatOffset(12),
      value: projections['3m'],
      isProjected: true,
      milestone: `3-Month: ${projections['3m']} ${unitLabel}`,
    },
    {
      label: '6M',
      weeksOut: 26,
      dateStr: formatOffset(26),
      value: projections['6m'],
      isProjected: true,
      milestone: `6-Month: ${projections['6m']} ${unitLabel}`,
    },
    {
      label: '1Y',
      weeksOut: 52,
      dateStr: formatOffset(52),
      value: projections['1y'],
      isProjected: true,
      milestone: `1-Year Goal: ${projections['1y']} ${unitLabel}`,
    },
  ];
}

/**
 * Generates the full projection forecast model combining strength logs and mobility tests.
 */
export function generateProgramProjections(
  workoutLogs: Record<string, SetLogRecord[]>,
  sessions: WorkoutSession[] = Object.values(WORKOUT_PROGRAM),
  mobilityHistory: MobilityEntry[] = [],
  horizon: TimeHorizon = '3m',
  programAdaptations: Record<string, Partial<WorkoutExercise>> = {},
  completedWorkouts: Array<{ logs?: Record<string, any> }> = []
): ProgramProjectionsReport {
  // 1. Generate Lift Projections
  const keyLiftIds = [
    't1_bb_squat',
    't1_bb_bench_press',
    't1_bb_rdl',
    't1_bb_ohp',
    't2_atg_split_squat',
    't2_pullup_ladders',
  ];

  const allExercises = sessions.flatMap((s) => s.exercises);

  const lifts: LiftProjection[] = keyLiftIds.map((exId) => {
    const exercise = allExercises.find((e) => e.id === exId) || {
      id: exId,
      name: exId.replace(/_/g, ' ').toUpperCase(),
      tier: 'T1' as const,
      equipment: 'barbell' as const,
      defaultWeightLbs: 135,
      muscleGroups: [],
      tempo: '31X1',
      restSeconds: 180,
      targetSets: 3,
      targetReps: '3',
      isAmrapLastSet: true,
      biomechanicalRationale: '',
      progressionRule: '',
    };

    const adaptation = programAdaptations[exId];
    const baseWeight =
      adaptation?.defaultWeightLbs || exercise.defaultWeightLbs || exercise.defaultWeight || 135;

    // Check logs for highest completed weight (supporting aliases across active logs and past completed workout history)
    const activeExLogs = workoutLogs[exId] || 
      (exId === 't1_bb_bench_press' ? workoutLogs['t1_bench'] || workoutLogs['t1_bb_bench'] : undefined) ||
      (exId === 't2_pullup_ladders' ? workoutLogs['t2_pull_up_ladder'] || workoutLogs['t2_pullups'] : undefined) ||
      [];
    const historyExLogs = completedWorkouts.flatMap((w) => {
      const l = w.logs?.[exId] ||
        (exId === 't1_bb_bench_press' ? w.logs?.['t1_bench'] || w.logs?.['t1_bb_bench'] : undefined) ||
        (exId === 't2_pullup_ladders' ? w.logs?.['t2_pull_up_ladder'] || w.logs?.['t2_pullups'] : undefined) ||
        [];
      return l;
    });

    const allLogs = [...activeExLogs, ...historyExLogs];
    const completedWeights = allLogs
      .filter((l) => l && (l.isCompleted || (l as any).completed) && Number(l.weightLbs) > 0)
      .map((l) => Number(l.weightLbs));
    const currentWeight = completedWeights.length > 0
      ? Math.max(...completedWeights)
      : baseWeight;

    const isLower = exId.includes('squat') || exId.includes('rdl');
    const hasTendinitis = exId.includes('squat') || exId.includes('split');

    const projectedWeights = calculateStrengthTrajectory(
      currentWeight,
      exercise.tier,
      isLower,
      hasTendinitis
    );

    const projectedGainLbs = {
      '1m': projectedWeights['1m'] - currentWeight,
      '3m': projectedWeights['3m'] - currentWeight,
      '6m': projectedWeights['6m'] - currentWeight,
      '1y': projectedWeights['1y'] - currentWeight,
    };

    const trajectoryPoints = buildTrajectoryPoints(currentWeight, projectedWeights, 'lbs');

    const milestones = [
      { horizon: '1m' as const, label: 'Motor Pattern Mastery', targetValue: projectedWeights['1m'] },
      { horizon: '3m' as const, label: 'Hypertrophic Adaptation', targetValue: projectedWeights['3m'] },
      { horizon: '6m' as const, label: 'Strength Milestone', targetValue: projectedWeights['6m'] },
      { horizon: '1y' as const, label: 'Peak Capacity', targetValue: projectedWeights['1y'] },
    ];

    let biomechanicalInsight = '';
    let creatorPhilosophy = '';

    if (exId === 't1_bb_squat') {
      biomechanicalInsight = 'Strict 3-second descent removes elastic stretch reflex shock on the patellar tendon, fostering dense quad hypertrophy and joint stability.';
      creatorPhilosophy = 'Linear Progression & tripod foot stability';
    } else if (exId === 't1_bb_bench_press' || exId === 't1_bb_bench') {
      biomechanicalInsight = '45-degree elbow tuck with retracted, depressed scapulae protects the rotator cuff and anterior shoulder capsule.';
      creatorPhilosophy = 'Shoulder preservation & optimal line of pull';
    } else if (exId === 't1_bb_rdl') {
      biomechanicalInsight = 'Controlled eccentric hip hinge maintains neutral lumbar spine while actively lengthening hamstrings under load.';
      creatorPhilosophy = 'Spinal stiffness & posterior chain sequence';
    } else if (exId === 't1_bb_ohp') {
      biomechanicalInsight = 'Pressing in the scapular plane with full lockout builds bulletproof deltoid and serratus anterior function.';
      creatorPhilosophy = 'Powerbuilding & functional overhead stability';
    } else {
      biomechanicalInsight = 'Unilateral control eliminates left/right asymmetries and improves knee tendon load-bearing capacity.';
      creatorPhilosophy = 'Collagen remodeling & connective tissue resilience';
    }

    return {
      exerciseId: exId,
      exerciseName: exercise.name,
      tier: exercise.tier,
      equipment: exercise.equipment,
      currentWeightLbs: currentWeight,
      projectedWeightLbs: projectedWeights,
      projectedGainLbs,
      trajectoryPoints,
      milestones,
      biomechanicalInsight,
      creatorPhilosophy,
    };
  });

  // 2. Generate Mobility Projections
  const mobility: MobilityProjection[] = MOBILITY_PROTOCOLS.map((protocol) => {
    const testLogs = mobilityHistory.filter((m) => m.testId === protocol.id);
    const latestVal = testLogs.length > 0 ? testLogs[0].value : protocol.benchmarkNumeric * 0.65;

    const projectedValues = calculateMobilityTrajectory(protocol.id, latestVal);
    const projectedDelta = {
      '1m': +(projectedValues['1m'] - latestVal).toFixed(1),
      '3m': +(projectedValues['3m'] - latestVal).toFixed(1),
      '6m': +(projectedValues['6m'] - latestVal).toFixed(1),
      '1y': +(projectedValues['1y'] - latestVal).toFixed(1),
    };

    const trajectoryPoints = buildTrajectoryPoints(latestVal, projectedValues, protocol.unit);

    const milestones = [
      { horizon: '1m' as const, label: 'Tissue Tolerance', targetValue: projectedValues['1m'] },
      { horizon: '3m' as const, label: 'Functional Threshold', targetValue: projectedValues['3m'] },
      { horizon: '6m' as const, label: 'Advanced Mobility', targetValue: projectedValues['6m'] },
      { horizon: '1y' as const, label: 'Gold Standard Benchmark', targetValue: projectedValues['1y'] },
    ];

    return {
      testId: protocol.id,
      name: protocol.name,
      creator: 'Biomechanics Standard',
      unit: protocol.unit,
      benchmarkGoal: protocol.targetBenchmark,
      benchmarkNumeric: protocol.benchmarkNumeric,
      direction: protocol.direction,
      currentValue: latestVal,
      projectedValues,
      projectedDelta,
      trajectoryPoints,
      milestones,
      clinicalGuidance: `Targeting ${protocol.targetBenchmark} via daily micro-dosing and pre-workout priming.`,
    };
  });

  const totalProjectedStrengthGain = lifts.reduce(
    (acc, l) => acc + l.projectedGainLbs[horizon],
    0
  );

  return {
    generatedAt: new Date().toISOString(),
    activeHorizon: horizon,
    lifts,
    mobility,
    overallSummary: {
      totalProjectedStrengthGainLbs: totalProjectedStrengthGain,
      mobilityBenchmarksMetCount: mobility.filter((m) =>
        m.direction === 'higher_is_better'
          ? m.projectedValues[horizon] >= m.benchmarkNumeric
          : m.projectedValues[horizon] <= m.benchmarkNumeric
      ).length,
      trainingPhaseDescription:
        horizon === '1m'
          ? 'Phase 1: Neuromuscular Calibration & Tendon Acclimation'
          : horizon === '3m'
          ? 'Phase 2: Structural Collagen Remodeling & Hypertrophic Wave'
          : horizon === '6m'
          ? 'Phase 3: Substantial GZCL Strength Realization'
          : 'Phase 4: Elite Home Gym Longevity & Master-Level Capacity',
    },
  };
}
