import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  googleSignIn,
  googleSignOut,
  createNewFinancesSpreadsheet,
} from '../services/authService';
import {
  getPersistentSpreadsheetId,
  setPersistentSpreadsheetId,
} from '../services/googleSheetsService';
import {
  ExternalLink,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  LogOut,
  Loader2,
  Link as LinkIcon,
  Lock,
  ShieldCheck,
} from 'lucide-react';

interface GoogleAuthButtonProps {
  user: User | null;
  accessToken: string | null;
  currentSpreadsheetId: string;
  onAuthSuccess: (user: User, token: string) => void;
  onSignOut: () => void;
  onSelectSpreadsheet: (id: string) => void;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  user,
  accessToken,
  currentSpreadsheetId,
  onAuthSuccess,
  onSignOut,
  onSelectSpreadsheet,
}) => {
  const [loading, setLoading] = useState(false);
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inputUrlOrId, setInputUrlOrId] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  const effectiveSpreadsheetId =
    currentSpreadsheetId ||
    (user ? getPersistentSpreadsheetId(user.email, user.uid) : getPersistentSpreadsheetId());

  const isSheetLinked = Boolean(
    effectiveSpreadsheetId &&
    effectiveSpreadsheetId.trim() !== '' &&
    effectiveSpreadsheetId !== 'personal-finances-tracker-sheet'
  );

  // If component detects a remembered sheet ID that is not yet in App's state, hydrate it
  useEffect(() => {
    if (!currentSpreadsheetId && effectiveSpreadsheetId) {
      onSelectSpreadsheet(effectiveSpreadsheetId);
    }
  }, [currentSpreadsheetId, effectiveSpreadsheetId, onSelectSpreadsheet]);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await googleSignIn();
      onAuthSuccess(res.user, res.accessToken);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await googleSignOut();
      onSignOut();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!accessToken) {
      setErrorMsg('Please sign in with Google first');
      return;
    }

    try {
      setCreatingSheet(true);
      setErrorMsg(null);
      const res = await createNewFinancesSpreadsheet(accessToken, 'Personal Finances Tracker');
      setPersistentSpreadsheetId(res.spreadsheetId, user?.email, user?.uid);
      onSelectSpreadsheet(res.spreadsheetId);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create spreadsheet');
    } finally {
      setCreatingSheet(false);
    }
  };

  const handleApplyCustomId = () => {
    const raw = inputUrlOrId.trim();
    if (!raw) return;

    // Check if it's a full Google Sheets URL
    // e.g. https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit...
    const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const extractedId = match ? match[1] : raw;

    setPersistentSpreadsheetId(extractedId, user?.email, user?.uid);
    onSelectSpreadsheet(extractedId);
    setInputUrlOrId('');
    setShowLinkInput(false);
  };

  return (
    <div id="google-workspace-auth-section" className="space-y-3">
      {/* If Not Signed In */}
      {!user ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSignIn}
            disabled={loading}
            id="btn-google-sign-in"
            className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white text-neutral-800 hover:bg-neutral-100 font-medium text-xs shadow-md transition-all active:scale-98 disabled:opacity-70 border border-neutral-300"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-neutral-600" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 48 48">
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
            <span className="font-semibold">Sign in with Google</span>
          </button>

          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 bg-neutral-900/80 border border-neutral-800 px-3 py-2 rounded-xl">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Private App · Restricted Access</span>
          </div>
        </div>
      ) : (
        /* If Signed In */
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs">
          <div className="flex items-center gap-2.5">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Google Account'}
                className="w-7 h-7 rounded-full border border-neutral-700"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                {user.email ? user.email[0].toUpperCase() : 'U'}
              </div>
            )}
            <div>
              <div className="font-semibold text-neutral-200 flex items-center gap-1.5">
                <span>{user.displayName || user.email}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Owner
                </span>
              </div>
              <div className="text-[11px] text-neutral-400">{user.email}</div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Show Create and Link buttons ONLY when no sheet has been linked yet */}
            {!isSheetLinked ? (
              <>
                {/* 1-Click Create Spreadsheet in Drive */}
                <button
                  type="button"
                  onClick={handleCreateNewSheet}
                  disabled={creatingSheet}
                  id="btn-create-sheet"
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 text-xs transition-colors shadow-sm disabled:opacity-50"
                  title="Create a new formatted personal finances tracker sheet in your Google Drive"
                >
                  {creatingSheet ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Create New Sheet in Drive</span>
                </button>

                {/* Link existing sheet */}
                <button
                  type="button"
                  onClick={() => setShowLinkInput(!showLinkInput)}
                  id="btn-link-existing-sheet"
                  className="px-2.5 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center gap-1 text-xs transition-colors"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>Link Existing Sheet</span>
                </button>
              </>
            ) : (
              /* When sheet is already linked, display clean status only without Create & Link buttons */
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-emerald-400 font-medium text-[11px] bg-emerald-950/60 border border-emerald-800/60 px-2 py-1 rounded-md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sheet Linked</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowLinkInput(!showLinkInput)}
                  className="text-neutral-400 hover:text-neutral-200 text-[11px] px-1.5 py-0.5 rounded hover:bg-neutral-800 transition-colors"
                  title="Change linked spreadsheet"
                >
                  Change
                </button>
              </div>
            )}

            {/* Sign out */}
            <button
              type="button"
              onClick={handleSignOut}
              id="btn-google-signout"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
              title="Sign out of Google"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Link Existing Sheet Input Prompt */}
      {showLinkInput && (
        <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-700 flex flex-wrap items-center gap-2 text-xs">
          <input
            type="text"
            placeholder="Paste Google Sheets URL or Spreadsheet ID here..."
            value={inputUrlOrId}
            onChange={(e) => setInputUrlOrId(e.target.value)}
            className="flex-1 min-w-[240px] px-3 py-1.5 text-xs rounded-lg bg-neutral-950 border border-neutral-700 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={handleApplyCustomId}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
          >
            Connect
          </button>
          <button
            type="button"
            onClick={() => setShowLinkInput(false)}
            className="px-2 py-1.5 text-neutral-400 hover:text-neutral-200 text-xs"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Error display */}
      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
