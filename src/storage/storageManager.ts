// src/storage/storageManager.ts
import { MobilityEntry, validateMobilityEntry } from '../domain/mobility';
import { SkippedExerciseRecord } from '../domain/adaptiveAdjustments';

export const STORAGE_KEY_V1 = 'workout_app_state_v1';
export const SCHEMA_VERSION = 1 as const;

export interface WorkoutLogEntry {
  completed: boolean;
  weight: number;
  reps: number;
  notes: string;
}

export interface CompletedWorkoutSession {
  id?: string;
  date: string; // ISO 8601 string
  sessionId: 'lower_a' | 'upper_a' | 'lower_b' | 'upper_b' | string;
  sessionTitle?: string;
  logs: Record<string, WorkoutLogEntry> | Record<string, any>;
  totalDurationSeconds?: number;
  rating?: number;
  adherencePercentage?: number;
  totalVolumeLbs?: number;
  skippedExercises?: {
    exerciseId: string;
    exerciseName: string;
    reason?: string;
    skippedSets?: number;
    targetSets?: number;
  }[];
  completedExercisesCount?: number;
  totalExercisesCount?: number;
  notes?: string;
  startedAt?: string; // ISO 8601 string - first completed task timestamp
  completedAt?: string; // ISO 8601 string - when finished workout was clicked
  calendarEventId?: string; // ID of event on Google Calendar
  calendarLoggedAt?: string; // ISO 8601 string of when logged to calendar
  /** saved automatically when the session reached 100%; "Complete & Save" later updates this record */
  autoSaved?: boolean;
}

export interface StorageSettings {
  soundEnabled: boolean;
  defaultTimerPreset: number;
  preferredUnit: 'lbs' | 'kg';
}

export interface AppStorageData {
  version: 1;
  activeSessionId: string;
  completedWorkouts: Record<string, CompletedWorkoutSession>;
  currentLogs: Record<string, WorkoutLogEntry>;
  mobilityHistory: MobilityEntry[];
  programAdaptations?: Record<string, any>;
  weeklyEvaluations?: any[];
  skippedExercisesHistory?: SkippedExerciseRecord[];
  settings: StorageSettings;
}

export const DEFAULT_STORAGE_DATA: AppStorageData = {
  version: 1,
  activeSessionId: 'lower_a',
  completedWorkouts: {},
  currentLogs: {},
  mobilityHistory: [],
  programAdaptations: {},
  weeklyEvaluations: [],
  skippedExercisesHistory: [],
  settings: {
    soundEnabled: true,
    defaultTimerPreset: 90,
    preferredUnit: 'lbs',
  },
};

type StorageListener = (data: AppStorageData) => void;

export class StorageManager {
  private key: string;
  private memoryCache: AppStorageData;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingChanges: Partial<AppStorageData> = {};
  private listeners: Set<StorageListener> = new Set();
  private quotaExceeded: boolean = false;

  constructor(key: string = STORAGE_KEY_V1) {
    this.key = key;
    this.memoryCache = this.loadInitial();
    this.setupWindowListeners();
  }

