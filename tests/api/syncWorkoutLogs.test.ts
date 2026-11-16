import { describe, it, expect, vi, afterEach } from 'vitest';
// @ts-expect-error plain JS serverless function
import handler from '../../api/sync.js';

describe('api/sync workout logs error handling', () => {
  const res = () => {
    const r: any = {};
    r.status = vi.fn(() => r);
    r.json = vi.fn(() => r);
    r.end = vi.fn(() => r);
    return r;
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REFRESH_TOKEN;
    delete process.env.GOOGLE_SPREADSHEET_ID;
  });

  it('fails with 500 and does not call append when Workout Logs read returns 500', async () => {
    Object.assign(process.env, {
      GOOGLE_CLIENT_ID: 'cid',
      GOOGLE_CLIENT_SECRET: 'csec',
      GOOGLE_REFRESH_TOKEN: 'rtok',
      GOOGLE_SPREADSHEET_ID: 'sheet-123',
    });

    const calls: { url: string; method?: string }[] = [];
    const json = (v: unknown) => ({ ok: true, json: async () => v, text: async (): Promise<string> => '' });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: any = {}) => {
        calls.push({ url, method: init.method || 'GET' });
        if (url.includes('identitytoolkit')) {
          return json({
            users: [{ email: 'lagoonkeh@gmail.com', emailVerified: true }],
          });
        }
        if (url.includes('oauth2.googleapis.com/token')) {
          return json({ access_token: 'fake-access-token' });
        }
        if (url.includes('Workout%20Logs') || url.includes('Workout Logs')) {
          return {
            ok: false,
            status: 500,
            text: async (): Promise<string> => 'Internal Server Error',
            json: async () => ({}),
          };
        }
        return json({});
      })
    );

    const r = res();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer fake-id-token' },
      body: {
        workoutLogs: [
          {
            date: '2026-11-15',
            sessionName: 'Chest Day',
            exerciseName: 'Bench Press',
            tier: 'Tier 1',
            setNumber: 1,
            reps: 8,
            weight: 200,
          },
        ],
      },
    };

    await handler(req, r);

    expect(r.status).toHaveBeenCalledWith(500);
    expect(calls.some((c) => c.url.includes('append'))).toBe(false);
  });
});
