import { describe, it, expect, vi, afterEach } from 'vitest';
// @ts-expect-error plain JS serverless function
import handler from '../../api/bjj.js';
import {
  sessionsFromEvents, activeCalories, utcOffsetSeconds, healthExerciseBody, recordedElsewhere, needsHealthWrite, latestWeight, dataPointName,
  // @ts-expect-error plain JS helper
} from '../../api/_bjj.js';
import { effortFromMinutes, interpretWorkout } from '../../src/domain/healthWorkouts';
import { buildCnsContext, evaluateCns } from '../../src/domain/cnsReadiness';

const now = new Date('2026-11-10T17:00:00Z');
const ev = (id: string, summary: string, start: string, end: string, extra: object = {}) => ({
  id, summary, status: 'confirmed', start: { dateTime: start }, end: { dateTime: end }, ...extra,
});

describe('BJJ calendar events', () => {
  it('keeps finished "BJJ Trained" events with a plausible length and drops the rest', () => {
    const s = sessionsFromEvents(
      [
        ev('a', 'BJJ Trained', '2026-11-09T18:00:00-08:00', '2026-11-09T19:30:00-08:00'),
        ev('b', ' bjj trained ', '2026-11-08T10:00:00-08:00', '2026-11-08T11:00:00-08:00'),
        ev('broken', 'BJJ Trained', '5326-05-30T17:37:00-07:00', '8627-10-19T23:25:00-07:00'),
        ev('left', 'Trained Left', '2026-11-09T19:30:00-08:00', '2026-11-09T19:31:00-08:00'),
        ev('tap', 'BJJ Trained', '2026-11-07T18:00:00-08:00', '2026-11-07T18:01:00-08:00'),
        ev('future', 'BJJ Trained', '2026-11-10T18:00:00-08:00', '2026-11-10T19:30:00-08:00'),
        ev('gone', 'BJJ Trained', '2026-11-06T18:00:00-08:00', '2026-11-06T19:00:00-08:00', { status: 'cancelled' }),
        { id: 'allday', summary: 'BJJ Trained', start: { date: '2026-11-05' }, end: { date: '2026-11-06' } },
      ],
      now
    );
    expect(s.map((x: any) => [x.eventId, x.date, x.minutes])).toEqual([
      ['b', '2026-11-08', 60],
      ['a', '2026-11-09', 90],
    ]);
  });

  it('works out active calories at 7.5 MET from minutes and weight', () => {
    // (7.5 - 1) x 81.65 kg x 1.5 h
    expect(activeCalories(90, 180)).toBe(796);
    expect(activeCalories(60, 180)).toBe(531);
    expect(activeCalories(0, 180)).toBe(0);
    expect(activeCalories(60, null)).toBe(0);
  });

  it('builds a Google Health Martial Arts session with Pacific offsets', () => {
    expect(utcOffsetSeconds('2026-11-10T02:00:00.000Z')).toBe('-28800s');
    expect(utcOffsetSeconds('2026-07-10T02:00:00.000Z')).toBe('-25200s');
    const [s] = sessionsFromEvents([ev('a', 'BJJ Trained', '2026-11-09T18:00:00-08:00', '2026-11-09T19:30:00-08:00')], now);
    const body = healthExerciseBody(s, 796);
    expect(body.exercise).toMatchObject({
      exerciseType: 'MARTIAL_ARTS',
      displayName: 'BJJ',
      activeDuration: '5400s',
      metricsSummary: { caloriesKcal: 796 },
      interval: { startTime: '2026-11-10T02:00:00.000Z', endTime: '2026-11-10T03:30:00.000Z', startUtcOffset: '-28800s' },
    });
    expect(dataPointName({ done: true, response: { name: 'users/me/dataTypes/exercise/dataPoints/123' } })).toBe('users/me/dataTypes/exercise/dataPoints/123');
  });

  it('does not double-count a session the watch already recorded', () => {
    const s = { start: '2026-11-10T02:00:00.000Z', end: '2026-11-10T03:30:00.000Z' };
    expect(recordedElsewhere(s, [{ start: '2026-11-10T02:10:00.000Z', end: '2026-11-10T03:25:00.000Z', source: 'com.google.android.apps.fitness' }])).toBe(true);
    expect(recordedElsewhere(s, [{ start: '2026-11-10T02:00:00.000Z', end: '2026-11-10T03:30:00.000Z', source: 'calendar' }])).toBe(false);
    expect(recordedElsewhere(s, [{ start: '2026-11-10T03:15:00.000Z', end: '2026-11-10T04:00:00.000Z', source: 'watch' }])).toBe(false);
  });

  it('retries failed writes but never resends a synced one', () => {
    expect(needsHealthWrite({}, undefined)).toBe(true);
    expect(needsHealthWrite({}, { status: 'synced' })).toBe(false);
    expect(needsHealthWrite({}, { status: 'recorded by watch' })).toBe(false);
    expect(needsHealthWrite({}, { status: 'Google Health not connected' })).toBe(true);
    expect(latestWeight([{ date: '2026-11-01', weightLbs: 182 }, { date: '2026-11-05', weightLbs: 180.4 }, { date: '2026-11-06', weightLbs: null }])).toBe(180.4);
  });
});

