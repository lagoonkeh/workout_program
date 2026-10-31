import { describe, it, expect } from 'vitest';
// @ts-expect-error plain JS serverless function
import { validateAppBackup, backupTables } from '../../api/sync.js';

const backup = {
  version: 1,
  savedAt: '2026-10-25T10:00:00.000Z',
  profile: { dob: '1990-01-01', heightInches: 70, weighIns: [{ id: 'a', date: '2026-10-01', lbs: 180 }] },
  assessments: [
    { quarterLabel: 'Q4 2026', date: '2026-10-01', age: 36, bodyweightLbs: 182, scores: { squat1rmLbs: 300 }, notes: '=HYPERLINK("x")' },
    { quarterLabel: 'Q3 2026', date: '2026-07-01', age: 36, bodyweightLbs: 178, scores: {} },
  ],
};

describe('api/sync app backup', () => {
  it('accepts a well-formed backup and rejects malformed ones', () => {
    expect(validateAppBackup(backup)).toBeNull();
    expect(validateAppBackup(null)).toMatch(/object/);
    expect(validateAppBackup({ ...backup, savedAt: 'nope' })).toMatch(/savedAt/);
    expect(validateAppBackup({ ...backup, assessments: 'x' })).toMatch(/assessments/);
    expect(validateAppBackup({ ...backup, profile: { weighIns: Array(5000).fill(backup.profile.weighIns[0]) } })).toMatch(/too large/);
  });

  it('builds readable tabs, oldest first, with the weigh-in winning over the test on the same day', () => {
    const { body, assessments } = backupTables(backup);
    expect(body[0]).toEqual(['Date', 'Bodyweight (lb)', 'Source']);
    expect(body.slice(1)).toEqual([
      ['2026-07-01', 178, 'Quarterly test'],
      ['2026-10-01', 180, 'Weigh-in'],
    ]);
    expect(assessments[1][0]).toBe('Q3 2026');
    expect(assessments[2][4]).toBe(300);
    expect(assessments[2][assessments[0].indexOf('Notes')]).toBe('=HYPERLINK("x")'); // written RAW, not evaluated
  });
});
