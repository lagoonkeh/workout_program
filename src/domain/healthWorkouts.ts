// src/domain/healthWorkouts.ts
/**
 * Workouts recorded outside this app (watch, BJJ, runs...) that reach /api/health from Health Connect,
 * interpreted as training load per muscle group so the heatmap's "Last Trained" and recovery see them.
 *
 * Interpretation:
 * - Sets recorded inside the session (a strength app that writes segments) map exercise -> muscles, 1 set each.
 * - Otherwise the activity type gives a muscle profile and a "sets per hour" rate, scaled by duration and by
 *   intensity from the session's average heart rate.
 * - A strength session that overlaps a workout logged in this app is the same workout and is skipped.
 */
export interface HealthWorkoutSet {
  type: string; // Health Connect ExerciseSegment type number
  reps?: number;
}

export interface HealthWorkout {
  uuid: string;
  date: string; // local YYYY-MM-DD
  start: string; // ISO
  end: string; // ISO
  minutes: number;
  activity: string; // Health Connect name, e.g. "martial_arts", "running"
  title?: string;
  avgHr?: number | null;
  maxHr?: number | null;
  sets?: HealthWorkoutSet[];
  source?: string;
}

interface ActivityProfile {
  label: string;
  /** muscle id -> involvement 0..1 */
  muscles: Record<string, number>;
  /** hard sets a typical hour is worth for a muscle with involvement 1 */
  setsPerHour: number;
  /** true for lifting sessions (deduplicated against workouts logged here) */
  strength?: boolean;
}

const ALL_MAJOR = ['chest', 'shoulders', 'biceps', 'triceps', 'lats', 'traps', 'core', 'lower_back', 'quads', 'hamstrings', 'glutes', 'calves'];
const spread = (w: number) => Object.fromEntries(ALL_MAJOR.map((m) => [m, w]));
const RUN = { quads: 0.8, hamstrings: 0.6, glutes: 0.6, calves: 1 };
const FIELD_SPORT = { quads: 0.7, hamstrings: 0.6, glutes: 0.6, calves: 0.8, core: 0.4 };
const RACKET = { shoulders: 0.6, core: 0.5, quads: 0.6, calves: 0.7, biceps: 0.4 };

