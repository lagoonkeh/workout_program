// src/domain/athleteProfile.ts
/**
 * Editable athlete profile + dated bodyweight log.
 *
 * Replaces the hard-coded ATHLETE_PROFILE numbers wherever age or bodyweight matter.
 * Bodyweight is looked up by date, so a lift is always scored against what you weighed
 * when you did it, and the quarterly assessments' recorded bodyweights count as weigh-ins too.
 */
import { ATHLETE_PROFILE, calculateAthleteAge, type QuarterlyAssessmentRecord } from './fitnessAssessment';
import { touchAppData } from '../storage/appDataClock';

export interface WeighIn {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  lbs: number;
}

export interface AthleteProfile {
  dob: string;
  heightInches: number;
  weighIns: WeighIn[];
}

export const STORAGE_KEY_ATHLETE_PROFILE = 'workout_athlete_profile_v1';
export const ATHLETE_PROFILE_EVENT = 'athlete-profile-updated';

export const MIN_BODYWEIGHT_LBS = 70;
export const MAX_BODYWEIGHT_LBS = 500;

export const DEFAULT_PROFILE: AthleteProfile = {
  dob: ATHLETE_PROFILE.dob,
  heightInches: ATHLETE_PROFILE.heightInches,
  weighIns: [],
};

const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
const validLbs = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= MIN_BODYWEIGHT_LBS && n <= MAX_BODYWEIGHT_LBS;

export function sanitizeProfile(raw: unknown): AthleteProfile {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<AthleteProfile>;
  const weighIns = Array.isArray(r.weighIns)
    ? r.weighIns
        .filter((w): w is WeighIn => !!w && isDate((w as WeighIn).date) && validLbs((w as WeighIn).lbs))
        .map((w) => ({ id: typeof w.id === 'string' && w.id ? w.id : `wi_${w.date}_${w.lbs}`, date: w.date, lbs: Math.round(w.lbs * 10) / 10 }))
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    : [];
  return {
    dob: isDate(r.dob) ? r.dob : DEFAULT_PROFILE.dob,
    heightInches:
      typeof r.heightInches === 'number' && r.heightInches >= 48 && r.heightInches <= 96 ? r.heightInches : DEFAULT_PROFILE.heightInches,
    weighIns,
  };
}

export function loadProfile(): AthleteProfile {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return { ...DEFAULT_PROFILE };
    const raw = window.localStorage.getItem(STORAGE_KEY_ATHLETE_PROFILE);
    return raw ? sanitizeProfile(JSON.parse(raw)) : { ...DEFAULT_PROFILE, weighIns: [] };
  } catch {
    return { ...DEFAULT_PROFILE, weighIns: [] };
  }
}

export function saveProfile(profile: AthleteProfile): AthleteProfile {
  const clean = sanitizeProfile(profile);
  try {
    window.localStorage.setItem(STORAGE_KEY_ATHLETE_PROFILE, JSON.stringify(clean));
  } catch {
    // storage unavailable: keep in memory only
  }
  try {
    window.dispatchEvent(new Event(ATHLETE_PROFILE_EVENT));
  } catch {
    // non-browser
  }
  touchAppData();
  return clean;
}

export const todayISO = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Add or replace the weigh-in for a date (one entry per day). Returns null if invalid. */
export function addWeighIn(profile: AthleteProfile, lbs: number, date: string = todayISO()): AthleteProfile | null {
  if (!validLbs(lbs) || !isDate(date)) return null;
  const others = profile.weighIns.filter((w) => w.date !== date);
  return sanitizeProfile({ ...profile, weighIns: [...others, { id: `wi_${date}_${Date.now()}`, date, lbs }] });
}

export function removeWeighIn(profile: AthleteProfile, id: string): AthleteProfile {
  return sanitizeProfile({ ...profile, weighIns: profile.weighIns.filter((w) => w.id !== id) });
}

export interface BodyweightPoint {
  date: string;
  lbs: number;
  source: 'weigh-in' | 'assessment';
}

/** Weigh-ins plus each quarterly assessment's recorded bodyweight, oldest first; a weigh-in wins on the same day. */
export function bodyweightTimeline(profile: AthleteProfile, assessments: QuarterlyAssessmentRecord[] = []): BodyweightPoint[] {
  const byDate = new Map<string, BodyweightPoint>();
  assessments.forEach((a) => {
    const d = (a.date || '').slice(0, 10);
    if (isDate(d) && validLbs(a.bodyweightLbs)) byDate.set(d, { date: d, lbs: a.bodyweightLbs, source: 'assessment' });
  });
  profile.weighIns.forEach((w) => byDate.set(w.date, { date: w.date, lbs: w.lbs, source: 'weigh-in' }));
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * Bodyweight on a date: the latest entry on or before it, else the earliest entry after it,
 * else the default profile weight.
 */
export function bodyweightOn(timeline: BodyweightPoint[], date: string | Date): number {
  const d = typeof date === 'string' ? date.slice(0, 10) : todayISO(date);
  let best: BodyweightPoint | null = null;
  for (const p of timeline) {
    if (p.date <= d) best = p;
    else break;
  }
  return (best ?? timeline[0])?.lbs ?? ATHLETE_PROFILE.defaultWeightLbs;
}

export function currentBodyweight(timeline: BodyweightPoint[]): number {
  return timeline.length ? timeline[timeline.length - 1].lbs : ATHLETE_PROFILE.defaultWeightLbs;
}

export function profileAge(profile: AthleteProfile, now: Date = new Date()): number {
  return calculateAthleteAge(profile.dob, now);
}

export function formatHeight(inches: number): string {
  const ft = Math.floor(inches / 12);
  const inch = Math.round(inches - ft * 12);
  return `${ft}′${inch}″`;
}