describe('BJJ minutes in CNS readiness', () => {
  const bjj = (minutes: number, endIso: string) => ({
    uuid: 'gcal:a', date: '2026-11-09', start: new Date(Date.parse(endIso) - minutes * 60000).toISOString(), end: endIso,
    minutes, activity: 'martial_arts', title: 'BJJ', avgHr: null, maxHr: null, sets: [], source: 'calendar',
  });
  it('rates effort from session length', () => {
    expect(effortFromMinutes(20).band).toBe('moderate');
    expect(effortFromMinutes(60).band).toBe('hard');
    expect(effortFromMinutes(120).band).toBe('very hard');
    expect(interpretWorkout(bjj(90, '2026-11-10T03:30:00.000Z')).intensity).toBe('very hard');
  });
  it('a long session last night pulls readiness down more than a short one', () => {
    const inputs = { taps: null, reactionMs: null, drive: 3, focus: 3, stress: 3 };
    const score = (minutes: number) => {
      const ctx = buildCnsContext(now, [], [bjj(minutes, '2026-11-10T03:30:00.000Z')], []);
      return evaluateCns(inputs, [], [], '2026-11-10', ctx);
    };
    const long = score(105);
    const short = score(25);
    expect(long.metrics.find((m) => m.key === 'activity')?.flag).toBe('poor');
    expect(short.metrics.find((m) => m.key === 'activity')?.flag).not.toBe('poor');
    expect(long.score).toBeLessThan(short.score);
  });
});

describe('api/bjj handler', () => {
  const res = () => {
    const r: any = {};
    r.status = vi.fn(() => r);
    r.json = vi.fn(() => r);
    r.end = vi.fn(() => r);
    return r;
  };
  const ENV = ['CRON_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_SPREADSHEET_ID', 'GOOGLE_HEALTH_REFRESH_TOKEN', 'BJJ_WEIGHT_LBS'];
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    for (const k of ENV) delete process.env[k];
  });

  it('rejects a cron call without the secret', async () => {
    process.env.CRON_SECRET = 'cron';
    const r = res();
    await handler({ method: 'GET', headers: { authorization: 'Bearer wrong' } }, r);
    expect(r.status).toHaveBeenCalledWith(401);
    const r2 = res();
    await handler({ method: 'PUT', headers: {} }, r2);
    expect(r2.status).toHaveBeenCalledWith(405);
  });

  it('writes a new session to Google Health and the readiness tab, once', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    Object.assign(process.env, {
      CRON_SECRET: 'cron', GOOGLE_CLIENT_ID: 'c', GOOGLE_CLIENT_SECRET: 's', GOOGLE_REFRESH_TOKEN: 'r', GOOGLE_SPREADSHEET_ID: 'sheet',
      GOOGLE_HEALTH_REFRESH_TOKEN: 'hr', BJJ_WEIGHT_LBS: '180',
    });
    const sheets: Record<string, string[][]> = {};
    const healthPosts: any[] = [];
    const json = (v: unknown) => ({ ok: true, json: async () => v, text: async () => '' });
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: any = {}) => {
      if (url.includes('oauth2')) return json({ access_token: String(init.body).includes('refresh_token=hr') ? 'health-at' : 'at' });
      if (url.includes('calendar/v3')) {
        expect(url).toContain('calendars/primary/events');
        return json({ items: [
          { id: 'e1', summary: 'BJJ Trained', status: 'confirmed', start: { dateTime: '2026-11-09T18:00:00-08:00' }, end: { dateTime: '2026-11-09T19:30:00-08:00' } },
          { id: 'bad', summary: 'BJJ Trained', status: 'confirmed', start: { dateTime: '5326-05-30T17:37:00-07:00' }, end: { dateTime: '8627-10-19T23:25:00-07:00' } },
        ] });
      }
      if (url.includes('health.googleapis.com')) {
        expect(init.headers.Authorization).toBe('Bearer health-at');
        healthPosts.push(JSON.parse(init.body));
        return json({ done: true, response: { name: 'users/me/dataTypes/exercise/dataPoints/42' } });
      }
      if (url.includes('fields=sheets')) return json({ sheets: [] });
      if (url.includes('values:batchUpdate')) {
        for (const d of JSON.parse(init.body).data || []) sheets[/'(.+)'/.exec(d.range)![1]] = d.values;
        return json({});
      }
      const m = /values\/([^?]+)/.exec(url);
      if (m && !init.method) {
        const tab = /'(.+)'/.exec(decodeURIComponent(m[1]))![1];
        return sheets[tab] ? json({ values: sheets[tab].slice(1) }) : { ok: false, json: async () => ({}), text: async () => '' };
      }
      return json({});
    }));

    const r = res();
    await handler({ method: 'GET', headers: { authorization: 'Bearer cron' } }, r);
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json.mock.calls[0][0]).toMatchObject({ success: true, weightLbs: 180, written: 1, sessions: [{ eventId: 'e1', minutes: 90, kcal: 796, status: 'synced' }] });
    expect(healthPosts).toHaveLength(1);
    expect(healthPosts[0].exercise.metricsSummary.caloriesKcal).toBe(796);
    expect(sheets['BJJ Sessions'][1]).toEqual(expect.arrayContaining(['e1', 90, 796, 'users/me/dataTypes/exercise/dataPoints/42', 'synced']));
    expect(sheets['Health Workouts'][1]).toEqual(expect.arrayContaining(['gcal:e1', 'martial_arts', 'BJJ', 'calendar']));

    const r2 = res();
    await handler({ method: 'GET', headers: { authorization: 'Bearer cron' } }, r2);
    expect(r2.json.mock.calls[0][0]).toMatchObject({ written: 0, sessions: [{ eventId: 'e1', status: 'synced' }] });
    expect(healthPosts).toHaveLength(1);
    expect(sheets['Health Workouts'].length).toBe(2);
  });
});
