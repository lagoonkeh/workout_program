import { describe, it, expect } from 'vitest';
import {
  parseWatchCommand,
  commandFromMessage,
  resolveSetTarget,
  nextSetLine,
  WATCH_COMMAND_MESSAGE,
} from '../../src/timer/watchCommands';

describe('watch / Tasker commands', () => {
  it('parses ?cmd= URLs', () => {
    expect(parseWatchCommand('?cmd=set-done')).toEqual({ cmd: 'set-done', target: null });
    expect(parseWatchCommand('?cmd=set-done&ex=t1_bb_squat&set=2')).toEqual({
      cmd: 'set-done',
      target: { exerciseId: 't1_bb_squat', setIndex: 2 },
    });
    expect(parseWatchCommand('?cmd=rest&sec=120')).toEqual({ cmd: 'rest', sec: 120 });
    expect(parseWatchCommand('?cmd=rest')).toEqual({ cmd: 'rest', sec: 90 });
    expect(parseWatchCommand('?cmd=rest&sec=99999')).toEqual({ cmd: 'rest', sec: 900 });
    expect(parseWatchCommand('?cmd=delete-everything')).toBeNull();
    expect(parseWatchCommand('?view=progress')).toBeNull();
  });

  it('accepts only well-formed service worker messages', () => {
    expect(commandFromMessage({ type: WATCH_COMMAND_MESSAGE, cmd: 'rest', sec: 30 })).toEqual({ cmd: 'rest', sec: 30 });
    expect(
      commandFromMessage({ type: WATCH_COMMAND_MESSAGE, cmd: 'set-done', target: { exerciseId: 'a', setIndex: 1 } })
    ).toEqual({ cmd: 'set-done', target: { exerciseId: 'a', setIndex: 1 } });
    expect(commandFromMessage({ type: WATCH_COMMAND_MESSAGE, cmd: 'set-done', target: { exerciseId: 'a', setIndex: -1 } })).toEqual({
      cmd: 'set-done',
      target: null,
    });
    expect(commandFromMessage({ type: 'SKIP_WAITING' })).toBeNull();
    expect(commandFromMessage(null)).toBeNull();
  });

  const exercises = [{ id: 'a' }, { id: 'b' }];
  const logs: Record<string, { isCompleted: boolean }[]> = {
    a: [{ isCompleted: true }, { isCompleted: true }],
    b: [{ isCompleted: true }, { isCompleted: false }, { isCompleted: false }],
  };
  const logsFor = (e: { id: string }) => logs[e.id];

  it('ticks the requested set while it is still open', () => {
    expect(resolveSetTarget({ exerciseId: 'b', setIndex: 2 }, exercises, logsFor)).toEqual({ exercise: { id: 'b' }, setIndex: 2 });
  });
  it('falls back to the first open set when the requested one is done or unknown', () => {
    expect(resolveSetTarget({ exerciseId: 'a', setIndex: 0 }, exercises, logsFor)).toEqual({ exercise: { id: 'b' }, setIndex: 1 });
    expect(resolveSetTarget({ exerciseId: 'zzz', setIndex: 0 }, exercises, logsFor)!.setIndex).toBe(1);
    expect(resolveSetTarget(null, exercises, logsFor)).toEqual({ exercise: { id: 'b' }, setIndex: 1 });
  });
  it('returns null when everything is done', () => {
    expect(resolveSetTarget(null, [{ id: 'a' }], logsFor)).toBeNull();
  });

  it('writes a readable next-set line', () => {
    const base = { exerciseId: 'a', setIndex: 2, exerciseName: 'Barbell Back Squat', setNumber: 3, totalSets: 5, targetReps: '3' };
    expect(nextSetLine({ ...base, weightLbs: 195 })).toBe('Set 3 of 5 · Barbell Back Squat · 195 lb × 3');
    expect(nextSetLine({ ...base, weightLbs: 0, targetReps: '45s' })).toBe('Set 3 of 5 · Barbell Back Squat · 45s');
  });
});
