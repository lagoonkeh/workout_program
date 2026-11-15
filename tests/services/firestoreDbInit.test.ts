import { describe, it, expect, vi } from 'vitest';

const { mockInitializeFirestore, mockPersistentLocalCache, mockPersistentMultipleTabManager, mockGetFirestore } = vi.hoisted(() => ({
  mockInitializeFirestore: vi.fn((_app, config) => ({ started: false, config })),
  mockPersistentLocalCache: vi.fn((opts) => ({ cache: 'persistent', ...opts })),
  mockPersistentMultipleTabManager: vi.fn(() => ({ type: 'multiple-tabs' })),
  mockGetFirestore: vi.fn(() => ({ started: false })),
}));

vi.mock('firebase/firestore', () => ({
  initializeFirestore: mockInitializeFirestore,
  persistentLocalCache: mockPersistentLocalCache,
  persistentMultipleTabManager: mockPersistentMultipleTabManager,
  getFirestore: mockGetFirestore,
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  onSnapshot: vi.fn(),
}));

describe('getFirebaseDb', () => {
  it('sets Firestore up once with multi-tab persistence when several parts of the app ask at the same time', async () => {
    vi.resetModules();
    const auth = await import('../../src/services/firebaseAuth');
    vi.spyOn(auth, 'isTestEnvironment').mockReturnValue(false);
    vi.spyOn(auth, 'isFirebaseConfigured').mockReturnValue(true);
    vi.spyOn(auth, 'loadFirebaseAuth').mockResolvedValue({ app: {}, currentUser: { uid: 'u1' }, authStateReady: () => Promise.resolve() } as any);
    const { getFirebaseDb } = await import('../../src/services/firestoreSyncService');

    const dbs = await Promise.all([getFirebaseDb(), getFirebaseDb(), getFirebaseDb()]);
    expect(dbs[0]).not.toBeNull();
    expect(new Set(dbs).size).toBe(1);
    expect(mockInitializeFirestore).toHaveBeenCalledTimes(1);
    expect(mockPersistentMultipleTabManager).toHaveBeenCalledTimes(1);
    expect(mockPersistentLocalCache).toHaveBeenCalledTimes(1);

    // later calls reuse it
    (dbs[0] as any).started = true;
    expect(await getFirebaseDb()).toBe(dbs[0]);
    expect(mockInitializeFirestore).toHaveBeenCalledTimes(1);
  });
});