export const ACTIVITY_PROFILES: Record<string, ActivityProfile> = {
  martial_arts: { label: 'Martial arts / BJJ', muscles: { core: 1, biceps: 1, lats: 0.8, traps: 0.7, glutes: 0.6, shoulders: 0.6, hamstrings: 0.5, quads: 0.4, lower_back: 0.5 }, setsPerHour: 9 },
  boxing: { label: 'Boxing', muscles: { shoulders: 0.9, core: 0.8, triceps: 0.5, calves: 0.5, quads: 0.4 }, setsPerHour: 8 },
  fencing: { label: 'Fencing', muscles: { quads: 0.8, glutes: 0.6, calves: 0.6, shoulders: 0.4 }, setsPerHour: 6 },
  running: { label: 'Running', muscles: RUN, setsPerHour: 6 },
  running_treadmill: { label: 'Treadmill run', muscles: RUN, setsPerHour: 6 },
  walking: { label: 'Walking', muscles: { calves: 0.5, quads: 0.3, glutes: 0.3 }, setsPerHour: 1.5 },
  hiking: { label: 'Hiking', muscles: { quads: 0.7, glutes: 0.7, calves: 0.7, hamstrings: 0.4 }, setsPerHour: 4 },
  biking: { label: 'Cycling', muscles: { quads: 1, glutes: 0.5, calves: 0.4, hamstrings: 0.3 }, setsPerHour: 6 },
  biking_stationary: { label: 'Stationary bike', muscles: { quads: 1, glutes: 0.5, calves: 0.4, hamstrings: 0.3 }, setsPerHour: 6 },
  rowing: { label: 'Rowing', muscles: { lats: 0.8, quads: 0.7, hamstrings: 0.5, lower_back: 0.4, biceps: 0.4, glutes: 0.5 }, setsPerHour: 7 },
  rowing_machine: { label: 'Rowing machine', muscles: { lats: 0.8, quads: 0.7, hamstrings: 0.5, lower_back: 0.4, biceps: 0.4, glutes: 0.5 }, setsPerHour: 7 },
  paddling: { label: 'Paddling', muscles: { lats: 0.8, shoulders: 0.7, core: 0.6, biceps: 0.4 }, setsPerHour: 6 },
  swimming_pool: { label: 'Swimming', muscles: { lats: 1, shoulders: 0.8, triceps: 0.4, core: 0.4, chest: 0.4 }, setsPerHour: 7 },
  swimming_open_water: { label: 'Open-water swim', muscles: { lats: 1, shoulders: 0.8, triceps: 0.4, core: 0.4, chest: 0.4 }, setsPerHour: 7 },
  elliptical: { label: 'Elliptical', muscles: { quads: 0.7, glutes: 0.6, calves: 0.4, hamstrings: 0.3 }, setsPerHour: 4 },
  stair_climbing: { label: 'Stairs', muscles: { quads: 0.9, glutes: 0.8, calves: 0.6 }, setsPerHour: 6 },
  stair_climbing_machine: { label: 'Stair machine', muscles: { quads: 0.9, glutes: 0.8, calves: 0.6 }, setsPerHour: 6 },
  rock_climbing: { label: 'Climbing', muscles: { lats: 1, biceps: 1, shoulders: 0.6, core: 0.6, traps: 0.4 }, setsPerHour: 9 },
  yoga: { label: 'Yoga', muscles: { core: 0.4, hamstrings: 0.3, shoulders: 0.3 }, setsPerHour: 2 },
  pilates: { label: 'Pilates', muscles: { core: 0.9, glutes: 0.4, lower_back: 0.3 }, setsPerHour: 5 },
  stretching: { label: 'Stretching', muscles: {}, setsPerHour: 0 },
  guided_breathing: { label: 'Breathing', muscles: {}, setsPerHour: 0 },
  calisthenics: { label: 'Calisthenics', muscles: { chest: 0.7, triceps: 0.6, lats: 0.7, biceps: 0.5, core: 0.7, shoulders: 0.6, quads: 0.5 }, setsPerHour: 10, strength: true },
  gymnastics: { label: 'Gymnastics', muscles: { core: 0.9, shoulders: 0.8, lats: 0.7, triceps: 0.5, chest: 0.5 }, setsPerHour: 9 },
  strength_training: { label: 'Strength training', muscles: spread(0.5), setsPerHour: 10, strength: true },
  weightlifting: { label: 'Weightlifting', muscles: spread(0.5), setsPerHour: 10, strength: true },
  boot_camp: { label: 'Boot camp', muscles: spread(0.5), setsPerHour: 8 },
  exercise_class: { label: 'Exercise class', muscles: spread(0.4), setsPerHour: 7 },
  high_intensity_interval_training: { label: 'HIIT', muscles: { quads: 0.7, glutes: 0.6, core: 0.6, shoulders: 0.5, chest: 0.4, calves: 0.5 }, setsPerHour: 9 },
  other_workout: { label: 'Workout', muscles: spread(0.4), setsPerHour: 6 },
  soccer: { label: 'Soccer', muscles: FIELD_SPORT, setsPerHour: 6 },
  basketball: { label: 'Basketball', muscles: FIELD_SPORT, setsPerHour: 6 },
  football_american: { label: 'Football', muscles: FIELD_SPORT, setsPerHour: 6 },
  rugby: { label: 'Rugby', muscles: { ...FIELD_SPORT, shoulders: 0.6, traps: 0.5 }, setsPerHour: 8 },
  volleyball: { label: 'Volleyball', muscles: { quads: 0.6, calves: 0.7, shoulders: 0.6, core: 0.4 }, setsPerHour: 5 },
  tennis: { label: 'Tennis', muscles: RACKET, setsPerHour: 5 },
  squash: { label: 'Squash', muscles: RACKET, setsPerHour: 6 },
  racquetball: { label: 'Racquetball', muscles: RACKET, setsPerHour: 6 },
  badminton: { label: 'Badminton', muscles: RACKET, setsPerHour: 5 },
  table_tennis: { label: 'Table tennis', muscles: { shoulders: 0.3, calves: 0.3 }, setsPerHour: 2 },
  skiing: { label: 'Skiing', muscles: { quads: 1, glutes: 0.7, core: 0.5, calves: 0.4 }, setsPerHour: 6 },
  snowboarding: { label: 'Snowboarding', muscles: { quads: 0.9, glutes: 0.7, core: 0.6, calves: 0.5 }, setsPerHour: 5 },
  skating: { label: 'Skating', muscles: { quads: 0.8, glutes: 0.8, calves: 0.5 }, setsPerHour: 5 },
  ice_skating: { label: 'Ice skating', muscles: { quads: 0.8, glutes: 0.8, calves: 0.5 }, setsPerHour: 5 },
  surfing: { label: 'Surfing', muscles: { lats: 0.8, shoulders: 0.7, core: 0.6, quads: 0.4 }, setsPerHour: 6 },
  dancing: { label: 'Dancing', muscles: { calves: 0.6, quads: 0.5, glutes: 0.5, core: 0.4 }, setsPerHour: 4 },
  golf: { label: 'Golf', muscles: { core: 0.3 }, setsPerHour: 1 },
};

