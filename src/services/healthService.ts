// src/services/healthService.ts
// Reads the Health Connect summaries that Tasker posts to /api/health (see api/health.js).
import { getIdToken } from './firebaseAuth';
import { saveCachedHealth, type HealthDay } from '../domain/healthMetrics';
import { saveCachedWorkouts, type HealthWorkout } from '../domain/healthWorkouts';

/** Fetches the last 30 days and caches them; null when signed out or offline (the cache stays). */
export async function refreshHealthMetrics(): Promise<HealthDay[] | null> {
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
