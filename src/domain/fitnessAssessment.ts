// src/domain/fitnessAssessment.ts
/**
 * Fitness Assessment & Quarterly Testing Battery
 * Calibrated specifically for:
 *   - DOB: 10/10/1991 (Age: 35)
 *   - Height: 5'6" (66 inches = 167.6 cm)
 *   - Bodyweight: 168 lbs (76.2 kg)
 * 
 * Standards synthesized from:
 *   - ACSM (American College of Sports Medicine) Exercise Testing Guidelines
 *   - Cooper Institute Aerobic & VO2max Standards
 *   - Concept2 2,000m Rowing Percentiles for Men 30–39
 *   - ExRx & Strength Level Strength Ratios for 168 lb Bodyweight
 *   - Dr. Stuart McGill Core Endurance & Balance Ratios
 *   - Dr. Peter Attia / Outlive Longevity Biomarkers (Dead Hang, Loaded Carries)
 *   - Ben Patrick (ATG) & Lucas Hardie (Range of Strength) Loaded Mobility
 */

import { liftPercentile, ordinal, tierFromScore, type LiftId, type Sex } from './strengthStandards';
import { touchAppData } from '../storage/appDataClock';

export const ATHLETE_PROFILE = {
  dob: '1991-10-10',
  heightInches: 66,
  heightCm: 167.6,
  defaultWeightLbs: 168,
  defaultWeightKg: 76.2,
  waistCircumferenceTargetInches: 33, // Waist-to-Height Ratio < 0.50
} as const;

export type AssessmentTier = 'Elite' | 'Advanced' | 'Intermediate' | 'Novice' | 'Beginner' | 'Developing';

export interface ScoreTierInfo {
  tier: AssessmentTier;
  badgeClass: string;
  dotClass: string;
  description: string;
  percentileRank: string;
}

/**
 * Calculates current athlete age from DOB string.
 */
