// src/storage/appDataClock.ts
/**
 * When the user last changed data that lives only on this device (profile, weigh-ins,
 * quarterly assessments). The Google Drive backup compares this with the backup's timestamp
 * so a restore never overwrites newer local edits.
 */
export const STORAGE_KEY_APP_DATA_MODIFIED = 'workout_app_data_modified_at_v1';
export const APP_DATA_MODIFIED_EVENT = 'app-data-modified';

export function getAppDataModifiedAt(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY_APP_DATA_MODIFIED);
  } catch {
    return null;
  }
}

export function setAppDataModifiedAt(iso: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY_APP_DATA_MODIFIED, iso);
  } catch {
    // storage unavailable
  }
}

/** Call after a user-initiated change; schedules a backup. */
export function touchAppData(now: Date = new Date()): void {
  setAppDataModifiedAt(now.toISOString());
  try {
    window.dispatchEvent(new Event(APP_DATA_MODIFIED_EVENT));
  } catch {
    // non-browser
  }
}
