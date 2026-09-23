import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INVESTMENT_CATEGORIES,
} from './googleSheetsService';

// Initialize Firebase App and Auth
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Optional restricted email from environment variable (never hardcoded in source)
const envAllowedEmail = (import.meta.env.VITE_ALLOWED_EMAIL || '').trim().toLowerCase();

export const isAuthorizedUser = (user: User | null): boolean => {
  if (!user || !user.email) return false;
  if (envAllowedEmail) {
    return user.email.toLowerCase().trim() === envAllowedEmail;
  }
  return true;
};

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// Ensure account selector is shown and DO NOT pre-fill any private email address
provider.setCustomParameters({
  prompt: 'select_account',
  include_granted_scopes: 'true',
});

const SESSION_TOKEN_KEY = 'gs_access_token';

// In-memory & session access token cache
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // Enforce owner authorization
      if (!isAuthorizedUser(user)) {
        await signOut(auth);
        cachedAccessToken = null;
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(SESSION_TOKEN_KEY);
        }
        if (onAuthFailure) onAuthFailure();
        return;
      }

      const activeToken = getCachedAccessToken();
      if (activeToken) {
        cachedAccessToken = activeToken;
        if (onAuthSuccess) onAuthSuccess(user, activeToken);
      } else if (!isSigningIn) {
        // Token not available in session
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google sign in');
    }

    // Strictly enforce authorized access if restriction configured
    if (!isAuthorizedUser(result.user)) {
      await signOut(auth);
      cachedAccessToken = null;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
      }
      throw new Error(
        'Access Denied: This tracker is restricted to authorized accounts.'
      );
    }

    cachedAccessToken = credential.accessToken;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_TOKEN_KEY, credential.accessToken);
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(SESSION_TOKEN_KEY);
  }
  return null;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
  }
};

export const googleSignOut = async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Sign out notice:', err);
  }
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    sessionStorage.clear();
    // Wipe sensitive transient state only; do NOT wipe the linked spreadsheet ID
    localStorage.removeItem('income_expense_tracker_transactions');
    localStorage.removeItem('income_expense_tracker_categories');
    localStorage.removeItem('has_logged_in_before');
    localStorage.removeItem('last_authorized_email');
  }
};

/**
 * Searches the user's Google Drive for an existing Personal Finances Tracker spreadsheet
 */
export async function findExistingFinancesSpreadsheet(
  accessToken: string,
  title = 'Personal Finances Tracker'
): Promise<string | null> {
  if (!accessToken) return null;
  try {
    const q = encodeURIComponent(
      `name = '${title}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
    );
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime desc&pageSize=1&fields=files(id,name)`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.files && data.files.length > 0 && data.files[0].id) {
        return data.files[0].id;
      }
    }
  } catch (err) {
    console.warn('Drive auto-discovery notice:', err);
  }
  return null;
}

/**
 * Creates a brand new Google Spreadsheet in the user's Google Drive
 * with the exact required schema:
 * - "Transactions" tab with columns: Date, Type, Category, Amount, Description
 * - "Categories" tab with Column A: Income Categories, Column B: Expense Categories
 */
export async function createNewFinancesSpreadsheet(
  accessToken: string,
  title = 'Personal Finances Tracker'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';

  const incomeCats = DEFAULT_INCOME_CATEGORIES;
  const expenseCats = DEFAULT_EXPENSE_CATEGORIES;
  const investmentCats = DEFAULT_INVESTMENT_CATEGORIES;
  const maxRows = Math.max(incomeCats.length, expenseCats.length, investmentCats.length);

  const categoryRows: string[][] = [
    ['Income Categories', 'Expense Categories', 'Investment Categories'],
  ];

  for (let i = 0; i < maxRows; i++) {
    const inc = incomeCats[i] || '';
    const exp = expenseCats[i] || '';
    const inv = investmentCats[i] || '';
    categoryRows.push([inc, exp, inv]);
  }

  const payload = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'Transactions',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: [
                  { userEnteredValue: { stringValue: 'Date' } },
                  { userEnteredValue: { stringValue: 'Type' } },
                  { userEnteredValue: { stringValue: 'Category' } },
                  { userEnteredValue: { stringValue: 'Amount' } },
                  { userEnteredValue: { stringValue: 'Description' } },
                ],
              },
            ],
          },
        ],
      },
      {
        properties: {
          title: 'Categories',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: categoryRows.map((row) => ({
              values: row.map((val) => ({
                userEnteredValue: { stringValue: val },
              })),
            })),
          },
        ],
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create spreadsheet: ${errText}`);
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
  };
}
