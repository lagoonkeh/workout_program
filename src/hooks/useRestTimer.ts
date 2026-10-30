// src/hooks/useRestTimer.ts
import { useState, useEffect, useCallback } from 'react';
import { restTimerSingleton } from '../timer/restTimerSingleton';
import type { TimerSnapshot } from '../timer/restTimer';

export function useRestTimer() {
  const [snapshot, setSnapshot] = useState<TimerSnapshot>(() => restTimerSingleton.getSnapshot());

  useEffect(() => {
    const unsubscribe = restTimerSingleton.subscribe((newSnapshot) => {
      setSnapshot(newSnapshot);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const start = useCallback((duration: number) => restTimerSingleton.start(duration), []);
  const pause = useCallback(() => restTimerSingleton.pause(), []);
  const resume = useCallback(() => restTimerSingleton.resume(), []);
  const reset = useCallback((durationSeconds?: number) => restTimerSingleton.reset(durationSeconds), []);
  const addTime = useCallback((seconds: number) => restTimerSingleton.addTime(seconds), []);

  return {
    snapshot,
    start,
    pause,
    resume,
    reset,
    addTime,
    timer: restTimerSingleton,
  };
}
