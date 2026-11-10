// src/services/healthService.ts
// Reads the Health Connect summaries that Tasker posts to /api/health (see api/health.js), and asks
// /api/bjj to pick up "BJJ Trained" calendar events (Google Health calories + readiness) first.
import { getIdToken } from './firebaseAuth';
import { saveCachedHealth, type HealthDay } from '../domain/healthMetrics';
import { saveCachedWorkouts, type HealthWorkout } from '../domain/healthWorkouts';
import { bodyweightTimeline, currentBodyweight, loadProfile } from '../domain/athleteProfile';
import { loadQuarterlyAssessments } from '../domain/fitnessAssessment';

export interface BjjSession {
  eventId: string;
  date: string;
  start: string;
  end: string;
  minutes: number;
  kcal: number | null;
  status: string;
}

export interface BjjSyncState {
  at: string;
  ok: boolean;
  error?: string;
  weightLbs?: number | null;
  healthConnected?: boolean;
  written?: number;
  sessions: BjjSession[];
}

export const STORAGE_KEY_BJJ_SYNC = 'workout_bjj_sync_v1';
export const BJJ_SYNC_EVENT = 'workout-bjj-synced';
/** Calendar is scanned at most this often from the app (a nightly server run covers the rest). */
export const BJJ_SYNC_INTERVAL_MS = 30 * 60 * 1000;

export function loadBjjSync(): BjjSyncState | null {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY_BJJ_SYNC) || 'null');
    return raw && Array.isArray(raw.sessions) ? raw : null;
  } catch {
    return null;
  }
}

function saveBjjSync(state: BjjSyncState): void {
  try {
    localStorage.setItem(STORAGE_KEY_BJJ_SYNC, JSON.stringify(state));
  } catch {
    // storage full or blocked
  }
  try {
    window.dispatchEvent(new CustomEvent(BJJ_SYNC_EVENT));
  } catch {
    // non-browser
  }
}

function bodyweightLbs(): number | null {
  try {
    return currentBodyweight(bodyweightTimeline(loadProfile(), loadQuarterlyAssessments()));
  } catch {
    return null;
  }
}

/**
 * Scans the calendar for "BJJ Trained" sessions and writes new ones to Google Health.
 * Skipped when it ran less than BJJ_SYNC_INTERVAL_MS ago, unless forced.
 */
export async function syncBjjSessions(opts: { force?: boolean; now?: number } = {}): Promise<BjjSyncState | null> {
  const now = opts.now ?? Date.now();
  const last = loadBjjSync();
  if (!opts.force && last?.ok && now - Date.parse(last.at) < BJJ_SYNC_INTERVAL_MS) return last;
  try {
    const token = await getIdToken();
    if (!token) return last;
    const res = await fetch('/api/bjj', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ weightLbs: bodyweightLbs(), days: 30 }),
    });
    const data = await res.json().catch(() => ({}));
    const state: BjjSyncState = res.ok
      ? {
          at: new Date(now).toISOString(),
          ok: true,
          weightLbs: data.weightLbs ?? null,
          healthConnected: !!data.healthConnected,
          written: data.written ?? 0,
          sessions: Array.isArray(data.sessions) ? data.sessions : [],
        }
      : { at: new Date(now).toISOString(), ok: false, error: data.error || `HTTP ${res.status}`, sessions: last?.sessions || [] };
    saveBjjSync(state);
    return state;
  } catch {
    return last;
  }
}

/** Fetches the last 30 days and caches them; null when signed out or offline (the cache stays). */
export async function refreshHealthMetrics(): Promise<HealthDay[] | null> {
  await syncBjjSessions();
  try {
    const token = await getIdToken();
    if (!token) return null;
    const res = await fetch('/api/health', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = await res.json();
    const days: HealthDay[] = Array.isArray(data?.days) ? data.days : [];
    saveCachedHealth(days);
    if (Array.isArray(data?.workouts)) saveCachedWorkouts(data.workouts as HealthWorkout[]);
    return days;
  } catch {
    return null;
  }
}