  /**
   * Loads and sanitizes initial storage data.
   */
  private loadInitial(): AppStorageData {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return { ...DEFAULT_STORAGE_DATA };
      }
      const raw = window.localStorage.getItem(this.key);
      if (!raw) {
        return { ...DEFAULT_STORAGE_DATA };
      }
      const parsed = JSON.parse(raw);
      return this.sanitize(parsed);
    } catch (err) {
      console.warn(
        '[StorageManager] Failed to read from localStorage or corrupted JSON detected. Recovering to default state.',
        err
      );
      // Automatically recover corrupt state in localStorage
      this.writeToLocalStorage(DEFAULT_STORAGE_DATA);
      return { ...DEFAULT_STORAGE_DATA };
    }
  }

  /**
   * Defensive sanitization: guarantees every property matches AppStorageData v1.
   */
  public sanitize(raw: any): AppStorageData {
    if (!raw || typeof raw !== 'object') {
      return { ...DEFAULT_STORAGE_DATA };
    }

    const version = 1;
    const activeSessionId =
      typeof raw.activeSessionId === 'string' && raw.activeSessionId
        ? raw.activeSessionId
        : DEFAULT_STORAGE_DATA.activeSessionId;
    const completedWorkouts =
      raw.completedWorkouts && typeof raw.completedWorkouts === 'object' && !Array.isArray(raw.completedWorkouts)
        ? raw.completedWorkouts
        : Array.isArray(raw.completedWorkouts)
        ? raw.completedWorkouts.reduce((acc: any, item: any) => {
            if (item && (item.id || item.date)) {
              acc[item.id || item.date] = item;
            }
            return acc;
          }, {})
        : {};
    const currentLogs =
      raw.currentLogs && typeof raw.currentLogs === 'object'
        ? raw.currentLogs
        : {};

    // Sanitize mobility history: must be array and contain valid entries
    let mobilityHistory: MobilityEntry[] = [];
    if (Array.isArray(raw.mobilityHistory)) {
      mobilityHistory = raw.mobilityHistory.filter((entry: any) => {
        return entry && typeof entry === 'object' && validateMobilityEntry(entry).isValid;
      });
    }

    // Sanitize settings
    const rawSettings = raw.settings || {};
    const settings: StorageSettings = {
      soundEnabled:
        typeof rawSettings.soundEnabled === 'boolean'
          ? rawSettings.soundEnabled
          : DEFAULT_STORAGE_DATA.settings.soundEnabled,
      defaultTimerPreset:
        typeof rawSettings.defaultTimerPreset === 'number' && !isNaN(rawSettings.defaultTimerPreset)
          ? rawSettings.defaultTimerPreset
          : DEFAULT_STORAGE_DATA.settings.defaultTimerPreset,
      preferredUnit: rawSettings.preferredUnit === 'kg' ? 'kg' : 'lbs',
    };

    const programAdaptations =
      raw.programAdaptations && typeof raw.programAdaptations === 'object'
        ? raw.programAdaptations
        : {};
    const weeklyEvaluations = Array.isArray(raw.weeklyEvaluations)
      ? raw.weeklyEvaluations
      : [];
    const skippedExercisesHistory = Array.isArray(raw.skippedExercisesHistory)
      ? raw.skippedExercisesHistory
      : [];

    return {
      version,
      activeSessionId,
      completedWorkouts,
      currentLogs,
      mobilityHistory,
      programAdaptations,
      weeklyEvaluations,
      skippedExercisesHistory,
      settings,
    };
  }

  /**
   * Attaches unload and cross-tab storage synchronizers.
   */
  private setupWindowListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeunload', () => {
      this.flush();
    });

    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key === this.key && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          this.memoryCache = this.sanitize(parsed);
          this.notify();
        } catch {
          // Ignore invalid cross-tab event payloads
        }
      }
    });
  }

  /**
   * Synchronously writes payload to localStorage with quota handling.
   */
  private writeToLocalStorage(data: AppStorageData): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    try {
      window.localStorage.setItem(this.key, JSON.stringify(data));
      this.quotaExceeded = false;
      return true;
    } catch (err: any) {
      if (err?.name === 'QuotaExceededError' || err?.code === 22) {
        this.quotaExceeded = true;
        console.warn(
          '[StorageManager] LocalStorage QuotaExceededError encountered! Operating in in-memory fallback mode.'
        );
      } else {
        console.warn('[StorageManager] LocalStorage write error:', err);
      }
      return false;
    }
  }

  /**
   * Retrieves current application state.
   */
  public load(): AppStorageData {
    return { ...this.memoryCache };
  }

  /**
   * Queues a debounced save (300ms window).
   */
  public save(partialData: Partial<AppStorageData>): void {
    this.memoryCache = {
      ...this.memoryCache,
      ...partialData,
    };
    this.pendingChanges = {
      ...this.pendingChanges,
      ...partialData,
    };

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.flush();
    }, 300);

    this.notify();
  }

  /**
   * Saves immediately, cancelling any active debounce timers.
   */
  public saveImmediate(partialData: Partial<AppStorageData>): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.memoryCache = {
      ...this.memoryCache,
      ...partialData,
    };
    this.pendingChanges = {};
    this.writeToLocalStorage(this.memoryCache);
    this.notify();
  }

  /**
   * Flushes any pending debounced changes immediately.
   */
  public flush(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (Object.keys(this.pendingChanges).length > 0) {
      this.writeToLocalStorage(this.memoryCache);
      this.pendingChanges = {};
    }
  }

  /**
   * Resets storage to default state.
   */
  public clear(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingChanges = {};
    this.memoryCache = { ...DEFAULT_STORAGE_DATA };
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(this.key);
      } catch {
        // Ignore
      }
    }
    this.notify();
  }

  /**
   * Subscribes a listener to state updates.
   */
  public subscribe(listener: StorageListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const data = this.load();
    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (err) {
        console.error('[StorageManager] Error in subscriber callback', err);
      }
    });
  }

  // --- Mobility Domain Specific Helpers ---

  public addMobilityEntry(entry: Omit<MobilityEntry, 'id'> & { id?: string }): AppStorageData {
    const newEntry: MobilityEntry = {
      ...entry,
      id: entry.id || `mob_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: entry.date || new Date().toISOString(),
    };

    const validation = validateMobilityEntry(newEntry);
    if (!validation.isValid) {
      throw new Error(`Invalid mobility entry: ${validation.error}`);
    }

    const updatedHistory = [...this.memoryCache.mobilityHistory, newEntry];
    this.saveImmediate({ mobilityHistory: updatedHistory });
    return this.load();
  }

  public deleteMobilityEntry(id: string): AppStorageData {
    const updatedHistory = this.memoryCache.mobilityHistory.filter((e) => e.id !== id);
    this.saveImmediate({ mobilityHistory: updatedHistory });
    return this.load();
  }

  public updateMobilityEntry(id: string, updates: Partial<MobilityEntry>): AppStorageData {
    const updatedHistory = this.memoryCache.mobilityHistory.map((e) => {
      if (e.id === id) {
        const merged = { ...e, ...updates, id };
        const validation = validateMobilityEntry(merged);
        if (!validation.isValid) {
          throw new Error(`Invalid updated mobility entry: ${validation.error}`);
        }
        return merged;
      }
      return e;
    });
    this.saveImmediate({ mobilityHistory: updatedHistory });
    return this.load();
  }

  // --- Workout Logging Helpers ---

  public updateWorkoutLog(exerciseId: string, log: Partial<WorkoutLogEntry>): AppStorageData {
    const existing = this.memoryCache.currentLogs[exerciseId] || {
      completed: false,
      weight: 0,
      reps: 0,
      notes: '',
    };
    const updatedCurrentLogs = {
      ...this.memoryCache.currentLogs,
      [exerciseId]: { ...existing, ...log },
    };
    this.save({ currentLogs: updatedCurrentLogs });
    return this.load();
  }

  // --- Completed Workout History & Log Editor ---

  public getCompletedWorkouts(): Record<string, CompletedWorkoutSession> {
    return this.memoryCache.completedWorkouts || {};
  }

  public saveCompletedWorkout(session: CompletedWorkoutSession): AppStorageData {
    const id = session.id || `session_${session.sessionId}_${Date.now()}`;
    const record: CompletedWorkoutSession = { ...session, id };
    const updatedWorkouts = {
      ...(this.memoryCache.completedWorkouts || {}),
      [id]: record,
    };
    this.saveImmediate({ completedWorkouts: updatedWorkouts });
    return this.load();
  }

  public deleteCompletedWorkout(recordId: string): AppStorageData {
    const nextWorkouts = { ...(this.memoryCache.completedWorkouts || {}) };
    delete nextWorkouts[recordId];
    this.saveImmediate({ completedWorkouts: nextWorkouts });
    return this.load();
  }

  public updateCompletedWorkout(
    recordId: string,
    updates: Partial<CompletedWorkoutSession>
  ): AppStorageData {
    const existing = (this.memoryCache.completedWorkouts || {})[recordId];
    if (!existing) return this.load();
    const updatedRecord: CompletedWorkoutSession = {
      ...existing,
      ...updates,
      id: recordId,
    };
    const nextWorkouts = {
      ...(this.memoryCache.completedWorkouts || {}),
      [recordId]: updatedRecord,
    };
    this.saveImmediate({ completedWorkouts: nextWorkouts });
    return this.load();
  }

  public clearCompletedWorkouts(): AppStorageData {
    this.saveImmediate({ completedWorkouts: {} });
    return this.load();
  }

  // --- Program Adaptations & Weekly Evaluation ---

  public getProgramAdaptations(): Record<string, any> {
    return this.memoryCache.programAdaptations || {};
  }

  public saveProgramAdaptations(adaptations: Record<string, any>): AppStorageData {
    this.saveImmediate({ programAdaptations: adaptations });
    return this.load();
  }

  public getWeeklyEvaluations(): any[] {
    return this.memoryCache.weeklyEvaluations || [];
  }

  public saveWeeklyEvaluation(evaluation: any): AppStorageData {
    const list = [evaluation, ...(this.memoryCache.weeklyEvaluations || [])];
    this.saveImmediate({ weeklyEvaluations: list });
    return this.load();
  }

  public getSkippedExercises(): SkippedExerciseRecord[] {
    return this.memoryCache.skippedExercisesHistory || [];
  }

  public recordSkippedExercises(records: SkippedExerciseRecord[]): AppStorageData {
    const list = [...records, ...(this.memoryCache.skippedExercisesHistory || [])];
    this.saveImmediate({ skippedExercisesHistory: list });
    return this.load();
  }

  public clearSkippedExercise(exerciseId: string): AppStorageData {
    const list = (this.memoryCache.skippedExercisesHistory || []).filter(
      (r) => r.exerciseId !== exerciseId
    );
    this.saveImmediate({ skippedExercisesHistory: list });
    return this.load();
  }

  // --- Export and Import Engine ---

  public exportJSON(): string {
    return JSON.stringify(this.load(), null, 2);
  }

  public importJSON(jsonString: string): { success: boolean; error?: string; data?: AppStorageData } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { success: false, error: 'Import data must be a valid JSON object.' };
      }
      const sanitized = this.sanitize(parsed);
      this.saveImmediate(sanitized);
      return { success: true, data: sanitized };
    } catch (err: any) {
      return { success: false, error: `JSON Parse error: ${err?.message || 'Invalid syntax'}` };
    }
  }

  public isQuotaExceeded(): boolean {
    return this.quotaExceeded;
  }
}

export const storageManager = new StorageManager();
