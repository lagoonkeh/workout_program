import { describe, it, expect, vi, afterEach } from 'vitest';
// @ts-expect-error plain JS serverless function
import handler, { normalizeHealthDay, mergeHealthDays, tokenMatches, localToday, daysFromLifeDashboard } from '../../api/health.js';
import { sleepScoreFromHours, restingHrTrend, healthForDate } from '../../src/domain/healthMetrics';
import { DEMO_VIDEOS, demoVideoFor, youtubeUrl } from '../../src/domain/demoVideos';
import { MOTIONS } from '../../src/domain/motionLibrary';

const now = new Date('2026-11-06T15:00:00Z');

describe('api/health payloads', () => {
  it('normalizes units, names and ranges', () => {
    expect(
      normalizeHealthDay({ date: '2026-11-06', sleep_minutes: 444, resting_heart_rate: '56', hrv: 48.4, weightKg: 82.2, steps: 9120 }, now)
    ).toEqual({ date: '2026-11-06', sleepHours: 7.4, restingHr: 56, hrvMs: 48, weightLbs: 181.2, steps: 9120 });
  });
  it('defaults the date to today in Pacific time and drops implausible values', () => {
    expect(localToday(new Date('2026-11-07T05:00:00Z'))).toBe('2026-11-06');
    expect(normalizeHealthDay({ sleepHours: 30, restingHr: 300, weightLbs: 180 }, now)).toEqual({
      date: '2026-11-06',
      sleepHours: null,
      restingHr: null,
      hrvMs: null,
      weightLbs: 180,
      steps: null,
    });
  });
  it('rejects payloads with nothing usable', () => {
    expect(normalizeHealthDay({ date: '2026-11-06', mood: 'great' }, now)).toBeNull();
    expect(normalizeHealthDay(null, now)).toBeNull();
  });
  it('merges by date: new values win, missing ones keep what was stored', () => {
    const merged = mergeHealthDays(
      [{ date: '2026-11-05', sleepHours: 7, restingHr: 55, hrvMs: null, weightLbs: 181, steps: null }],
      [
        { date: '2026-11-05', sleepHours: null, restingHr: 57, hrvMs: null, weightLbs: null, steps: 8000 },
        { date: '2026-11-04', sleepHours: 6.5, restingHr: null, hrvMs: null, weightLbs: null, steps: null },
      ],
      'T'
    );
    expect(merged.map((d: { date: string }) => d.date)).toEqual(['2026-11-04', '2026-11-05']);
    expect(merged[1]).toMatchObject({ sleepHours: 7, restingHr: 57, weightLbs: 181, steps: 8000, updated: 'T' });
  });
  it('reads Life Dashboard Companion webhook payloads', () => {
    const payload = {
      timestamp: '2026-11-06T15:10:00Z',
      app_version: '1.0',
      source: 'health_connect',
      sleep: [
        {
          session_end_time: '2026-11-06T14:30:00Z', // 6:30 am Pacific: credited to Nov 6
          duration_seconds: 28800,
          stages: [
            { stage: 'light', start_time: '2026-11-06T06:30:00Z', end_time: '2026-11-06T10:30:00Z', duration_seconds: 14400 },
            { stage: 'awake', start_time: '2026-11-06T10:30:00Z', end_time: '2026-11-06T11:00:00Z', duration_seconds: 1800 },
            { stage: 'deep', start_time: '2026-11-06T11:00:00Z', end_time: '2026-11-06T14:30:00Z', duration_seconds: 12600 },
          ],
        },
      ],
      resting_heart_rate: [
        { bpm: 60, time: '2026-11-06T08:00:00Z' },
        { bpm: 57, time: '2026-11-06T15:00:00Z' },
      ],
      heart_rate_variability: [{ heart_rate_variability_millis: 40, time: '2026-11-06T13:00:00Z' }, { heart_rate_variability_millis: 50, time: '2026-11-06T14:00:00Z' }],
      weight: [{ kilograms: 82.2, time: '2026-11-06T15:05:00Z' }],
      daily_totals: [{ date: '2026-11-05', steps: 10234, distance_meters: 7000 }],
      heart_rate: [{ bpm: 72, time: '2026-11-06T10:30:00Z' }],
    };
    const days = daysFromLifeDashboard(payload);
    expect(days).toEqual([
      { date: '2026-11-06', sleepHours: 7.5, restingHr: 57, hrvMs: 45, weightLbs: 181.2, steps: null },
      { date: '2026-11-05', sleepHours: null, restingHr: null, hrvMs: null, weightLbs: null, steps: 10234 },
    ]);
    // the same night from a watch and a phone counts once; a separate nap still adds
    const twoApps = {
      source: 'health_connect',
      sleep: [
        payload.sleep[0],
        { session_end_time: '2026-11-06T14:20:00Z', duration_seconds: 27000, stages: [{ stage: 'sleeping', start_time: '2026-11-06T06:50:00Z', end_time: '2026-11-06T14:20:00Z', duration_seconds: 27000 }] },
        { session_end_time: '2026-11-06T22:00:00Z', duration_seconds: 1800 },
      ],
    };
    expect(daysFromLifeDashboard(twoApps)[0]).toMatchObject({ date: '2026-11-06', sleepHours: 8.5 });
    expect(daysFromLifeDashboard({ source: 'screen_time', apps: [] })).toBeNull();
    expect(daysFromLifeDashboard({ source: 'health_connect', timestamp: 'x' })).toEqual([]);
  });

  it('checks the token in constant time', () => {
    expect(tokenMatches('abc', 'abc')).toBe(true);
    expect(tokenMatches('abd', 'abc')).toBe(false);
    expect(tokenMatches('', 'abc')).toBe(false);
    expect(tokenMatches('abc', undefined)).toBe(false);
  });
});

