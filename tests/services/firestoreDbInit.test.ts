import { describe, it, expect, vi } from 'vitest';

const { mockGetFirestore, mockEnablePersistence } = vi.hoisted(() => ({
  mockGetFirestore: vi.fn(() => ({ started: false })),
  mockEnablePersistence: vi.fn(async (db: { started: boolean }) => {
    // the real SDK refuses once the database has been used
    if (db.started) throw Object.assign(new Error('Firestore has already been started'), { code: 'failed-precondition' });
  }),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: mockGetFirestore,
  enableIndexedDbPersistence: mockEnablePersistence,
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  onSnapshot: vi.fn(),
}));

describe('getFirebaseDb', () => {
  it('sets Firestore up once when several parts of the app ask at the same time', async () => {
    vi.resetModules();
    const auth = await import('../../src/services/firebaseAuth');
    vi.spyOn(auth, 'isTestEnvironment').mockReturnValue(false);
    vi.spyOn(auth, 'isFirebaseConfigured').mockReturnValue(true);
    vi.spyOn(auth, 'loadFirebaseAuth').mockResolvedValue({ app: {}, currentUser: { uid: 'u1' }, authStateReady: () => Promise.resolve() } as any);
    const { getFirebaseDb } = await import('../../src/services/firestoreSyncService');

    const dbs = await Promise.all([getFirebaseDb(), getFirebaseDb(), getFirebaseDb()]);
    expect(dbs[0]).not.toBeNull();
    expect(new Set(dbs).size).toBe(1);
    expect(mockGetFirestore).toHaveBeenCalledTimes(1);
    expect(mockEnablePersistence).toHaveBeenCalledTimes(1);

    // later calls reuse it without re-enabling persistence on a database that is already in use
    (dbs[0] as any).started = true;
    expect(await getFirebaseDb()).toBe(dbs[0]);
    expect(mockEnablePersistence).toHaveBeenCalledTimes(1);
  });
});
