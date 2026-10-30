// tests/domain/athleteProfile.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ATHLETE_PROFILE_EVENT,
  DEFAULT_PROFILE,
  STORAGE_KEY_ATHLETE_PROFILE,
  addWeighIn,
  bodyweightOn,
  bodyweightTimeline,
  currentBodyweight,
  formatHeight,
  loadProfile,
  profileAge,
  removeWeighIn,
  sanitizeProfile,
  saveProfile,
} from '../../src/domain/athleteProfile';
import { DEFAULT_BASELINE_ASSESSMENT } from '../../src/domain/fitnessAssessment';

describe('domain/athleteProfile', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to the original profile (DOB 1991-10-10, 66 in) with no weigh-ins', () => {
    const p = loadProfile();
    expect(p).toEqual({ ...DEFAULT_PROFILE, weighIns: [] });
    expect(profileAge(p, new Date('2026-10-30'))).toBe(35);
    expect(formatHeight(66)).toBe('5′6″');
  });

  it('saves, reloads and announces changes', () => {
    let fired = 0;
    const on = () => fired++;
    window.addEventListener(ATHLETE_PROFILE_EVENT, on);
    const next = addWeighIn(loadProfile(), 171.4, '2026-10-30')!;
    saveProfile(next);
    window.removeEventListener(ATHLETE_PROFILE_EVENT, on);
    expect(fired).toBe(1);
    expect(loadProfile().weighIns).toHaveLength(1);
    expect(loadProfile().weighIns[0]).toMatchObject({ date: '2026-10-30', lbs: 171.4 });
  });

  it('keeps one weigh-in per day and rejects nonsense', () => {
    let p = addWeighIn(DEFAULT_PROFILE, 170, '2026-10-30')!;
    p = addWeighIn(p, 172, '2026-10-30')!;
    expect(p.weighIns).toHaveLength(1);
    expect(p.weighIns[0].lbs).toBe(172);
    expect(addWeighIn(p, 20, '2026-10-30')).toBeNull();
    expect(addWeighIn(p, 170, 'yesterday')).toBeNull();
    expect(removeWeighIn(p, p.weighIns[0].id).weighIns).toHaveLength(0);
  });

  it('sanitizes corrupt storage', () => {
    localStorage.setItem(STORAGE_KEY_ATHLETE_PROFILE, '{"dob":"x","heightInches":3,"weighIns":[{"date":"2026-01-01","lbs":"heavy"}]}');
    expect(loadProfile()).toEqual({ ...DEFAULT_PROFILE, weighIns: [] });
    localStorage.setItem(STORAGE_KEY_ATHLETE_PROFILE, 'not json');
    expect(loadProfile().dob).toBe(DEFAULT_PROFILE.dob);
    expect(sanitizeProfile(null).heightInches).toBe(66);
  });

  it('merges weigh-ins with assessment bodyweights and looks bodyweight up by date', () => {
    let p = addWeighIn(DEFAULT_PROFILE, 172, '2026-12-01')!;
    p = addWeighIn(p, 175, '2027-02-01')!;
    const tl = bodyweightTimeline(p, [DEFAULT_BASELINE_ASSESSMENT]); // 168 lb on 2026-10-21
    expect(tl.map((x) => [x.date, x.lbs, x.source])).toEqual([
      ['2026-10-21', 168, 'assessment'],
      ['2026-12-01', 172, 'weigh-in'],
      ['2027-02-01', 175, 'weigh-in'],
    ]);
    expect(bodyweightOn(tl, '2026-10-01')).toBe(168); // before any entry → earliest
    expect(bodyweightOn(tl, '2026-11-15')).toBe(168);
    expect(bodyweightOn(tl, '2026-12-01')).toBe(172);
    expect(bodyweightOn(tl, '2027-06-01')).toBe(175);
    expect(currentBodyweight(tl)).toBe(175);
    expect(currentBodyweight([])).toBe(168);
  });

  it('a weigh-in on an assessment day overrides the assessment value', () => {
    const p = addWeighIn(DEFAULT_PROFILE, 170, '2026-10-21')!;
    const tl = bodyweightTimeline(p, [DEFAULT_BASELINE_ASSESSMENT]);
    expect(tl).toHaveLength(1);
    expect(tl[0]).toMatchObject({ lbs: 170, source: 'weigh-in' });
  });
});
