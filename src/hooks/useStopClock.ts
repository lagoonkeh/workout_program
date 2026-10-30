// src/hooks/useStopClock.ts
import { useState, useEffect, useCallback } from 'react';
import { stopClockSingleton, type StopClockSnapshot } from '../timer/stopClock';

export function useStopClock() {
  const [snapshot, setSnapshot] = useState<StopClockSnapshot>(() => stopClockSingleton.getSnapshot());

  useEffect(() => {
    const unsubscribe = stopClockSingleton.subscribe((newSnapshot) => {
      setSnapshot(newSnapshot);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const start = useCallback(() => stopClockSingleton.start(), []);
  const pause = useCallback(() => stopClockSingleton.pause(), []);
  const resume = useCallback(() => stopClockSingleton.resume(), []);
  const reset = useCallback(() => stopClockSingleton.reset(), []);
  const lap = useCallback(() => stopClockSingleton.lap(), []);

  return {
    snapshot,
    start,
    pause,
    resume,
    reset,
    lap,
    stopClock: stopClockSingleton,
  };
}