describe('api/health handler auth', () => {
  const res = () => {
    const r: any = {};
    r.status = vi.fn(() => r);
    r.json = vi.fn(() => r);
    r.end = vi.fn(() => r);
    return r;
  };
  afterEach(() => {
    delete process.env.HEALTH_INGEST_TOKEN;
  });
  it('refuses posts when no token is configured, or the token is wrong', async () => {
    const r1 = res();
    await handler({ method: 'POST', headers: {}, body: {} }, r1);
    expect(r1.status).toHaveBeenCalledWith(503);
    process.env.HEALTH_INGEST_TOKEN = 'secret-token';
    const r2 = res();
    await handler({ method: 'POST', headers: { 'x-health-token': 'nope' }, body: { sleepHours: 7 } }, r2);
    expect(r2.status).toHaveBeenCalledWith(401);
  });
  it('rejects a valid token with an empty payload before touching Google', async () => {
    process.env.HEALTH_INGEST_TOKEN = 'secret-token';
    const r = res();
    await handler({ method: 'POST', headers: { 'x-health-token': 'secret-token' }, body: { mood: 'ok' } }, r);
    expect(r.status).toHaveBeenCalledWith(400);
  });
  it('acknowledges Life Dashboard syncs that carry nothing it stores, without touching Google', async () => {
    process.env.HEALTH_INGEST_TOKEN = 'secret-token';
    const r = res();
    await handler({ method: 'POST', headers: { 'x-health-token': 'secret-token' }, body: { source: 'health_connect', timestamp: 'x' } }, r);
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith({ success: true, saved: [] });
    for (const body of [{ source: 'screen_time', apps: [] }, { source: 'test', ping: true }]) {
      const r2 = res();
      await handler({ method: 'POST', headers: { 'x-health-token': 'secret-token' }, body }, r2);
      expect(r2.status).toHaveBeenCalledWith(200);
    }
  });

  it('saves a Life Dashboard sync that carries only a workout to the Health Workouts tab', async () => {
    process.env.HEALTH_INGEST_TOKEN = 'secret-token';
    Object.assign(process.env, { GOOGLE_CLIENT_ID: 'c', GOOGLE_CLIENT_SECRET: 's', GOOGLE_REFRESH_TOKEN: 'r', GOOGLE_SPREADSHEET_ID: 'sheet' });
    const calls: { url: string; body?: string }[] = [];
    const fetchMock = vi.fn(async (url: string, init: any = {}) => {
      calls.push({ url, body: init.body === undefined ? undefined : String(init.body) });
      const json = (v: unknown) => ({ ok: true, json: async () => v, text: async () => '' });
      if (url.includes('oauth2')) return json({ access_token: 'at' });
      if (url.includes('fields=sheets')) return json({ sheets: [{ properties: { title: 'Health Metrics' } }] });
      if (url.includes('/values/')) return { ok: false, json: async () => ({}), text: async () => '' };
      return json({});
    });
    vi.stubGlobal('fetch', fetchMock);
    try {
      const r = res();
      const body = {
        source: 'health_connect',
        timezone: 'America/Los_Angeles',
        exercise: [{ type: '31', name: 'martial_arts', start_time: '2026-11-07T02:00:00Z', end_time: '2026-11-07T03:30:00Z', duration_seconds: 5400, uuid: 'bjj-1' }],
      };
      await handler({ method: 'POST', headers: { 'x-health-token': 'secret-token' }, body }, r);
      expect(r.status).toHaveBeenCalledWith(200);
      expect(r.json.mock.calls[0][0]).toMatchObject({ success: true, saved: [], workouts: ['2026-11-06 martial_arts 90 min'] });
      expect(calls.some((c) => c.body?.includes('"addSheet":{"properties":{"title":"Health Workouts"}}'))).toBe(true);
      const write = calls.find((c) => c.url.includes('values:batchUpdate'));
      expect(write?.body).toContain('Health Workouts');
      expect(write?.body).toContain('bjj-1');
      expect(calls.some((c) => c.body?.includes("'Health Metrics'"))).toBe(false);
    } finally {
      vi.unstubAllGlobals();
      for (const k of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_SPREADSHEET_ID']) delete process.env[k];
    }
  });

  it('only allows GET and POST', async () => {
    const r = res();
    await handler({ method: 'DELETE', headers: {} }, r);
    expect(r.status).toHaveBeenCalledWith(405);
  });
});

describe('readiness from Health Connect', () => {
  it('maps hours of sleep to the 1-10 score', () => {
    expect(sleepScoreFromHours(9)).toBe(10);
    expect(sleepScoreFromHours(8)).toBe(9);
    expect(sleepScoreFromHours(7.2)).toBe(7);
    expect(sleepScoreFromHours(6)).toBe(5);
    expect(sleepScoreFromHours(3)).toBe(1);
  });
  it('flags resting HR 5+ bpm over the past week', () => {
    const days = [
      { date: '2026-11-01', restingHr: 55 },
      { date: '2026-11-02', restingHr: 56 },
      { date: '2026-11-03', restingHr: 54 },
      { date: '2026-11-04', restingHr: 55 },
      { date: '2026-11-05', restingHr: 61 },
    ];
    expect(restingHrTrend(days, '2026-11-05')).toEqual({ today: 61, baseline: 55, delta: 6, elevated: true });
    expect(restingHrTrend(days.slice(0, 2), '2026-11-02')).toBeNull(); // not enough baseline
    expect(healthForDate(days, '2026-11-09')).toBeNull();
  });
});

describe('demo videos', () => {
  it('every link points at a real motion pattern and a YouTube id', () => {
    for (const [type, v] of Object.entries(DEMO_VIDEOS)) {
      expect(MOTIONS).toHaveProperty(type);
      expect(v!.youtubeId).toMatch(/^[\w-]{11}$/);
      expect(youtubeUrl(v!)).toBe(`https://www.youtube.com/watch?v=${v!.youtubeId}`);
    }
    expect(demoVideoFor('squat')!.channel).toBe('Squat University');
    expect(demoVideoFor('warmup_club')).toBeNull();
    expect(demoVideoFor(undefined)).toBeNull();
  });
});