export function calculateAthleteAge(dobStr: string = ATHLETE_PROFILE.dob, referenceDate: Date = new Date()): number {
  const birth = new Date(dobStr);
  let age = referenceDate.getFullYear() - birth.getFullYear();
  const m = referenceDate.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && referenceDate.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * 1. Cardiorespiratory: 2,000m Rowing Machine Standards (Men 30–39, 168 lbs)
 */
export function evaluateRow2k(seconds: number): ScoreTierInfo {
  if (seconds <= 390) { // <= 6:30
    return {
      tier: 'Elite',
      badgeClass: 'bg-emerald-950/70 border-emerald-500 text-emerald-300',
      dotClass: 'bg-emerald-400',
      description: 'Competitive Club / Sub-6:30 Pace',
      percentileRank: 'Top 5%',
    };
  }
  if (seconds <= 419) { // 6:31 - 6:59
    return {
      tier: 'Advanced',
      badgeClass: 'bg-blue-950/70 border-blue-500 text-blue-300',
      dotClass: 'bg-blue-400',
      description: 'Sub-7 Minute Milestone (Exceptional Aerobic Engine)',
      percentileRank: 'Top 15%',
    };
  }
  if (seconds <= 445) { // 7:00 - 7:25
    return {
      tier: 'Intermediate',
      badgeClass: 'bg-cyan-950/70 border-cyan-500 text-cyan-300',
      dotClass: 'bg-cyan-400',
      description: 'Strong Athletic Standard (Sub-1:51 Split)',
      percentileRank: 'Top 30%',
    };
  }
  if (seconds <= 480) { // 7:26 - 8:00
    return {
      tier: 'Novice',
      badgeClass: 'bg-amber-950/70 border-amber-500 text-amber-300',
      dotClass: 'bg-amber-400',
      description: 'Healthy Baseline (2:00 Split)',
      percentileRank: '50th Percentile',
    };
  }
  return {
    tier: 'Developing',
    badgeClass: 'bg-rose-950/70 border-rose-500 text-rose-300',
    dotClass: 'bg-rose-400',
    description: 'Pacing / Aerobic Base Work Advised',
    percentileRank: '< 50th Percentile',
  };
}

/**
 * Formats seconds into MM:SS.
 */
export function formatRowingTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Calculates 500m split time from 2k time in seconds.
 */
export function calculateRowingSplit(totalSeconds: number): string {
  const splitSec = totalSeconds / 4;
  const mins = Math.floor(splitSec / 60);
  const secs = Math.round(splitSec % 60);
  return `${mins}:${String(secs).padStart(2, '0')} / 500m`;
}

/**
 * 2. Cardiorespiratory: Cooper 12-Minute Run Test & VO2max Estimation
 */
export function estimateVO2MaxFromCooper(distanceMiles: number): number {
  const distanceMeters = distanceMiles * 1609.34;
  const vo2 = (distanceMeters - 504.9) / 44.73;
  return Math.round(vo2 * 10) / 10;
}

export function evaluateCooperRun(distanceMiles: number): ScoreTierInfo {
  const vo2 = estimateVO2MaxFromCooper(distanceMiles);
  if (distanceMiles >= 1.75) {
    return {
      tier: 'Elite',
      badgeClass: 'bg-emerald-950/70 border-emerald-500 text-emerald-300',
      dotClass: 'bg-emerald-400',
      description: `VO2max ~${vo2} mL/kg/min (ACSM Superior Tier)`,
      percentileRank: 'Top 5%',
    };
  }
  if (distanceMiles >= 1.65) {
    return {
      tier: 'Advanced',
      badgeClass: 'bg-blue-950/70 border-blue-500 text-blue-300',
      dotClass: 'bg-blue-400',
      description: `VO2max ~${vo2} mL/kg/min (ACSM Excellent Tier)`,
      percentileRank: 'Top 15%',
    };
  }
  if (distanceMiles >= 1.50) {
    return {
      tier: 'Intermediate',
      badgeClass: 'bg-cyan-950/70 border-cyan-500 text-cyan-300',
      dotClass: 'bg-cyan-400',
      description: `VO2max ~${vo2} mL/kg/min (Good / Above Average)`,
      percentileRank: 'Top 35%',
    };
  }
  if (distanceMiles >= 1.30) {
    return {
      tier: 'Novice',
      badgeClass: 'bg-amber-950/70 border-amber-500 text-amber-300',
      dotClass: 'bg-amber-400',
      description: `VO2max ~${vo2} mL/kg/min (Average Fitness)`,
      percentileRank: '50th Percentile',
    };
  }
  return {
    tier: 'Developing',
    badgeClass: 'bg-rose-950/70 border-rose-500 text-rose-300',
    dotClass: 'bg-rose-400',
    description: `VO2max ~${vo2} mL/kg/min (Developing Aerobic Base)`,
    percentileRank: '< 50th Percentile',
  };
}

/**
 * 3. Strength: percentile among lifters (Strength Level male bodyweight tables), the same scale
 * as the Strength Development Heatmap. Beginner 5th · Novice 20th · Intermediate 50th ·
 * Advanced 80th · Elite 95th percentile.
 */
const STRENGTH_BADGES: Record<'Elite' | 'Advanced' | 'Intermediate' | 'Novice' | 'Beginner', { badgeClass: string; dotClass: string }> = {
  Elite: { badgeClass: 'bg-emerald-950/70 border-emerald-500 text-emerald-300', dotClass: 'bg-emerald-400' },
  Advanced: { badgeClass: 'bg-blue-950/70 border-blue-500 text-blue-300', dotClass: 'bg-blue-400' },
  Intermediate: { badgeClass: 'bg-cyan-950/70 border-cyan-500 text-cyan-300', dotClass: 'bg-cyan-400' },
  Novice: { badgeClass: 'bg-amber-950/70 border-amber-500 text-amber-300', dotClass: 'bg-amber-400' },
  Beginner: { badgeClass: 'bg-rose-950/70 border-rose-500 text-rose-300', dotClass: 'bg-rose-400' },
};

export function evaluateLiftPercentile(
  lift: LiftId,
  value: number,
  bodyweightLbs: number = 168,
  sex: Sex = 'male'
): ScoreTierInfo & { percentile: number } {
  const ratio = lift === 'pullups' ? value : value / (bodyweightLbs || 168);
  const percentile = liftPercentile(lift, ratio, bodyweightLbs, sex);
  const tier = tierFromScore(percentile);
  const amount = lift === 'pullups' ? `${value} strict reps` : `${ratio.toFixed(2)}x BW`;
  return {
    tier,
    ...STRENGTH_BADGES[tier],
    description: `${amount} · ~${ordinal(percentile)} percentile among lifters`,
    percentileRank: `${ordinal(percentile)} percentile`,
    percentile,
  };
}

export function evaluateDeadlift(weightLbs: number, bodyweightLbs: number = 168, sex: Sex = 'male'): ScoreTierInfo {
  return evaluateLiftPercentile('deadlift', weightLbs, bodyweightLbs, sex);
}

export function evaluateSquat(weightLbs: number, bodyweightLbs: number = 168, sex: Sex = 'male'): ScoreTierInfo {
  return evaluateLiftPercentile('squat', weightLbs, bodyweightLbs, sex);
}

export function evaluateBenchPress(weightLbs: number, bodyweightLbs: number = 168, sex: Sex = 'male'): ScoreTierInfo {
  return evaluateLiftPercentile('bench', weightLbs, bodyweightLbs, sex);
}

export function evaluateOverheadPress(weightLbs: number, bodyweightLbs: number = 168, sex: Sex = 'male'): ScoreTierInfo {
  return evaluateLiftPercentile('ohp', weightLbs, bodyweightLbs, sex);
}

/**
 * 4. Calisthenics & Muscular Endurance
 */
export function evaluatePullups(reps: number, bodyweightLbs: number = 168, sex: Sex = 'male'): ScoreTierInfo {
  return evaluateLiftPercentile('pullups', reps, bodyweightLbs, sex);
}

export function evaluatePushups(reps: number): ScoreTierInfo {
  // ACSM Age 30-39 norms
  if (reps >= 42) {
    return { tier: 'Elite', badgeClass: 'bg-emerald-950/70 border-emerald-500 text-emerald-300', dotClass: 'bg-emerald-400', description: `${reps} Continuous Reps (ACSM Superior Tier)`, percentileRank: 'Top 5%' };
  }
  if (reps >= 34) {
    return { tier: 'Advanced', badgeClass: 'bg-blue-950/70 border-blue-500 text-blue-300', dotClass: 'bg-blue-400', description: `${reps} Continuous Reps (ACSM Excellent Tier)`, percentileRank: 'Top 20%' };
  }
  if (reps >= 25) {
    return { tier: 'Intermediate', badgeClass: 'bg-cyan-950/70 border-cyan-500 text-cyan-300', dotClass: 'bg-cyan-400', description: `${reps} Continuous Reps (ACSM Good Tier)`, percentileRank: 'Top 40%' };
  }
  if (reps >= 13) {
    return { tier: 'Novice', badgeClass: 'bg-amber-950/70 border-amber-500 text-amber-300', dotClass: 'bg-amber-400', description: `${reps} Continuous Reps (ACSM Average Tier)`, percentileRank: '50th Percentile' };
  }
  return { tier: 'Developing', badgeClass: 'bg-rose-950/70 border-rose-500 text-rose-300', dotClass: 'bg-rose-400', description: `${reps} Reps (Below Average)`, percentileRank: '< 50th Percentile' };
}

/**
 * 5. Dr. Stuart McGill Core Balance Ratio Calculations
 */
export interface McGillRatioResult {
  flexionToExtensionRatio: number;
  flexionToExtensionStatus: 'optimal' | 'imbalanced';
  sideBridgeToExtensionRatio: number;
  sideBridgeToExtensionStatus: 'optimal' | 'imbalanced';
  sideBridgeSymmetryRatio: number; // right / left
  sideBridgeSymmetryStatus: 'optimal' | 'asymmetrical';
  isSpineProtected: boolean;
  clinicalFeedback: string[];
}

export function calculateMcGillRatios(
  extSec: number,
  flexSec: number,
  rightBridgeSec: number,
  leftBridgeSec: number
): McGillRatioResult {
  const safeExt = Math.max(1, extSec);
  const safeLeft = Math.max(1, leftBridgeSec);

  const flexionToExtensionRatio = Math.round((flexSec / safeExt) * 100) / 100;
  const maxSideBridge = Math.max(rightBridgeSec, leftBridgeSec);
  const sideBridgeToExtensionRatio = Math.round((maxSideBridge / safeExt) * 100) / 100;
  const sideBridgeSymmetryRatio = Math.round((rightBridgeSec / safeLeft) * 100) / 100;

  const flexionToExtensionStatus = flexionToExtensionRatio < 1.0 ? 'optimal' : 'imbalanced';
  const sideBridgeToExtensionStatus = sideBridgeToExtensionRatio < 0.75 ? 'optimal' : 'imbalanced';
  const sideBridgeSymmetryStatus =
    sideBridgeSymmetryRatio >= 0.95 && sideBridgeSymmetryRatio <= 1.05 ? 'optimal' : 'asymmetrical';

  const isSpineProtected =
    flexionToExtensionStatus === 'optimal' &&
    sideBridgeToExtensionStatus === 'optimal' &&
    sideBridgeSymmetryStatus === 'optimal' &&
    extSec >= 160;

  const clinicalFeedback: string[] = [];
  if (extSec < 160) {
    clinicalFeedback.push(`Biering-Sørensen extension hold (${extSec}s) is below Dr. McGill's 160s disc protection standard.`);
  }
  if (flexionToExtensionStatus !== 'optimal') {
    clinicalFeedback.push(`Flexion-to-Extension ratio (${flexionToExtensionRatio}) exceeds 1.0. Back extensor endurance must exceed abdominal wall endurance to prevent flexion-induced disc herniation.`);
  }
  if (sideBridgeToExtensionStatus !== 'optimal') {
    clinicalFeedback.push(`Side-Bridge-to-Extension ratio (${sideBridgeToExtensionRatio}) exceeds 0.75. Lateral stabilizers should remain proportional to erectors.`);
  }
  if (sideBridgeSymmetryStatus !== 'optimal') {
    const diffPct = Math.round(Math.abs(1 - sideBridgeSymmetryRatio) * 100);
    clinicalFeedback.push(`Lateral asymmetry detected: ${diffPct}% difference between right (${rightBridgeSec}s) and left (${leftBridgeSec}s) side bridges. Risk factor for rotational spine shear.`);
  }

  return {
    flexionToExtensionRatio,
    flexionToExtensionStatus,
    sideBridgeToExtensionRatio,
    sideBridgeToExtensionStatus,
    sideBridgeSymmetryRatio,
    sideBridgeSymmetryStatus,
    isSpineProtected,
    clinicalFeedback,
  };
}

/**
 * 6. Functional Longevity & Grip
 */
export function evaluateDeadHang(seconds: number): ScoreTierInfo {
  if (seconds >= 120) {
    return { tier: 'Elite', badgeClass: 'bg-emerald-950/70 border-emerald-500 text-emerald-300', dotClass: 'bg-emerald-400', description: '2-Minute Peter Attia Longevity Gold Standard', percentileRank: 'Top 5%' };
  }
  if (seconds >= 90) {
    return { tier: 'Advanced', badgeClass: 'bg-blue-950/70 border-blue-500 text-blue-300', dotClass: 'bg-blue-400', description: 'Exceptional Shoulder Decompression & Grip', percentileRank: 'Top 15%' };
  }
  if (seconds >= 60) {
    return { tier: 'Intermediate', badgeClass: 'bg-cyan-950/70 border-cyan-500 text-cyan-300', dotClass: 'bg-cyan-400', description: 'Solid 60s Healthy Adult Baseline', percentileRank: 'Top 40%' };
  }
  if (seconds >= 30) {
    return { tier: 'Novice', badgeClass: 'bg-amber-950/70 border-amber-500 text-amber-300', dotClass: 'bg-amber-400', description: 'Developing Forearm & Rotator Cuff Endurance', percentileRank: '50th Percentile' };
  }
  return { tier: 'Developing', badgeClass: 'bg-rose-950/70 border-rose-500 text-rose-300', dotClass: 'bg-rose-400', description: 'Under 30s; Increase Subscapularis Hanging Volume', percentileRank: '< 50th Percentile' };
}

/**
 * Quarterly Assessment Data Structures
 */
export interface AssessmentScores {
  // Aerobic
  row2kSeconds?: number;
  cooperRunMiles?: number;
  restingHeartRateBpm?: number;
  hrr1minDropBpm?: number;
  // Strength 1RM
  deadlift1rmLbs?: number;
  squat1rmLbs?: number;
  bench1rmLbs?: number;
  ohp1rmLbs?: number;
  // Calisthenics
  strictPullupsReps?: number;
  pushupsReps?: number;
  // McGill Core Holds
  mcgillExtensionSec?: number;
  mcgillFlexionSec?: number;
  mcgillSideBridgeRightSec?: number;
  mcgillSideBridgeLeftSec?: number;
  // Longevity & Grip
  deadHangSec?: number;
  suitcaseCarrySec?: number;
  // Loaded Mobility
  kneeToWallInches?: number;
  jeffersonCurlDeficitInches?: number;
  atgSplitSquatWeightLbs?: number;
  pancakeSplitInches?: number;
}

export interface QuarterlyAssessmentRecord {
  id: string;
  date: string; // ISO format: '2026-10-21'
  quarterLabel: string; // e.g. "Q4 2026"
  age: number; // 35
  bodyweightLbs: number; // 168
  scores: AssessmentScores;
  notes?: string;
}

export const STORAGE_KEY_ASSESSMENTS = 'workout_quarterly_assessments_v1';

/** Fired on window after assessments are saved or deleted, so other widgets can refresh in the same tab. */
export const QUARTERLY_ASSESSMENTS_EVENT = 'quarterly-assessments-updated';

function notifyAssessmentsChanged(): void {
  try {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(QUARTERLY_ASSESSMENTS_EVENT));
  } catch {
    // Non-browser environment
  }
}

