// Extracted from src/App.tsx (WorkoutAppMain). Same hooks in the same order; inputs come in as args.
import { useCallback, useState } from 'react';
import { STORAGE_KEY_PHASE_TASKS, STORAGE_KEY_SESSION_START_TIMES, STORAGE_KEY_WARMUPS } from '../../storage/appStorageKeys';

export interface UseWarmupProgressArgs {
  activeSessionId: string;
}

export function useWarmupProgress({ activeSessionId }: UseWarmupProgressArgs) {
  const [completedWarmups, setCompletedWarmups] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_WARMUPS);
      if (stored) return JSON.parse(stored);
    } catch {
      // safe fallback
    }
    return {};
  });

  const [phaseTasks, setPhaseTasks] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PHASE_TASKS);
      if (stored) return JSON.parse(stored);
    } catch {
      // safe fallback
    }
    return {};
  });

  const [sessionStartTimes, setSessionStartTimes] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SESSION_START_TIMES);
      if (stored) return JSON.parse(stored);
    } catch {
      // safe fallback
    }
    return {};
  });

  // Record start time on first completed task (warmup drill, phase task, or exercise set)
  const recordTaskCompletionStartTime = useCallback((sessionId?: string) => {
    const targetId = sessionId || activeSessionId;
    if (!targetId) return;
    setSessionStartTimes((prev) => {
      if (prev[targetId]) return prev;
      const nowIso = new Date().toISOString();
      const updated = { ...prev, [targetId]: nowIso };
      try {
        localStorage.setItem(STORAGE_KEY_SESSION_START_TIMES, JSON.stringify(updated));
      } catch {
        // safe fallback
      }
      return updated;
    });
  }, [activeSessionId]);

  const [collapsedWarmupDrills, setCollapsedWarmupDrills] = useState<Record<string, boolean>>({});

  const handleToggleWarmupDrillCollapse = useCallback((drillId: string, currentlyCollapsed: boolean) => {
    setCollapsedWarmupDrills((prev) => ({
      ...prev,
      [drillId]: !currentlyCollapsed,
    }));
  }, []);

  const handleToggleWarmupDrill = useCallback((drillId: string, totalPhases?: number) => {
    setCompletedWarmups((prev) => {
      const nextDone = !prev[drillId];
      if (nextDone) {
        recordTaskCompletionStartTime();
      }
      const next = { ...prev, [drillId]: nextDone };
      try {
        localStorage.setItem(STORAGE_KEY_WARMUPS, JSON.stringify(next));
      } catch {
        // safe fallback
      }
      setCollapsedWarmupDrills((prevCol) => ({
        ...prevCol,
        [drillId]: nextDone,
      }));

      // Synchronize all phase tasks if totalPhases provided
      if (totalPhases && totalPhases > 0) {
        setPhaseTasks((prevTasks) => {
          const updated = { ...prevTasks };
          for (let i = 0; i < totalPhases; i++) {
            updated[`${drillId}_phase_${i}`] = nextDone;
          }
          try {
            localStorage.setItem(STORAGE_KEY_PHASE_TASKS, JSON.stringify(updated));
          } catch {
            // safe fallback
          }
          return updated;
        });
      }

      return next;
    });
  }, [recordTaskCompletionStartTime]);

  const handleTogglePhaseTask = useCallback((phaseKey: string, drillId?: string, totalPhases?: number) => {
    setPhaseTasks((prev) => {
      const nextDone = !prev[phaseKey];
      if (nextDone) {
        recordTaskCompletionStartTime();
      }
      const next = { ...prev, [phaseKey]: nextDone };
      try {
        localStorage.setItem(STORAGE_KEY_PHASE_TASKS, JSON.stringify(next));
      } catch {
        // safe fallback
      }

      // If all phases for this drill are now done, mark the drill completed
      if (drillId && totalPhases && totalPhases > 0) {
        let allPhasesDone = true;
        for (let i = 0; i < totalPhases; i++) {
          const k = `${drillId}_phase_${i}`;
          if (k === phaseKey ? !nextDone : !next[k]) {
            allPhasesDone = false;
            break;
          }
        }
        if (allPhasesDone) {
          setCompletedWarmups((prevWarmups) => {
            if (prevWarmups[drillId]) return prevWarmups;
            const updated = { ...prevWarmups, [drillId]: true };
            try {
              localStorage.setItem(STORAGE_KEY_WARMUPS, JSON.stringify(updated));
            } catch {
              // safe fallback
            }
            return updated;
          });
        }
      }

      return next;
    });
  }, [recordTaskCompletionStartTime]);

  const handleToggleAllDrillPhases = useCallback((drillId: string, totalPhases: number) => {
    if (!drillId || totalPhases <= 0) return;
    setPhaseTasks((prev) => {
      let allDone = true;
      for (let i = 0; i < totalPhases; i++) {
        if (!prev[`${drillId}_phase_${i}`]) {
          allDone = false;
          break;
        }
      }
      const targetState = !allDone;
      if (targetState) {
        recordTaskCompletionStartTime();
      }
      const next = { ...prev };
      for (let i = 0; i < totalPhases; i++) {
        next[`${drillId}_phase_${i}`] = targetState;
      }
      try {
        localStorage.setItem(STORAGE_KEY_PHASE_TASKS, JSON.stringify(next));
      } catch {
        // safe fallback
      }

      if (targetState) {
        setCompletedWarmups((prevWarmups) => {
          if (prevWarmups[drillId]) return prevWarmups;
          const updated = { ...prevWarmups, [drillId]: true };
          try {
            localStorage.setItem(STORAGE_KEY_WARMUPS, JSON.stringify(updated));
          } catch {
            // safe fallback
          }
          return updated;
        });
      }

      return next;
    });
  }, [recordTaskCompletionStartTime]);

  const [expandedWarmupInstructions, setExpandedWarmupInstructions] = useState<Record<string, boolean>>({});

  const handleToggleWarmupInstructions = useCallback((drillId: string) => {
    setExpandedWarmupInstructions((prev) => ({
      ...prev,
      [drillId]: !prev[drillId],
    }));
  }, []);

  return { collapsedWarmupDrills, completedWarmups, expandedWarmupInstructions, handleToggleAllDrillPhases, handleTogglePhaseTask, handleToggleWarmupDrill, handleToggleWarmupDrillCollapse, handleToggleWarmupInstructions, phaseTasks, recordTaskCompletionStartTime, sessionStartTimes, setCollapsedWarmupDrills, setCompletedWarmups, setPhaseTasks, setSessionStartTimes };
}