/** Health Connect ExerciseSegment type -> muscles (sets recorded inside a session). */
export const SEGMENT_MUSCLES: Record<string, { label: string; muscles: string[] }> = {
  '1': { label: 'Arm curl', muscles: ['biceps'] },
  '2': { label: 'Back extension', muscles: ['lower_back', 'glutes'] },
  '3': { label: 'Ball slam', muscles: ['core', 'shoulders', 'lats'] },
  '4': { label: 'Barbell shoulder press', muscles: ['shoulders', 'triceps'] },
  '5': { label: 'Bench press', muscles: ['chest', 'triceps', 'shoulders'] },
  '6': { label: 'Bench sit-up', muscles: ['core'] },
  '9': { label: 'Burpee', muscles: ['chest', 'quads', 'core'] },
  '10': { label: 'Crunch', muscles: ['core'] },
  '11': { label: 'Deadlift', muscles: ['hamstrings', 'glutes', 'lower_back', 'traps'] },
  '12': { label: 'Triceps extension', muscles: ['triceps'] },
  '13': { label: 'Dumbbell curl', muscles: ['biceps'] },
  '14': { label: 'Dumbbell curl', muscles: ['biceps'] },
  '15': { label: 'Front raise', muscles: ['shoulders'] },
  '16': { label: 'Lateral raise', muscles: ['shoulders'] },
  '17': { label: 'Dumbbell row', muscles: ['lats', 'traps', 'biceps'] },
  '18': { label: 'Triceps extension', muscles: ['triceps'] },
  '19': { label: 'Triceps extension', muscles: ['triceps'] },
  '20': { label: 'Triceps extension', muscles: ['triceps'] },
  '22': { label: 'Forward twist', muscles: ['core'] },
  '23': { label: 'Front raise', muscles: ['shoulders'] },
  '25': { label: 'Hip thrust', muscles: ['glutes', 'hamstrings'] },
  '29': { label: 'Kettlebell swing', muscles: ['glutes', 'hamstrings', 'lower_back'] },
  '30': { label: 'Lateral raise', muscles: ['shoulders'] },
  '31': { label: 'Lat pulldown', muscles: ['lats', 'biceps'] },
  '32': { label: 'Leg curl', muscles: ['hamstrings'] },
  '33': { label: 'Leg extension', muscles: ['quads'] },
  '34': { label: 'Leg press', muscles: ['quads', 'glutes'] },
  '35': { label: 'Leg raise', muscles: ['core'] },
  '36': { label: 'Lunge', muscles: ['quads', 'glutes'] },
  '37': { label: 'Mountain climber', muscles: ['core', 'shoulders'] },
  '41': { label: 'Plank', muscles: ['core'] },
  '42': { label: 'Pull-up', muscles: ['lats', 'biceps', 'traps'] },
  '43': { label: 'Punch', muscles: ['shoulders', 'core'] },
  '48': { label: 'Shoulder press', muscles: ['shoulders', 'triceps'] },
  '49': { label: 'Triceps extension', muscles: ['triceps'] },
  '50': { label: 'Sit-up', muscles: ['core'] },
  '51': { label: 'Squat', muscles: ['quads', 'glutes', 'core'] },
  '63': { label: 'Upper twist', muscles: ['core'] },
};

export type Intensity = 'light' | 'moderate' | 'hard' | 'very hard' | 'unknown';