/**
 * Loads saved quarterly assessment records.
 */
export function loadQuarterlyAssessments(): QuarterlyAssessmentRecord[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(STORAGE_KEY_ASSESSMENTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to load quarterly assessments:', err);
    return [];
  }
}

/**
 * Saves or updates a quarterly assessment record.
 */
export function saveQuarterlyAssessment(
  record: QuarterlyAssessmentRecord,
  opts: { silent?: boolean } = {}
): QuarterlyAssessmentRecord[] {
  const current = loadQuarterlyAssessments();
  const existingIdx = current.findIndex((r) => r.id === record.id || r.quarterLabel === record.quarterLabel);
  let updated: QuarterlyAssessmentRecord[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = record;
  } else {
    updated = [record, ...current];
  }
  try {
    window.localStorage.setItem(STORAGE_KEY_ASSESSMENTS, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to persist assessment to localStorage:', err);
  }
  if (!opts.silent) touchAppData();
  notifyAssessmentsChanged();
  return updated;
}

/**
 * Deletes a quarterly assessment record.
 */
export function deleteQuarterlyAssessment(id: string): QuarterlyAssessmentRecord[] {
  const current = loadQuarterlyAssessments();
  const updated = current.filter((r) => r.id !== id);
  try {
    window.localStorage.setItem(STORAGE_KEY_ASSESSMENTS, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to persist updated assessments:', err);
  }
  touchAppData();
  notifyAssessmentsChanged();
  return updated;
}

/**
 * Default Baseline for Q4 2026
 */
export const DEFAULT_BASELINE_ASSESSMENT: QuarterlyAssessmentRecord = {
  id: 'assessment_q4_2026_baseline',
  date: '2026-10-21',
  quarterLabel: 'Q4 2026 (Baseline)',
  age: 35,
  bodyweightLbs: 168,
  scores: {
    row2kSeconds: 435, // 7:15 (Solid Intermediate)
    cooperRunMiles: 1.55, // 1.55 mi (~VO2max 44.3)
    restingHeartRateBpm: 60,
    hrr1minDropBpm: 26,
    deadlift1rmLbs: 315, // 1.88x BW
    squat1rmLbs: 255, // 1.52x BW
    bench1rmLbs: 195, // 1.16x BW
    ohp1rmLbs: 125, // 0.74x BW
    strictPullupsReps: 12,
    pushupsReps: 36,
    mcgillExtensionSec: 165,
    mcgillFlexionSec: 145,
    mcgillSideBridgeRightSec: 85,
    mcgillSideBridgeLeftSec: 82,
    deadHangSec: 75,
    suitcaseCarrySec: 60,
    kneeToWallInches: 5.0,
    jeffersonCurlDeficitInches: 2.0,
    atgSplitSquatWeightLbs: 40,
    pancakeSplitInches: 3.5,
  },
  notes: 'Quarterly fitness assessment battery initialized. Targeting Peter Attia 2-min hang and McGill core balance ratio integrity.',
};
