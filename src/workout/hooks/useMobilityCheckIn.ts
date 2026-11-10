// Extracted from src/App.tsx (WorkoutAppMain). Same hooks in the same order; inputs come in as args.
import { useCallback, useMemo, useState } from 'react';
import { getMobilityCheckInStatus, type MobilityEntry } from '../../domain/mobility';
import { STORAGE_KEY_MOBILITY_SNOOZE } from '../../storage/appStorageKeys';

export interface UseMobilityCheckInArgs {
  mobilityHistory: MobilityEntry[];
}

export function useMobilityCheckIn({ mobilityHistory }: UseMobilityCheckInArgs) {
  // 6b. Bi-Weekly Mobility Assessment Check-In State (Every 14 Days)
  const [mobilitySnoozeTimestamp, setMobilitySnoozeTimestamp] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MOBILITY_SNOOZE);
      return stored ? Number(stored) : null;
    } catch {
      return null;
    }
  });

  const mobilityCheckInStatus = useMemo(() => {
    return getMobilityCheckInStatus(mobilityHistory, mobilitySnoozeTimestamp);
  }, [mobilityHistory, mobilitySnoozeTimestamp]);

  const handleSnoozeMobilityPrompt = useCallback(() => {
    const twoDaysMs = Date.now() + 2 * 24 * 60 * 60 * 1000;
    try {
      localStorage.setItem(STORAGE_KEY_MOBILITY_SNOOZE, String(twoDaysMs));
    } catch {
      // safe fallback
    }
    setMobilitySnoozeTimestamp(twoDaysMs);
  }, []);

  const handleDismissMobilityPrompt = useCallback(() => {
    const sevenDaysMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
    try {
      localStorage.setItem(STORAGE_KEY_MOBILITY_SNOOZE, String(sevenDaysMs));
    } catch {
      // safe fallback
    }
    setMobilitySnoozeTimestamp(sevenDaysMs);
  }, []);

  return { handleDismissMobilityPrompt, handleSnoozeMobilityPrompt, mobilityCheckInStatus };
}