/** Average heart rate -> effort band (absolute bands; no max-HR test on file). */
export function intensityOf(avgHr?: number | null): { band: Intensity; factor: number } {
  if (!avgHr) return { band: 'unknown', factor: 1 };
  if (avgHr < 100) return { band: 'light', factor: 0.6 };
  if (avgHr < 130) return { band: 'moderate', factor: 1 };
  if (avgHr < 150) return { band: 'hard', factor: 1.25 };
  return { band: 'very hard', factor: 1.5 };
}

const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function activityLabel(w: Pick<HealthWorkout, 'activity' | 'title'>): string {
  const base = ACTIVITY_PROFILES[w.activity]?.label || titleCase(w.activity || 'workout');
  return w.title && w.title.toLowerCase() !== base.toLowerCase() ? `${w.title} (${base})` : base;
}

export interface WorkoutInterpretation {
  uuid: string;
  label: string;
  minutes: number;
  intensity: Intensity;
  /** muscle id -> set-equivalents */
  sets: Record<string, number>;
  /** muscles worked enough to count as "trained" for recovery */
  trained: string[];
  fromRecordedSets: boolean;
  endMs: number;
  summary: string;
}

/** Minimum share of a muscle's involvement (and session length) for it to count as trained. */
const TRAINED_INVOLVEMENT = 0.4;
const TRAINED_MIN_SETS = 2;

export function interpretWorkout(w: HealthWorkout): WorkoutInterpretation {
  const { band, factor } = intensityOf(w.avgHr);
  const sets: Record<string, number> = {};
  const recorded = (w.sets || []).filter((s) => SEGMENT_MUSCLES[s.type]);
  const label = activityLabel(w);
  let fromRecordedSets = false;
  let trained: string[] = [];

  if (recorded.length >= 2) {
    fromRecordedSets = true;
    for (const s of recorded) for (const m of SEGMENT_MUSCLES[s.type].muscles) sets[m] = (sets[m] || 0) + 1;
    trained = Object.keys(sets);
  } else {
    const p = ACTIVITY_PROFILES[w.activity] || ACTIVITY_PROFILES.other_workout;
    const hours = Math.max(0, w.minutes) / 60;
    for (const [m, inv] of Object.entries(p.muscles)) {
      const v = Math.round(hours * p.setsPerHour * inv * factor * 10) / 10;
      if (v > 0) sets[m] = v;
      if (inv >= TRAINED_INVOLVEMENT && v >= TRAINED_MIN_SETS) trained.push(m);
    }
  }
  trained = trained.sort((a, b) => (sets[b] || 0) - (sets[a] || 0));
  const effort = band === 'unknown' ? '' : ` · ${band}${w.avgHr ? ` (avg ${w.avgHr} bpm)` : ''}`;
  const summary = `${label} ${w.minutes} min${effort}`;
  return { uuid: w.uuid, label, minutes: w.minutes, intensity: band, sets, trained, fromRecordedSets, endMs: Date.parse(w.end), summary };
}

/**
 * Drops lifting sessions that are this app's own workouts recorded again by a watch: a strength-type
 * session that ends within 2 hours of a workout completed here.
 */
export function withoutAppDuplicates(workouts: HealthWorkout[], appCompletionTimesMs: number[]): HealthWorkout[] {
  const WINDOW = 2 * 60 * 60 * 1000;
  return workouts.filter((w) => {
    const p = ACTIVITY_PROFILES[w.activity];
    if (!p?.strength) return true;
    const end = Date.parse(w.end);
    const start = Date.parse(w.start);
    return !appCompletionTimesMs.some((t) => t >= start - WINDOW / 4 && Math.abs(t - end) <= WINDOW);
  });
}

// --- cache ---------------------------------------------------------------------------------------------
export const STORAGE_KEY_HEALTH_WORKOUTS = 'workout_health_workouts_v1';
export const HEALTH_UPDATED_EVENT = 'workout-health-updated';

export function loadCachedWorkouts(): HealthWorkout[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY_HEALTH_WORKOUTS) || 'null');
    return Array.isArray(raw?.workouts) ? raw.workouts : [];
  } catch {
    return [];
  }
}

export function saveCachedWorkouts(workouts: HealthWorkout[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_HEALTH_WORKOUTS, JSON.stringify({ workouts, fetchedAt: new Date().toISOString() }));
  } catch {
    // storage full or blocked
  }
  try {
    window.dispatchEvent(new CustomEvent(HEALTH_UPDATED_EVENT));
  } catch {
    // non-browser
  }
}
