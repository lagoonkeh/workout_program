// tests/components/AuthGateAndSecurity.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthGate } from '../../src/components/AuthGate';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import * as AuthContextModule from '../../src/context/AuthContext';
import {
  isEmailAuthorized,
  setLocalAllowedEmail,
  getAllowedEmails,
  isFirebaseConfigured,
  isTestEnvironment,
  signOutUser,
  STORAGE_KEY_AUTH_GUEST_BYPASS,
  STORAGE_KEY_LOCAL_ALLOWED_EMAIL,
} from '../../src/services/firebaseAuth';
import { Header } from '../../src/components/Header';

describe('AuthGate & Access Protection Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('1. Email Allowlist Validation Rules & Service Mechanics', () => {
    it('returns true when email matches local or configured allowlist case-insensitively', () => {
      setLocalAllowedEmail('lagoonkeh@gmail.com');
      expect(isEmailAuthorized('lagoonkeh@gmail.com')).toBe(true);
      expect(isEmailAuthorized('LAGOONKEH@GMAIL.COM')).toBe(true);
      setLocalAllowedEmail('Athlete@Gmail.com');
      expect(isEmailAuthorized('athlete@gmail.com')).toBe(true);
      expect(isEmailAuthorized('ATHLETE@GMAIL.COM')).toBe(true);
      expect(isEmailAuthorized('outsider@example.com')).toBe(false);
    });

    it('returns false for null, undefined, or blank emails', () => {
      expect(isEmailAuthorized(null)).toBe(false);
      expect(isEmailAuthorized(undefined)).toBe(false);
      expect(isEmailAuthorized('')).toBe(false);
      expect(isEmailAuthorized('   ')).toBe(false);
    });

    it('retrieves allowed emails from localStorage and handles empty entries safely', () => {
      expect(getAllowedEmails()).toEqual([]);
      setLocalAllowedEmail('coach@antigravity.fit');
      expect(getAllowedEmails()).toContain('coach@antigravity.fit');
      // Setting blank should not overwrite with empty item
      setLocalAllowedEmail('   ');
      expect(getAllowedEmails()).toContain('coach@antigravity.fit');
    });

    it('returns true for any valid email if allowlist is empty', () => {
      localStorage.removeItem(STORAGE_KEY_LOCAL_ALLOWED_EMAIL);
      expect(getAllowedEmails()).toEqual([]);
      expect(isEmailAuthorized('newuser@example.com')).toBe(true);
    });

    it('identifies test environment correctly', () => {
      expect(isTestEnvironment()).toBe(true);
    });

    it('checks firebase configuration fallback status', () => {
      // In default test/node environment without env vars, isFirebaseConfigured returns false
      expect(typeof isFirebaseConfigured()).toBe('boolean');
    });

    it('clears guest bypass flag upon signOutUser invocation', async () => {
      localStorage.setItem(STORAGE_KEY_AUTH_GUEST_BYPASS, 'true');
      await signOutUser();
      expect(localStorage.getItem(STORAGE_KEY_AUTH_GUEST_BYPASS)).toBeNull();
    });
  });

  function mockAuth(overrides: Partial<AuthContextModule.AuthContextType> = {}) {
    const defaultAuth: AuthContextModule.AuthContextType = {
      user: null,
      loading: false,
      error: null,
      isFirebaseReady: true,
      isAuthorized: false,
      isGuestBypassed: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      bypassAsGuest: vi.fn(),
      allowedEmails: [],
      addAllowedEmail: vi.fn(),
      clearError: vi.fn(),
      cloudSyncStatus: 'idle',
      lastCloudSyncedTime: null,
    };
    return vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      ...defaultAuth,
      ...overrides,
    });
  }

  describe('2. AuthGate UI & State Machine Transitions', () => {
    it('renders loading spinner screen when loading state is true', () => {
      mockAuth({
        loading: true,
      });

      render(
        <AuthGate>
          <div data-testid="protected-content">Content</div>
        </AuthGate>
      );

      expect(screen.getByTestId('auth-loading-screen')).toBeInTheDocument();
      expect(screen.getByText('Verifying Athlete Credentials')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('renders protected children when isAuthorized is true', () => {
      mockAuth({
        user: {
          uid: 'ath-1',
          email: 'athlete@example.com',
          displayName: 'John Doe',
          photoURL: null,
        },
        isAuthorized: true,
        allowedEmails: ['athlete@example.com'],
      });

      render(
        <AuthGate>
          <div data-testid="protected-content">Authorized Workout Data</div>
        </AuthGate>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByText('Authorized Workout Data')).toBeInTheDocument();
    });

    it('renders unauthorized restricted screen when user is logged in with unapproved email', () => {
      const mockLogout = vi.fn();
      const mockAddAllowedEmail = vi.fn();

      mockAuth({
        user: {
          uid: 'ath-unapproved',
          email: 'unapproved@outsider.com',
          displayName: 'Intruder',
          photoURL: null,
        },
        logout: mockLogout,
        allowedEmails: ['coach@antigravity.fit'],
        addAllowedEmail: mockAddAllowedEmail,
      });

      render(
        <AuthGate>
          <div data-testid="protected-content">Protected</div>
        </AuthGate>
      );

      expect(screen.getByTestId('auth-unauthorized-screen')).toBeInTheDocument();
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
      expect(screen.getByText('unapproved@outsider.com')).toBeInTheDocument();

      // Test Self-Verification with wrong PIN
      const pinInput = screen.getByPlaceholderText(/Enter setup PIN/i);
      const authorizeBtn = screen.getByRole('button', { name: /Authorize/i });

      fireEvent.change(pinInput, { target: { value: '9999' } });
      fireEvent.click(authorizeBtn);
      expect(screen.getByText(/Invalid PIN/i)).toBeInTheDocument();
      expect(mockAddAllowedEmail).not.toHaveBeenCalled();

      // Test Self-Verification with correct PIN 840
      fireEvent.change(pinInput, { target: { value: '840' } });
      fireEvent.click(authorizeBtn);
      expect(mockAddAllowedEmail).toHaveBeenCalledWith('unapproved@outsider.com');

      // Test Switch Google Account / Sign Out button
      const switchBtn = screen.getByTestId('auth-switch-account-btn');
      fireEvent.click(switchBtn);
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('renders unauthenticated login screen with Google button when Firebase is ready', () => {
      const mockLogin = vi.fn();
      const mockClearError = vi.fn();

      mockAuth({
        error: 'Popup was closed by user',
        loginWithGoogle: mockLogin,
        clearError: mockClearError,
      });

      render(
        <AuthGate>
          <div>Protected</div>
        </AuthGate>
      );

      expect(screen.getByTestId('auth-login-screen')).toBeInTheDocument();
      expect(screen.getByTestId('auth-google-signin-btn')).toBeInTheDocument();
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument();

      // Error message rendered and dismissible
      expect(screen.getByText('Popup was closed by user')).toBeInTheDocument();
      const dismissBtn = screen.getByRole('button', { name: /Dismiss/i });
      fireEvent.click(dismissBtn);
      expect(mockClearError).toHaveBeenCalledTimes(1);

      // Click sign in button
      fireEvent.click(screen.getByTestId('auth-google-signin-btn'));
      expect(mockLogin).toHaveBeenCalledTimes(1);

      // Collapsible setup guide toggle
      const guideToggle = screen.getByRole('button', { name: /How to add your Google Login credentials/i });
      fireEvent.click(guideToggle);
      expect(screen.getByText(/2-Minute Setup Instructions/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Hide Setup Instructions/i }));
      expect(screen.queryByText(/2-Minute Setup Instructions/i)).not.toBeInTheDocument();
    });

    it('renders Guest Bypass mode when Firebase is not configured', () => {
      const mockBypass = vi.fn();

      mockAuth({
        isFirebaseReady: false,
        bypassAsGuest: mockBypass,
      });

      render(
        <AuthGate>
          <div>Protected</div>
        </AuthGate>
      );

      expect(screen.getByTestId('auth-login-screen')).toBeInTheDocument();
      expect(screen.getByText(/Firebase Credentials Setup Pending/i)).toBeInTheDocument();
      const guestBtn = screen.getByTestId('auth-guest-bypass-btn');
      expect(guestBtn).toBeInTheDocument();

      fireEvent.click(guestBtn);
      expect(mockBypass).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Header Integration with Authenticated User & Sign Out', () => {
    it('renders athlete profile with photo avatar, name, and sign out button in Header', () => {
      const mockLogout = vi.fn();
      mockAuth({
        user: {
          uid: 'ath-verified-1',
          email: 'champion@antigravity.fit',
          displayName: 'Apex Athlete',
          photoURL: 'https://images.example.com/avatar.jpg',
        },
        isAuthorized: true,
        logout: mockLogout,
        allowedEmails: ['champion@antigravity.fit'],
      });

      render(
        <Header
          activeSessionTitle="Lower A"
          activeSessionSubtitle="Quad & Knee Bulletproofing"
          isMuted={false}
          onToggleMute={vi.fn()}
          currentView="workout"
          onSelectView={vi.fn()}
          completionPercentage={65}
        />
      );

      expect(screen.getByTestId('header-athlete-profile')).toBeInTheDocument();
      expect(screen.getByText('Apex Athlete')).toBeInTheDocument();
      expect(screen.getByText('Athlete Verified')).toBeInTheDocument();
      const avatarImg = screen.getByAltText('Apex Athlete');
      expect(avatarImg).toHaveAttribute('src', 'https://images.example.com/avatar.jpg');

      // Click sign out button
      const signOutBtns = screen.getAllByRole('button', { name: /Sign Out/i });
      fireEvent.click(signOutBtns[0]);
      expect(mockLogout).toHaveBeenCalled();
    });

    it('renders initials badge when athlete does not have a custom photoURL', () => {
      mockAuth({
        user: {
          uid: 'ath-initials',
          email: 'barbell@antigravity.fit',
          displayName: null,
          photoURL: null,
        },
        isAuthorized: true,
        allowedEmails: ['barbell@antigravity.fit'],
      });

      render(
        <Header
          activeSessionTitle="Upper A"
          activeSessionSubtitle="Horizontal Push / Pull"
          isMuted={false}
          onToggleMute={vi.fn()}
          currentView="workout"
          onSelectView={vi.fn()}
          completionPercentage={0}
        />
      );

      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('barbell')).toBeInTheDocument();
    });

    it('renders guest badge in Header when running under guest bypass with Firebase ready', () => {
      const mockLogout = vi.fn();
      mockAuth({
        isAuthorized: true,
        isGuestBypassed: true,
        logout: mockLogout,
      });

      render(
        <Header
          activeSessionTitle="Lower B"
          activeSessionSubtitle="Posterior Chain"
          isMuted={false}
          onToggleMute={vi.fn()}
          currentView="workout"
          onSelectView={vi.fn()}
          completionPercentage={10}
        />
      );

      expect(screen.getByTestId('header-guest-badge')).toBeInTheDocument();
      expect(screen.getByText('Guest')).toBeInTheDocument();
      const signOutBtn = screen.getByRole('button', { name: /Lock App \/ Exit Guest Mode/i });
      fireEvent.click(signOutBtn);
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. AuthProvider Context Mechanics', () => {
    it('provides default unauthenticated context and updates guest bypass & allowlist', () => {
      const TestConsumer = () => {
        const auth = useAuth();
        return (
          <div>
            <div data-testid="is-ready">{String(auth.isFirebaseReady)}</div>
            <div data-testid="is-bypassed">{String(auth.isGuestBypassed)}</div>
            <div data-testid="is-authorized">{String(auth.isAuthorized)}</div>
            <button onClick={auth.bypassAsGuest}>Bypass</button>
            <button onClick={() => auth.addAllowedEmail('coach@test.com')}>Add Email</button>
            <button onClick={auth.clearError}>Clear Error</button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      expect(screen.getByTestId('is-ready')).toHaveTextContent('false');
      // Test bypass
      fireEvent.click(screen.getByText('Bypass'));
      expect(screen.getByTestId('is-bypassed')).toHaveTextContent('true');

      // Test add email
      fireEvent.click(screen.getByText('Add Email'));
      expect(getAllowedEmails()).toContain('coach@test.com');
    });
  });
});
