// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AuthUserProfile,
  isFirebaseConfigured,
  isTestEnvironment,
  signInWithGoogle,
  signOutUser,
  subscribeToAuthState,
  isEmailAuthorized,
  getAllowedEmails,
  setLocalAllowedEmail,
  STORAGE_KEY_AUTH_GUEST_BYPASS,
  loadLastKnownUser,
  saveLastKnownUser,
} from '../services/firebaseAuth';
import { firestoreSyncService, type CloudSyncStatus } from '../services/firestoreSyncService';

export interface AuthContextType {
  user: AuthUserProfile | null;
  loading: boolean;
  error: string | null;
  isFirebaseReady: boolean;
  isAuthorized: boolean;
  isGuestBypassed: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  bypassAsGuest: () => void;
  allowedEmails: string[];
  addAllowedEmail: (email: string) => void;
  clearError: () => void;
  cloudSyncStatus: CloudSyncStatus;
  lastCloudSyncedTime: number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const hasGuestBypass = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY_AUTH_GUEST_BYPASS) === 'true';
  } catch {
    return false;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Open straight to the app when this device's last sign-in was confirmed and allowed; Firebase restores the
  // session in the background and a signed-out result still sends the user to the login screen.
  const [user, setUser] = useState<AuthUserProfile | null>(() =>
    !isTestEnvironment() && isFirebaseConfigured() ? loadLastKnownUser() : null
  );
  const [loading, setLoading] = useState<boolean>(
    () =>
      !isTestEnvironment() &&
      isFirebaseConfigured() &&
      !isEmailAuthorized(loadLastKnownUser()?.email) &&
      !hasGuestBypass()
  );
  const [error, setError] = useState<string | null>(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState<boolean>(false);
  const [isGuestBypassed, setIsGuestBypassed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_AUTH_GUEST_BYPASS) === 'true';
    } catch {
      return false;
    }
  });
  const [allowedList, setAllowedList] = useState<string[]>(() => getAllowedEmails());
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('idle');
  const [lastCloudSyncedTime, setLastCloudSyncedTime] = useState<number | null>(null);

  useEffect(() => {
    return firestoreSyncService.onStatusChange((status, time) => {
      setCloudSyncStatus(status);
      setLastCloudSyncedTime(time);
    });
  }, []);

  useEffect(() => {
    const ready = isFirebaseConfigured();
    setIsFirebaseReady(ready);

    if (!ready) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      if (firebaseUser) {
        const profile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };
        setUser(profile);
        saveLastKnownUser(profile);
      } else {
        setUser(null);
        saveLastKnownUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const u = await signInWithGoogle();
      setUser({
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        photoURL: u.photoURL,
      });
      // If allowlist is empty, automatically claim this first account as the primary authorized athlete
      if (u.email && getAllowedEmails().length === 0) {
        setLocalAllowedEmail(u.email);
        setAllowedList(getAllowedEmails());
      }
      // Clear guest bypass upon actual login
      try {
        localStorage.removeItem(STORAGE_KEY_AUTH_GUEST_BYPASS);
        setIsGuestBypassed(false);
      } catch {
        // ignore storage errors
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed.';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await signOutUser();
      setUser(null);
      setIsGuestBypassed(false);
      try {
        localStorage.removeItem(STORAGE_KEY_AUTH_GUEST_BYPASS);
      } catch {
        // ignore
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign out failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const bypassAsGuest = useCallback(() => {
    setIsGuestBypassed(true);
    try {
      localStorage.setItem(STORAGE_KEY_AUTH_GUEST_BYPASS, 'true');
    } catch {
      // ignore
    }
  }, []);

  const addAllowedEmail = useCallback((email: string) => {
    setLocalAllowedEmail(email);
    setAllowedList(getAllowedEmails());
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const isAuthorized =
    isTestEnvironment() ||
    isGuestBypassed ||
    (Boolean(user) && isEmailAuthorized(user?.email));

  const contextValue: AuthContextType = {
    user,
    loading,
    error,
    isFirebaseReady,
    isAuthorized,
    isGuestBypassed,
    loginWithGoogle,
    logout,
    bypassAsGuest,
    allowedEmails: allowedList,
    addAllowedEmail,
    clearError,
    cloudSyncStatus,
    lastCloudSyncedTime,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

const DEFAULT_AUTH_CONTEXT: AuthContextType = {
  user: null,
  loading: false,
  error: null,
  isFirebaseReady: false,
  isAuthorized: true,
  isGuestBypassed: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
  bypassAsGuest: () => {},
  allowedEmails: [],
  addAllowedEmail: () => {},
  clearError: () => {},
  cloudSyncStatus: 'idle',
  lastCloudSyncedTime: null,
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  return context || DEFAULT_AUTH_CONTEXT;
};
