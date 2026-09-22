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
import { DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES } from './googleSheetsService';

// Initialize Firebase App and Auth
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const ALLOWED_USER_EMAIL = 'joelstan2001@gmail.com';

export const isAuthorizedUser = (user: User | null): boolean => {
  if (!user || !user.email) return false;
  return user.email.toLowerCase().trim() === ALLOWED_USER_EMAIL.toLowerCase().trim();
};

export const hasPriorLogin = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('has_logged_in_before') === 'true';
};

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// Pre-fill user email and include previously granted scopes without forcing consent
provider.setCustomParameters({
  login_hint: ALLOWED_USER_EMAIL,
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

    // Strictly enforce single-user access
    if (!isAuthorizedUser(result.user)) {
      await signOut(auth);
      cachedAccessToken = null;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
      }
      throw new Error(
        `Access Denied: This tracker is private and only accessible to ${ALLOWED_USER_EMAIL}. You signed in with ${result.user.email || 'another account'}.`
      );
    }

    cachedAccessToken = credential.accessToken;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_TOKEN_KEY, credential.accessToken);
      localStorage.setItem('has_logged_in_before', 'true');
      localStorage.setItem('last_authorized_email', result.user.email || ALLOWED_USER_EMAIL);
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
  await signOut(auth);
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
  }
};

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
  const maxRows = Math.max(incomeCats.length, expenseCats.length);

  const categoryRows: string[][] = [
    ['Income Categories', 'Expense Categories'],
  ];

  for (let i = 0; i < maxRows; i++) {
    const inc = incomeCats[i] || '';
    const exp = expenseCats[i] || '';
    categoryRows.push([inc, exp]);
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
