// src/domain/dailyReadiness.ts
import { WorkoutSession } from './programData';
import { WorkoutAdaptation } from './weeklyEvaluator';

export type ReadinessTier = 'peak' | 'standard' | 'cautious' | 'rest_recovery';

export interface DailyReadinessEntry {
  id: string; // e.g. 'readiness_2026-10-17'
  date: string; // 'YYYY-MM-DD'
  timestamp: number;
  kneePainScore: number; // 0 - 10
  hamstringTightness: number; // 0 - 10
  energyScore: number; // 1 - 10
  sleepScore: number; // 1 - 10
  sorenessTags: string[];
  journalNotes: string;
  readinessScore: number; // 0 - 100
  statusTier: ReadinessTier;
  biomechanicalFindings: string[];
  recommendedAdaptations: WorkoutAdaptation[];
  applied: boolean;
}

export const COMMON_SORENESS_TAGS = [
  'Knees Sore',
  'Tight Hamstrings',
  'Stiff Lower Back',
  'Shoulder Tightness',
  'Calf / Achilles Stiff',
  'Heavy Legs (DOMS)',
  'Feeling Fresh & Strong',
  'Great Hip Mobility',
] as const;

export function calculateReadinessIndex(
  kneePain: number,
  hamstringTightness: number,
  energy: number,
  sleep: number
): { score: number; tier: ReadinessTier } {
  let score = 100;

  // Knee pain deduction (high weight for tendinitis protection)
  score -= Math.min(50, kneePain * 6);

  // Hamstring stiffness deduction
  if (hamstringTightness > 2) {
    score -= (hamstringTightness - 2) * 3;
  }

  // Energy bonus/deduction (neutral at 6)
  score += (energy - 6) * 2.5;

  // Sleep bonus/deduction (neutral at 6)
  score += (sleep - 6) * 1.5;

  // If knee pain >= 3, cap max score at 75 to reflect tendon caution
  if (kneePain >= 3) {
    score = Math.min(score, 75);
  }

  // Clamp 10 to 100
  const finalScore = Math.max(10, Math.min(100, Math.round(score)));

  let tier: ReadinessTier = 'standard';
  if (finalScore >= 85 && kneePain <= 2) {
    tier = 'peak';
  } else if (finalScore >= 70 && kneePain <= 3) {
    tier = 'standard';
  } else if (finalScore >= 50 || kneePain <= 5) {
    tier = 'cautious';
  } else {
    tier = 'rest_recovery';
  }

  return { score: finalScore, tier };
}

/**
 * Analyzes the user's daily check-in input and notes to generate targeted workout adjustments.
 */
