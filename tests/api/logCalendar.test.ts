import { describe, it, expect, vi, afterEach } from 'vitest';
// @ts-expect-error plain JS serverless function
import handler from '../../api/sync.js';

const ENV = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_HEALTH_REFRESH_TOKEN'];
const res = () => {
  const r: any = {};
  r.status = vi.fn(() => r);
  r.json = vi.fn(() => r);
  r.end = vi.fn(() => r);
  return r;
};
const json = (v: unknown, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => v, text: async () => JSON.stringify(v) });

function stubGoogle(calls: { url: string; init: any }[]) {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: any = {}) => {
    calls.push({ url, init });
    if (url.includes('identitytoolkit')) return json({ users: [{ email: 'lagoonkeh@gmail.com', emailVerified: true }] });
    if (url.includes('oauth2')) {
      const b = String(init.body);
      // the main sign-in has no calendar scope; the second one is narrowed to calendar.events
      return json({ access_token: b.includes('refresh_token=health') ? (b.includes('calendar.events') ? 'cal-at' : 'other-at') : 'main-at' });
    }
    if (url.includes('calendar/v3')) return json({ id: 'evt1', htmlLink: 'https://calendar/evt1' });
    return json({});
  }));
}

describe('api/sync log-calendar', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    for (const k of ENV) delete process.env[k];
  });
  const req = { method: 'POST', url: '/api/sync?action=log-calendar', headers: { authorization: 'Bearer id-token' }, body: { event: { summary: 'Workout: Lower A' } } };

  it('adds the event with the calendar-scoped token from the second sign-in', async () => {
    Object.assign(process.env, { GOOGLE_CLIENT_ID: 'c', GOOGLE_CLIENT_SECRET: 's', GOOGLE_REFRESH_TOKEN: 'main', GOOGLE_HEALTH_REFRESH_TOKEN: 'health' });
    const calls: { url: string; init: any }[] = [];
    stubGoogle(calls);
    const r = res();
    await handler(req, r);
    expect(r.json.mock.calls[0][0]).toMatchObject({ success: true, eventId: 'evt1' });
    const post = calls.find((c) => c.url.includes('calendar/v3'))!;
    expect(post.init.headers.Authorization).toBe('Bearer cal-at');
  });

  it('reports a missing calendar sign-in instead of failing silently', async () => {
    Object.assign(process.env, { GOOGLE_CLIENT_ID: 'c', GOOGLE_CLIENT_SECRET: 's', GOOGLE_REFRESH_TOKEN: 'main' });
    const calls: { url: string; init: any }[] = [];
    stubGoogle(calls);
    const r = res();
    await handler(req, r);
    expect(r.json.mock.calls[0][0]).toMatchObject({ success: false });
    expect(calls.some((c) => c.url.includes('calendar/v3'))).toBe(false);
  });
});
