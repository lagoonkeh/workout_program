// src/domain/healthMetrics.ts
/**
 * Health Connect data (sleep, resting heart rate, HRV, weight, steps) posted by Tasker to /api/health,
 * turned into readiness check-in inputs. Resting HR 5+ bpm above the past week's average is a common
 * sign of incomplete recovery, so it is flagged.
 */
export interface HealthDay {
  date: string; // YYYY-MM-DD
  sleepHours?: number | null;
  restingHr?: number | null;
  hrvMs?: number | null;
  weightLbs?: number | null;
  steps?: number | null;
}

export const STORAGE_KEY_HEALTH = 'workout_health_metrics_v1';
export const ELEVATED_RHR_BPM = 5;

/** Hours of sleep -> the check-in's 1-10 sleep score. */
export function sleepScoreFromHours(h: number): number {
  const table: [number, number][] = [[8.5, 10], [8, 9], [7.5, 8], [7, 7], [6.5, 6], [6, 5], [5.5, 4], [5, 3], [4, 2]];
  for (const [hours, score] of table) if (h >= hours) return score;
  return 1;
}

export const healthForDate = (days: HealthDay[], date: string) => days.find((d) => d.date === date) || null;

/** Today's resting HR against the average of up to 7 earlier days. */
export function restingHrTrend(days: HealthDay[], date: string): { today: number; baseline: number; delta: number; elevated: boolean } | null {
  const today = healthForDate(days, date)?.restingHr;
  if (!today) return null;
  const prior = days
    .filter((d) => d.date < date && d.restingHr)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
    .map((d) => d.restingHr as number);
  if (prior.length < 3) return null;
  const baseline = Math.round((prior.reduce((a, b) => a + b, 0) / prior.length) * 10) / 10;
  const delta = Math.round((today - baseline) * 10) / 10;
  return { today, baseline, delta, elevated: delta >= ELEVATED_RHR_BPM };
}

export function loadCachedHealth(): HealthDay[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY_HEALTH) || 'null');
    return Array.isArray(raw?.days) ? raw.days : [];
  } catch {
    return [];
  }
}

export function saveCachedHealth(days: HealthDay[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_HEALTH, JSON.stringify({ days, fetchedAt: new Date().toISOString() }));
  } catch {
    // storage full or blocked: the check-in just won't pre-fill
  }
}
