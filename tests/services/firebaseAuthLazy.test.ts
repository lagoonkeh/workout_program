import { describe, it, expect } from 'vitest';
import {
  STORAGE_KEY_AUTH_LAST_USER,
  loadLastKnownUser,
  saveLastKnownUser,
  getFirebaseAuth,
  loadFirebaseAuth,
  getIdToken,
  signOutUser,
} from '../../src/services/firebaseAuth';

describe('firebaseAuth: on-demand SDK and remembered sign-in', () => {
  it('remembers the last confirmed sign-in and forgets it', () => {
    expect(loadLastKnownUser()).toBeNull();
    const u = { uid: 'u1', email: 'a@b.com', displayName: 'A', photoURL: null };
    saveLastKnownUser(u);
    expect(loadLastKnownUser()).toEqual(u);
    saveLastKnownUser(null);
    expect(localStorage.getItem(STORAGE_KEY_AUTH_LAST_USER)).toBeNull();
  });

  it('ignores a corrupt saved profile', () => {
    localStorage.setItem(STORAGE_KEY_AUTH_LAST_USER, '{not json');
    expect(loadLastKnownUser()).toBeNull();
    localStorage.setItem(STORAGE_KEY_AUTH_LAST_USER, JSON.stringify({ email: 'x' }));
    expect(loadLastKnownUser()).toBeNull();
  });

  it('never loads the SDK when Firebase is not configured (tests), and token calls come back empty', async () => {
    expect(getFirebaseAuth()).toBeNull();
    await expect(loadFirebaseAuth()).resolves.toBeNull();
    await expect(getIdToken()).resolves.toBeNull();
  });

  it('signing out clears the remembered sign-in', async () => {
    saveLastKnownUser({ uid: 'u1', email: 'a@b.com', displayName: null, photoURL: null });
    await signOutUser();
    expect(loadLastKnownUser()).toBeNull();
  });
});
