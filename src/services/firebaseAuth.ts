// src/services/firebaseAuth.ts
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';

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

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export const getFirebaseAuth = (): Auth | null => {
  if (!isFirebaseConfigured()) return null;
  try {
    if (!app) {
      app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    }
    if (!auth) {
      auth = getAuth(app);
    }
    return auth;
  } catch (err) {
    console.error('Failed to initialize Firebase Auth:', err);
    return null;
  }
};

/**
 * Returns a fresh Firebase ID token for the signed-in user, used to authenticate /api/sync calls.
 */
export const getIdToken = async (): Promise<string | null> => {
  const user = getFirebaseAuth()?.currentUser;
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
  const authInstance = getFirebaseAuth();
  if (!authInstance) {
    throw new Error('Firebase Authentication is not configured. Please supply VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(authInstance, provider);
  return result.user;
};

export const signOutUser = async (): Promise<void> => {
  const authInstance = getFirebaseAuth();
  if (authInstance) {
    await signOut(authInstance);
  }
  try {
    localStorage.removeItem(STORAGE_KEY_AUTH_GUEST_BYPASS);
  } catch {
    // ignore storage access errors
  }
};

export const subscribeToAuthState = (
  callback: (user: User | null) => void
): (() => void) => {
  const authInstance = getFirebaseAuth();
  if (!authInstance) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(authInstance, callback);
};
