import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { googleSignIn } from '../services/authService';
import {
  Wallet,
  Shield,
  FileSpreadsheet,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface LoginPageProps {
  onAuthSuccess: (user: User, accessToken: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onAuthSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await googleSignIn();
      onAuthSuccess(res.user, res.accessToken);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google authentication was cancelled or failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Bar */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-neutral-100">
              Personal Finances
            </h1>
            <p className="text-[11px] text-neutral-400 font-medium">
              Private Google Sheets Sync
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-900/80 border border-neutral-800 px-3 py-1.5 rounded-full">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Private Access</span>
        </div>
      </header>

      {/* Main Hero Card */}
      <main className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 shadow-inner mb-1">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Sign In to Your Tracker
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-sm mx-auto">
              Your financial records are kept strictly private. Authenticate with Google to view and sync your personal finances spreadsheet.
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {/* Action: Google Sign In */}
          <div className="space-y-3">
            <button
              type="button"
              id="btn-login-page-google"
              onClick={handleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-semibold text-sm shadow-lg hover:shadow-xl transition-all active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-neutral-700" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
              )}
              <span>{loading ? 'Connecting to Google...' : 'Sign in with Google'}</span>
            </button>

            <p className="text-center text-[11px] text-neutral-400">
              Only authorized Google accounts can view and edit entries.
            </p>
          </div>

          
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center py-4 text-[11px] text-neutral-400">
        Personal Finances Tracker · End-to-End Google Workspace Integration
      </footer>
    </div>
  );
};