export function analyzeDailyReadiness(
  entry: {
    date: string;
    kneePainScore: number;
    hamstringTightness: number;
    energyScore: number;
    sleepScore: number;
    sorenessTags: string[];
    journalNotes: string;
  },
  activeSession: WorkoutSession
): DailyReadinessEntry {
  const { score: readinessScore, tier: statusTier } = calculateReadinessIndex(
    entry.kneePainScore,
    entry.hamstringTightness,
    entry.energyScore,
    entry.sleepScore
  );

  const findings: string[] = [];
  const adaptations: WorkoutAdaptation[] = [];
  const noteLower = (entry.journalNotes || '').toLowerCase();
  const hasTag = (tag: string) => entry.sorenessTags.includes(tag);

  // 1. Knee Tendinitis Analysis (Ben Patrick ATG / Yellow Dude)
  const isKneeSensitive =
    entry.kneePainScore >= 3 ||
    hasTag('Knees Sore') ||
    noteLower.includes('knee') ||
    noteLower.includes('patellar') ||
    noteLower.includes('patella');

  if (isKneeSensitive) {
    findings.push(
      `Patellar tendon discomfort flagged (${entry.kneePainScore}/10). Ballistic bottom rebounds must be eliminated to protect connective tissue collagen.`
    );

    // Check if active session has knee-dominant compound (e.g. Back Squat or Hack Squat)
    const squatEx = activeSession.exercises.find(
      (e) => e.id === 't1_bb_squat' || e.name.toLowerCase().includes('squat')
    );
    if (squatEx && squatEx.regression) {
      adaptations.push({
        id: `readiness_adapt_knee_${squatEx.id}_${Date.now()}`,
        exerciseId: squatEx.id,
        exerciseName: squatEx.name,
        action: 'activate_regression',
        parameter: 'regression',
        currentValue: squatEx.name,
        proposedValue: squatEx.regression.name,
        proposedLabel: `Swap to ${squatEx.regression.name}`,
        rationale: `Pain rating ${entry.kneePainScore}/10 triggers pain-free box regression to offload patellar tendon shear and enforce a 90° shin angle.`,
        creatorInfluence: 'Ben Patrick (ATG) & Yellow Dude',
        applied: false,
      });

      // Also adjust tempo to 4-second eccentric
      adaptations.push({
        id: `readiness_adapt_tempo_${squatEx.id}_${Date.now()}`,
        exerciseId: squatEx.id,
        exerciseName: squatEx.name,
        action: 'adjust_tempo',
        parameter: 'tempo',
        currentValue: squatEx.tempo,
        proposedValue: '3210',
        proposedLabel: '3210 (3s slow descent, 2s pause, 1s up)',
        rationale: 'Slow eccentric loading stimulates tenocyte mechanotransduction without compressive tendon spikes.',
        creatorInfluence: 'Yellow Dude & Dr. Aaron Horschig',
        applied: false,
      });
    }
  }

  // 2. Hamstring & Posterior Chain Tightness (Eugene Teo & Alyssa Lu)
  const isHamstringTight =
    entry.hamstringTightness >= 5 ||
    hasTag('Tight Hamstrings') ||
    noteLower.includes('hamstring') ||
    noteLower.includes('hamstrings') ||
    noteLower.includes('posterior chain');

  if (isHamstringTight) {
    findings.push(
      `Posterior chain tightness flagged (${entry.hamstringTightness}/10). Guarded hamstrings may cause lumbar flexion compensation during heavy hinges.`
    );

    const rdlEx = activeSession.exercises.find(
      (e) => e.id === 't1_bb_rdl' || e.name.toLowerCase().includes('deadlift') || e.name.toLowerCase().includes('rdl')
    );
    if (rdlEx) {
      adaptations.push({
        id: `readiness_adapt_hamstring_${rdlEx.id}_${Date.now()}`,
        exerciseId: rdlEx.id,
        exerciseName: rdlEx.name,
        action: 'adjust_tempo',
        parameter: 'tempo',
        currentValue: rdlEx.tempo,
        proposedValue: '3111',
        proposedLabel: '3111 (Controlled hinge, 1s pause above knee)',
        rationale: 'Limits end-range stretch reflex on guarded hamstrings while maintaining strict lat & spinal tension.',
        creatorInfluence: 'Eugene Teo & Dr. Alyssa Lu',
        applied: false,
      });
    }
  }

  // 3. CNS / Energy & Sleep Readiness (GZCL Autoregulation)
  const isLowEnergy = entry.energyScore <= 4 || entry.sleepScore <= 4 || noteLower.includes('tired') || noteLower.includes('exhausted') || noteLower.includes('fatigued');
  if (isLowEnergy) {
    findings.push(
      `Low systemic energy or sleep debt reported (Energy: ${entry.energyScore}/10, Sleep: ${entry.sleepScore}/10). Grinding near-maximal sets today increases injury risk.`
    );

    const t1Ex = activeSession.exercises.find((e) => e.tier === 'T1');
    if (t1Ex) {
      const currentLoad = t1Ex.defaultWeightLbs || t1Ex.defaultWeight || 100;
      const reducedLoad = Math.max(45, Math.round((currentLoad * 0.9) / 5) * 5); // 10% load reduction rounded to 5 lbs
      if (reducedLoad < currentLoad) {
        adaptations.push({
          id: `readiness_adapt_energy_${t1Ex.id}_${Date.now()}`,
          exerciseId: t1Ex.id,
          exerciseName: t1Ex.name,
          action: 'decrease_weight',
          parameter: 'weightLbs',
          currentValue: currentLoad,
          proposedValue: reducedLoad,
          proposedLabel: `${reducedLoad} lbs (-10% Autoregulation Load)`,
          rationale: 'Preserves neuromuscular bar speed and motor groove without accumulating deep central nervous system fatigue on low-energy days.',
          creatorInfluence: 'GZCL Method Autoregulation',
          applied: false,
        });
      }
    }
  }

  // 4. Shoulder Impingement / Upper Body Ache
  const isShoulderIssue =
    hasTag('Shoulder Tightness') ||
    noteLower.includes('shoulder') ||
    noteLower.includes('rotator cuff') ||
    noteLower.includes('impingement');

  if (isShoulderIssue) {
    findings.push(
      'Shoulder tightness or impingement sensitivity detected. Prioritize scapular retraction and rotator cuff prep.'
    );
    const pressEx = activeSession.exercises.find(
      (e) => e.name.toLowerCase().includes('overhead press') || e.name.toLowerCase().includes('bench press')
    );
    if (pressEx && pressEx.regression) {
      adaptations.push({
        id: `readiness_adapt_shoulder_${pressEx.id}_${Date.now()}`,
        exerciseId: pressEx.id,
        exerciseName: pressEx.name,
        action: 'activate_regression',
        parameter: 'regression',
        currentValue: pressEx.name,
        proposedValue: pressEx.regression.name,
        proposedLabel: `Swap to ${pressEx.regression.name}`,
        rationale: 'Reduces subacromial friction and allows natural scapulohumeral rotation under load.',
        creatorInfluence: 'Athlean-X & Indian Club Rotational Prep',
        applied: false,
      });
    }
  }

  // 5. Peak Form / Green Light Confirmation
  if (statusTier === 'peak' && findings.length === 0) {
    findings.push(
      'All physiological readiness indicators are green. Joints feel supple, energy is primed, and CNS is fully recovered. You are cleared for target working weights and AMRAP push!'
    );
  } else if (findings.length === 0) {
    findings.push(
      'Standard readiness profile confirmed. Follow normal prescribed sets, weights, and Marcus Filly tempos.'
    );
  }

  return {
    id: `readiness_${entry.date}_${Date.now()}`,
    date: entry.date,
    timestamp: Date.now(),
    kneePainScore: entry.kneePainScore,
    hamstringTightness: entry.hamstringTightness,
    energyScore: entry.energyScore,
    sleepScore: entry.sleepScore,
    sorenessTags: entry.sorenessTags,
    journalNotes: entry.journalNotes,
    readinessScore,
    statusTier,
    biomechanicalFindings: findings,
    recommendedAdaptations: adaptations,
    applied: false,
  };
}
