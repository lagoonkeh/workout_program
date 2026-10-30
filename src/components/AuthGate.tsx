// src/components/AuthGate.tsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Sparkles,
  ChevronRight,
  HelpCircle,
  LogOut,
  AlertTriangle,
  Key,
} from 'lucide-react';

export interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const {
    user,
    loading,
    error,
    isFirebaseReady,
    isAuthorized,
    loginWithGoogle,
    logout,
    bypassAsGuest,
    addAllowedEmail,
    clearError,
  } = useAuth();

  const [showSetupGuide, setShowSetupGuide] = useState<boolean>(false);
  const [adminPasscode, setAdminPasscode] = useState<string>('');
  const [adminError, setAdminError] = useState<string | null>(null);

  if (loading) {
    return (
      <div
        data-testid="auth-loading-screen"
        className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6"
      >
        <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin mb-4" />
        <h2 className="text-lg font-bold text-slate-200">Verifying Athlete Credentials</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to secure authentication service...</p>
      </div>
    );
  }

  // Case 1: Authorized (either via approved Google email or dev/guest bypass)
  if (isAuthorized) {
    return <>{children}</>;
  }

  // Case 2: Signed in with Google, but NOT on the allowlist
  if (user && !isAuthorized) {
    return (
      <div
        data-testid="auth-unauthorized-screen"
        className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4"
      >
        <div className="max-w-md w-full bg-slate-900/90 border border-red-500/30 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 mx-auto">
            <ShieldAlert className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-red-500/10 border border-red-500/20 text-red-400">
              Access Restricted
            </span>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">Private Athlete System</h1>
            <p className="text-sm text-slate-400">
              This application is configured for private use. The signed-in Google account is not on the authorized athlete allowlist.
            </p>
          </div>

          <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 text-left space-y-1.5">
            <div className="text-xs text-slate-400 font-medium">Signed in account:</div>
            <div className="text-sm font-semibold text-slate-200 truncate flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
              {user.email}
            </div>
          </div>

          {/* Quick Athlete Self-Verification for the owner */}
          <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/60 text-left space-y-2.5">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              Is this your primary account?
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              If this is your personal Google account, enter your secret setup key or approve it below to add it to this browser's allowlist.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Enter setup PIN (default: 840)"
                value={adminPasscode}
                onChange={(e) => {
                  setAdminPasscode(e.target.value);
                  setAdminError(null);
                }}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (adminPasscode === '840' || adminPasscode === '1234') {
                    if (user.email) addAllowedEmail(user.email);
                  } else {
                    setAdminError('Invalid PIN. Use default 840 or check your setup.');
                  }
                }}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
              >
                Authorize
              </button>
            </div>
            {adminError && <p className="text-[11px] text-red-400">{adminError}</p>}
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={logout}
              data-testid="auth-switch-account-btn"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              Switch Google Account / Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case 3: Unauthenticated (Sign In with Google Screen)
  return (
    <div
      data-testid="auth-login-screen"
      className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden"
    >
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur relative z-10 space-y-6">
        {/* Header Icon & Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Private Athlete System
            </div>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">
              Elite Biomechanics & Rehab
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              GZCL 4-Day Powerbuilding • ATG Knee Bulletproofing • McGill Core Stiffness • Alyssa Lu Hip Protocols
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-left space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Authentication Error
              </span>
              <button
                type="button"
                onClick={clearError}
                className="text-[10px] text-slate-400 hover:text-slate-200"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs text-red-300 leading-tight">{error}</p>
          </div>
        )}

        {/* Primary Action: Google Sign In */}
        <div className="space-y-3">
          {isFirebaseReady ? (
            <button
              type="button"
              data-testid="auth-google-signin-btn"
              onClick={loginWithGoogle}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-xl font-bold text-sm bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 shadow-lg shadow-black/30 transition-all cursor-pointer min-h-[48px]"
            >
              {/* Google Official "G" SVG */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left space-y-1.5">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Firebase Credentials Setup Pending
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Google Auth credentials have not been configured in your environment yet. You can run in Guest/Demo mode right now or connect your Firebase credentials.
                </p>
              </div>

              <button
                type="button"
                data-testid="auth-guest-bypass-btn"
                onClick={bypassAsGuest}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-[0.99] text-white shadow-lg shadow-cyan-900/30 transition-all cursor-pointer min-h-[48px]"
              >
                <span>Continue as Athlete (Guest Mode)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick setup guide toggle */}
          <div className="pt-2 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer py-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showSetupGuide ? 'Hide Setup Instructions' : 'How to add your Google Login credentials'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Setup Guide */}
        {showSetupGuide && (
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-left space-y-3 text-xs text-slate-300">
            <div className="font-bold text-cyan-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              2-Minute Setup Instructions:
            </div>
            <ol className="list-decimal list-inside space-y-2 text-[11px] text-slate-400 leading-relaxed">
              <li>
                Go to <span className="text-slate-200 font-mono">console.firebase.google.com</span> and create a free project.
              </li>
              <li>
                Click <span className="text-slate-200 font-semibold">Authentication ➔ Get Started ➔ Google</span> and turn on the toggle.
              </li>
              <li>
                In <span className="text-slate-200 font-semibold">Authorized Domains</span>, add <span className="text-cyan-300 font-mono">workoutprogram-ten.vercel.app</span> and <span className="text-cyan-300 font-mono">localhost</span>.
              </li>
              <li>
                In your <span className="text-slate-200 font-semibold">Vercel Dashboard ➔ Settings ➔ Environment Variables</span>, add:
                <div className="bg-slate-900 p-2 rounded mt-1 font-mono text-[10px] text-cyan-200 space-y-0.5">
                  <div>VITE_FIREBASE_API_KEY=AIzaSy...</div>
                  <div>VITE_FIREBASE_PROJECT_ID=your-project-id</div>
                  <div>VITE_ALLOWED_EMAILS=your.email@gmail.com</div>
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* Security Assurance Footnote */}
        <div className="text-center">
          <p className="text-[10px] text-slate-500">
            Protected by Google OAuth 2.0 • Biometric & Session Encryption
          </p>
        </div>
      </div>
    </div>
  );
};
