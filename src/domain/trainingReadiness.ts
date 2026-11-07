// src/domain/trainingReadiness.ts
/**
 * Whether today is a day to add weight. Load increases are held (never reversed) when recovery signals are
 * poor; the reason is shown on the suggestion. Signals, any one of which holds increases:
 * - under 6 h of sleep last night (Health Connect)
 * - resting heart rate 5+ bpm over the past week's average
 * - a hard outside workout (BJJ, a hard run...) that ended in the last 24 h
 * - today's readiness check-in landed in the Cautious or Rest & Recovery tier
 */
import { healthForDate, restingHrTrend, type HealthDay } from './healthMetrics';
import { interpretWorkout, type HealthWorkout } from './healthWorkouts';

export const SHORT_SLEEP_HOURS = 6;

export interface ReadinessCheckIn {
  date: string;
  statusTier?: string;
}

export interface IncreaseGate {
  hold: boolean;
  reasons: string[];
}

const TIER_LABEL: Record<string, string> = { cautious: 'Cautious', rest_recovery: 'Rest & Recovery' };

export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function increaseGate(
  now: Date,
  healthDays: HealthDay[],
  outsideWorkouts: HealthWorkout[],
  checkIns: ReadinessCheckIn[]
): IncreaseGate {
  const today = localDateKey(now);
  const reasons: string[] = [];

  const sleep = healthForDate(healthDays, today)?.sleepHours;
  if (typeof sleep === 'number' && sleep > 0 && sleep < SHORT_SLEEP_HOURS) reasons.push(`${sleep.toFixed(1)} h of sleep last night`);

  const rhr = restingHrTrend(healthDays, today);
  if (rhr?.elevated) reasons.push(`resting HR +${rhr.delta} bpm over your weekly average`);

  const dayAgo = now.getTime() - 24 * 60 * 60 * 1000;
  const hard = outsideWorkouts
    .map(interpretWorkout)
    .filter((it) => it.endMs >= dayAgo && it.endMs <= now.getTime() && it.trained.length > 0 && (it.intensity === 'hard' || it.intensity === 'very hard' || it.minutes >= 60))
    .sort((a, b) => b.endMs - a.endMs)[0];
  if (hard) reasons.push(`a hard ${hard.label.toLowerCase()} session in the last 24 h`);

  const checkIn = checkIns.find((c) => c.date === today);
  if (checkIn?.statusTier && TIER_LABEL[checkIn.statusTier]) reasons.push(`today's check-in is ${TIER_LABEL[checkIn.statusTier]}`);

  return { hold: reasons.length > 0, reasons };
}

export function gateReason(gate: IncreaseGate): string | null {
  if (!gate.hold) return null;
  const list = gate.reasons.length > 1 ? `${gate.reasons.slice(0, -1).join(', ')} and ${gate.reasons[gate.reasons.length - 1]}` : gate.reasons[0];
  return `Held instead of adding weight: ${list}`;
}
