// src/services/firebaseAuth.ts
// The Firebase SDK (~200 KB) is loaded on demand so it never holds up the first paint; everything here that
// needs it awaits loadFirebaseAuth(). The last confirmed sign-in is remembered so the app can open straight
// to the workout while Firebase restores the session in the background.
import type { User, Auth } from 'firebase/auth';

export interface AuthUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBnt9G-PWwXGE-CBetSenpQ9hHshDmXWBY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'workout-program-f805f.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'workout-program-f805f',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'workout-program-f805f.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '196691814753',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:196691814753:web:3ade89c400541e7f603d20',
};

export const STORAGE_KEY_AUTH_GUEST_BYPASS = 'workout_app_guest_auth_bypass_v1';
export const STORAGE_KEY_LOCAL_ALLOWED_EMAIL = 'workout_app_local_allowed_email_v1';
/** Profile of the last sign-in Firebase confirmed on this device (cleared on sign-out / expiry). */
export const STORAGE_KEY_AUTH_LAST_USER = 'workout_app_auth_last_user_v1';

export function loadLastKnownUser(): AuthUserProfile | null {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY_AUTH_LAST_USER) || 'null');
    return raw && typeof raw.uid === 'string' ? raw : null;
  } catch {
    return null;
  }
}

export function saveLastKnownUser(user: AuthUserProfile | null): void {
  try {
    if (user) localStorage.setItem(STORAGE_KEY_AUTH_LAST_USER, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY_AUTH_LAST_USER);
  } catch {
    // storage blocked: the app just waits for Firebase on the next start
  }
}

export const isFirebaseConfigured = (): boolean => {
  if (isTestEnvironment()) {
    return false;
  }
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY'
  );
};

export const isTestEnvironment = (): boolean => {
  try {
    return (
      (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') ||
      import.meta.env?.MODE === 'test'
    );
  } catch {
    return false;
  }
};

let auth: Auth | null = null;
let authLoading: Promise<Auth | null> | null = null;
type AuthSdk = typeof import('firebase/auth');
let sdk: AuthSdk | null = null;

/** Loads the Firebase SDK (once) and returns the Auth instance; null when Firebase isn't configured. */
export function loadFirebaseAuth(): Promise<Auth | null> {
  if (!isFirebaseConfigured()) return Promise.resolve(null);
  if (!authLoading) {
    authLoading = Promise.all([import('firebase/app'), import('firebase/auth')])
      .then(([appSdk, authSdk]) => {
        const app = appSdk.getApps().length > 0 ? appSdk.getApp() : appSdk.initializeApp(firebaseConfig);
        sdk = authSdk;
        auth = authSdk.getAuth(app);
        return auth;
      })
      .catch((err) => {
        console.error('Failed to initialize Firebase Auth:', err);
        authLoading = null; // offline: try again next time
        return null;
      });
  }
  return authLoading;
}

/** The Auth instance if the SDK has already loaded (synchronous callers that run after sign-in). */
export const getFirebaseAuth = (): Auth | null => auth;

/**
 * Returns a fresh Firebase ID token for the signed-in user, used to authenticate /api/sync calls.
 * Waits for Firebase to restore a saved session first, so early calls don't come back empty.
 */
export const getIdToken = async (): Promise<string | null> => {
  const a = await loadFirebaseAuth();
  if (!a) return null;
  try {
    await a.authStateReady();
  } catch {
    // older SDKs: fall through to currentUser
  }
  const user = a.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
};

export const getAllowedEmails = (): string[] => {
  const list: string[] = [];
  if (!isTestEnvironment()) {
    list.push('lagoonkeh@gmail.com');
  }
  const envEmails = !isTestEnvironment() ? import.meta.env.VITE_ALLOWED_EMAILS : undefined;
  if (envEmails) {
    envEmails.split(',').forEach((e: string) => {
      const trimmed = e.trim().toLowerCase();
      if (trimmed && !list.includes(trimmed)) list.push(trimmed);
    });
  }
  try {
    const localEmail = localStorage.getItem(STORAGE_KEY_LOCAL_ALLOWED_EMAIL);
    if (localEmail && !list.includes(localEmail.trim().toLowerCase())) {
      list.push(localEmail.trim().toLowerCase());
    }
  } catch {
    // ignore storage access errors
  }
  return list;
};

export const setLocalAllowedEmail = (email: string): void => {
  try {
    if (email.trim()) {
      localStorage.setItem(STORAGE_KEY_LOCAL_ALLOWED_EMAIL, email.trim().toLowerCase());
    }
  } catch {
    // ignore storage access errors
  }
};

export const isEmailAuthorized = (email: string | null | undefined): boolean => {
  if (!email || !email.trim()) return false;
  const allowed = getAllowedEmails();
  // If no allowlist is configured yet, any valid authenticated Google user is permitted
  if (allowed.length === 0) return true;
  return allowed.includes(email.trim().toLowerCase());
};

export const signInWithGoogle = async (): Promise<User> => {
  const authInstance = await loadFirebaseAuth();
  if (!authInstance || !sdk) {
    throw new Error('Firebase Authentication is not configured. Please supply VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID.');
  }
  const { GoogleAuthProvider, signInWithPopup } = sdk;
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/calendar.events');
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(authInstance, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential?.accessToken) {
    try {
      localStorage.setItem('workout_app_gcal_access_token', credential.accessToken);
    } catch {
      // safe fallback
    }
  }
  return result.user;
};

export const signOutUser = async (): Promise<void> => {
  const authInstance = await loadFirebaseAuth();
  if (authInstance && sdk) {
    await sdk.signOut(authInstance);
  }
  saveLastKnownUser(null);
  try {
    localStorage.removeItem(STORAGE_KEY_AUTH_GUEST_BYPASS);
  } catch {
    // ignore storage access errors
  }
};

export const subscribeToAuthState = (
  callback: (user: User | null) => void
): (() => void) => {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;
  void loadFirebaseAuth().then((authInstance) => {
    if (cancelled) return;
    if (!authInstance || !sdk) {
      callback(null);
      return;
    }
    unsubscribe = sdk.onAuthStateChanged(authInstance, callback);
  });
  return () => {
    cancelled = true;
    unsubscribe?.();
  };
};
