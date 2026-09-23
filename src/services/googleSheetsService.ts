import { Transaction, TransactionType, CategoriesData, SheetConnectionConfig } from '../types';
import { getCachedAccessToken } from './authService';
import { formatToDDMMYYYY } from '../utils/dateUtils';

export const DEFAULT_INCOME_CATEGORIES: string[] = ['Salary', 'Others', 'Gift'];

export const DEFAULT_INVESTMENT_CATEGORIES: string[] = [
  'Mutual Funds',
  'Stocks',
  'Fixed Deposit',
  'Gold',
  'Crypto',
  'PPF / EPF',
  'Real Estate',
  'NPS',
  'Others',
];

export const DEFAULT_EXPENSE_CATEGORIES: string[] = [
  'Shopping',
  'Food/Beverages',
  'Travel',
  'Medical',
  'Gym/Health',
  'Personal',
  'Vehicle',
  'Tith',
  'Utilities',
  'Entertainment',
  'Others',
  'Education',
];

const LOCAL_STORAGE_TRANSACTIONS_KEY = 'income_expense_tracker_transactions';
const LOCAL_STORAGE_CATEGORIES_KEY = 'income_expense_tracker_categories';
const LOCAL_STORAGE_CONFIG_KEY = 'income_expense_tracker_config';
export const PERSISTENT_SPREADSHEET_KEY = 'last_linked_spreadsheet_id';

export function getPersistentSpreadsheetId(email?: string | null, uid?: string | null): string {
  if (typeof window === 'undefined') return DEFAULT_SPREADSHEET_ID;

  if (email && email.trim()) {
    const byEmail = localStorage.getItem(`last_linked_sheet_${email.toLowerCase().trim()}`);
    if (byEmail && byEmail.trim()) return byEmail.trim();
  }
  if (uid && uid.trim()) {
    const byUid = localStorage.getItem(`last_linked_sheet_${uid.trim()}`);
    if (byUid && byUid.trim()) return byUid.trim();
  }
  const globalLast = localStorage.getItem(PERSISTENT_SPREADSHEET_KEY);
  if (globalLast && globalLast.trim()) return globalLast.trim();

  // Also check if config has one
  const saved = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.spreadsheetId && typeof parsed.spreadsheetId === 'string' && parsed.spreadsheetId.trim()) {
        return parsed.spreadsheetId.trim();
      }
    } catch {
      // ignore
    }
  }
  return DEFAULT_SPREADSHEET_ID;
}

export function setPersistentSpreadsheetId(
  sheetId: string,
  email?: string | null,
  uid?: string | null
): void {
  if (typeof window === 'undefined' || !sheetId || !sheetId.trim()) return;
  const cleanId = sheetId.trim();
  localStorage.setItem(PERSISTENT_SPREADSHEET_KEY, cleanId);
  if (email && email.trim()) {
    localStorage.setItem(`last_linked_sheet_${email.toLowerCase().trim()}`, cleanId);
  }
  if (uid && uid.trim()) {
    localStorage.setItem(`last_linked_sheet_${uid.trim()}`, cleanId);
  }
}

export const DEFAULT_SPREADSHEET_ID =
  (typeof window !== 'undefined' &&
    ((window as unknown as { SPREADSHEET_ID?: string; __SPREADSHEET_ID__?: string }).SPREADSHEET_ID ||
      (window as unknown as { SPREADSHEET_ID?: string; __SPREADSHEET_ID__?: string }).__SPREADSHEET_ID__)) ||
  import.meta.env.VITE_SPREADSHEET_ID ||
  '';

// No dummy transactions: real data loaded strictly upon user Google login
export function getInitialTransactions(): Transaction[] {
  return [];
}

// Read authorization token if available in the environment
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;

  const cached = getCachedAccessToken();
  if (cached) return cached;

  const win = window as unknown as {
    GOOGLE_ACCESS_TOKEN?: string;
    __ACCESS_TOKEN__?: string;
    gapi?: { auth?: { getToken?: () => { access_token?: string } } };
  };

  if (win.GOOGLE_ACCESS_TOKEN) return win.GOOGLE_ACCESS_TOKEN;
  if (win.__ACCESS_TOKEN__) return win.__ACCESS_TOKEN__;

  const gapiToken = win.gapi?.auth?.getToken?.()?.access_token;
  if (gapiToken) return gapiToken;

  const localToken = localStorage.getItem('google_access_token');
  if (localToken) return localToken;

  return import.meta.env.VITE_GOOGLE_ACCESS_TOKEN || null;
}

export function loadStoredConfig(): SheetConnectionConfig {
  const rememberedSheetId = getPersistentSpreadsheetId();
  if (typeof window === 'undefined') {
    return {
      spreadsheetId: rememberedSheetId,
      status: 'idle',
    };
  }
  const saved = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        spreadsheetId: parsed.spreadsheetId || rememberedSheetId,
        status: parsed.status || 'idle',
      };
    } catch {
      // fallback
    }
  }
  return {
    spreadsheetId: rememberedSheetId,
    status: 'idle',
    lastSyncedAt: null,
  };
}

export function saveStoredConfig(
  config: SheetConnectionConfig,
  email?: string | null,
  uid?: string | null
): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(config));
    if (config.spreadsheetId && config.spreadsheetId.trim()) {
      setPersistentSpreadsheetId(config.spreadsheetId, email, uid);
    }
  }
}

export function loadStoredTransactions(): Transaction[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(LOCAL_STORAGE_TRANSACTIONS_KEY);
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fallback
    }
  }
  return [];
}

export function clearStoredData(): void {
  if (typeof window !== 'undefined') {
    // Only clear private session transaction cache, NOT the spreadsheet link ID
    localStorage.removeItem(LOCAL_STORAGE_TRANSACTIONS_KEY);
    localStorage.removeItem(LOCAL_STORAGE_CATEGORIES_KEY);
  }
}

export function saveStoredTransactions(transactions: Transaction[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_TRANSACTIONS_KEY, JSON.stringify(transactions));
  }
}

export function loadStoredCategories(): CategoriesData {
  if (typeof window === 'undefined') {
    return {
      incomeCategories: DEFAULT_INCOME_CATEGORIES,
      expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
      investmentCategories: DEFAULT_INVESTMENT_CATEGORIES,
    };
  }
  const saved = localStorage.getItem(LOCAL_STORAGE_CATEGORIES_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (
        parsed &&
        Array.isArray(parsed.incomeCategories) &&
        Array.isArray(parsed.expenseCategories)
      ) {
        return {
          incomeCategories: parsed.incomeCategories,
          expenseCategories: parsed.expenseCategories,
          investmentCategories: Array.isArray(parsed.investmentCategories) && parsed.investmentCategories.length > 0
            ? parsed.investmentCategories
            : DEFAULT_INVESTMENT_CATEGORIES,
        };
      }
    } catch {
      // fallback
    }
  }
  const defaults: CategoriesData = {
    incomeCategories: DEFAULT_INCOME_CATEGORIES,
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    investmentCategories: DEFAULT_INVESTMENT_CATEGORIES,
  };
  localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(defaults));
  return defaults;
}

export function saveStoredCategories(categories: CategoriesData): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(categories));
  }
}

/**
 * Google Sheets REST API Client
 */
export class GoogleSheetsService {
  private spreadsheetId: string;
  private token: string | null;

  constructor(spreadsheetId: string, token: string | null = null) {
    this.spreadsheetId = spreadsheetId;
    this.token = token || getAccessToken();
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const currentToken = this.token || getAccessToken();
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }
    return headers;
  }

  /**
   * Fetches Categories from Tab: "Categories"
   * Column A: "Income Categories"
   * Column B: "Expense Categories"
   * Column C: "Investment Categories"
   */
  async fetchCategories(): Promise<{ data: CategoriesData; fromRemote: boolean }> {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        this.spreadsheetId
      )}/values/Categories!A:C`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Google Sheets API responded with status ${response.status}`);
      }

      const json = await response.json();
      const rows: string[][] = json.values || [];

      const incomeCategories: string[] = [];
      const expenseCategories: string[] = [];
      const investmentCategories: string[] = [];

      // Process rows, skipping header names if present
      for (let i = 0; i < rows.length; i++) {
        const colA = rows[i][0]?.trim();
        const colB = rows[i][1]?.trim();
        const colC = rows[i][2]?.trim();

        if (i === 0) {
          if (colA && colA.toLowerCase() !== 'income categories' && colA.toLowerCase() !== 'income') {
            incomeCategories.push(colA);
          }
          if (colB && colB.toLowerCase() !== 'expense categories' && colB.toLowerCase() !== 'expense') {
            expenseCategories.push(colB);
          }
          if (colC && colC.toLowerCase() !== 'investment categories' && colC.toLowerCase() !== 'investment' && colC.toLowerCase() !== 'investments') {
            investmentCategories.push(colC);
          }
          continue;
        }

        if (colA && !incomeCategories.includes(colA)) {
          incomeCategories.push(colA);
        }
        if (colB && !expenseCategories.includes(colB)) {
          expenseCategories.push(colB);
        }
        if (colC && !investmentCategories.includes(colC)) {
          investmentCategories.push(colC);
        }
      }

      const result: CategoriesData = {
        incomeCategories: incomeCategories.length > 0 ? incomeCategories : DEFAULT_INCOME_CATEGORIES,
        expenseCategories: expenseCategories.length > 0 ? expenseCategories : DEFAULT_EXPENSE_CATEGORIES,
        investmentCategories: investmentCategories.length > 0 ? investmentCategories : DEFAULT_INVESTMENT_CATEGORIES,
      };

      saveStoredCategories(result);
      return { data: result, fromRemote: true };
    } catch (err) {
      console.warn('Google Sheets fetchCategories notice (using cached/synced categories):', err);
      return { data: loadStoredCategories(), fromRemote: false };
    }
  }

  /**
   * Fetches Transactions from Tab: "Transactions"
   * Columns: Date, Type, Category, Amount, Description
   */
  async fetchTransactions(): Promise<{ data: Transaction[]; fromRemote: boolean }> {
    if (!this.spreadsheetId || this.spreadsheetId === 'personal-finances-tracker-sheet') {
      return { data: loadStoredTransactions(), fromRemote: false };
    }

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        this.spreadsheetId
      )}/values/Transactions!A:E`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Google Sheets API responded with status ${response.status}`);
      }

      const json = await response.json();
      const rows: string[][] = json.values || [];
      const transactions: Transaction[] = [];

      // First row may be headers: ["Date", "Type", "Category", "Amount", "Description"]
      const startIndex =
        rows.length > 0 && rows[0][0]?.toLowerCase() === 'date' ? 1 : 0;

      for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || !row[0]) continue;

        const rawDate = row[0]?.trim();
        const date = formatToDDMMYYYY(rawDate);
        const rawType = (row[1] || '').trim().toLowerCase();
        let type: TransactionType = 'Expense';
        if (rawType === 'income') {
          type = 'Income';
        } else if (rawType === 'investment' || rawType === 'investments') {
          type = 'Investment';
        } else {
          type = 'Expense';
        }

        const category =
          row[2]?.trim() ||
          (type === 'Income' ? 'Salary' : type === 'Investment' ? 'Mutual Funds' : 'Others');
        const amount = parseFloat(row[3]?.toString().replace(/[^0-9.-]/g, '') || '0') || 0;
        const description = row[4]?.trim() || '';

        transactions.push({
          id: `sheet-tx-${i}-${date}-${amount}`,
          date,
          type,
          category,
          amount,
          description,
        });
      }

      saveStoredTransactions(transactions);
      return { data: transactions, fromRemote: true };
    } catch (err) {
      console.warn('Google Sheets fetchTransactions notice (using cached/synced transactions):', err);
      return { data: loadStoredTransactions(), fromRemote: false };
    }
  }

  /**
   * Appends a new transaction to Tab: "Transactions"
   * Format: Date, Type, Category, Amount, Description
   */
  async appendTransaction(tx: Omit<Transaction, 'id'>): Promise<{ success: boolean; fromRemote: boolean }> {
    if (!this.spreadsheetId || this.spreadsheetId === 'personal-finances-tracker-sheet') {
      return { success: true, fromRemote: false };
    }

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        this.spreadsheetId
      )}/values/Transactions!A:E:append?valueInputOption=USER_ENTERED`;

      const formattedDate = formatToDDMMYYYY(tx.date);
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          range: 'Transactions!A:E',
          majorDimension: 'ROWS',
          values: [[formattedDate, tx.type, tx.category, tx.amount.toString(), tx.description || '']],
        }),
      });

      if (!response.ok) {
        throw new Error(`Google Sheets append failed with status ${response.status}`);
      }

      return { success: true, fromRemote: true };
    } catch (err) {
      console.warn('Google Sheets appendTransaction queued in local state:', err);
      return { success: true, fromRemote: false };
    }
  }

  /**
   * Deletes a transaction from Tab: "Transactions" and synchronizes the spreadsheet.
   * Clears old rows from Transactions!A:E and rewrites header + remaining transactions.
   */
  async deleteTransaction(remainingTransactions: Transaction[]): Promise<{ success: boolean; fromRemote: boolean }> {
    saveStoredTransactions(remainingTransactions);

    if (!this.spreadsheetId || this.spreadsheetId === 'personal-finances-tracker-sheet') {
      return { success: true, fromRemote: false };
    }

    try {
      // Step 1: Clear all existing values in the Transactions tab (A:E)
      const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        this.spreadsheetId
      )}/values/Transactions!A:E:clear`;

      const clearResponse = await fetch(clearUrl, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({}),
      });

      if (!clearResponse.ok) {
        throw new Error(`Google Sheets clear failed with status ${clearResponse.status}`);
      }

      // Step 2: Write back header row + all remaining transactions
      const rows: string[][] = [
        ['Date', 'Type', 'Category', 'Amount', 'Description'],
        ...remainingTransactions.map((tx) => [
          formatToDDMMYYYY(tx.date),
          tx.type,
          tx.category,
          tx.amount.toString(),
          tx.description || '',
        ]),
      ];

      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        this.spreadsheetId
      )}/values/Transactions!A1?valueInputOption=USER_ENTERED`;

      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          range: 'Transactions!A1',
          majorDimension: 'ROWS',
          values: rows,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error(`Google Sheets update failed with status ${updateResponse.status}`);
      }

      return { success: true, fromRemote: true };
    } catch (err) {
      console.warn('Google Sheets deleteTransaction sync notice:', err);
      return { success: true, fromRemote: false };
    }
  }

  /**
   * Updates Categories in Tab: "Categories"
   * Column A: "Income Categories"
   * Column B: "Expense Categories"
   * Column C: "Investment Categories"
   */
  async updateCategories(categories: CategoriesData): Promise<{ success: boolean; fromRemote: boolean }> {
    saveStoredCategories(categories);

    try {
      const investmentCats = categories.investmentCategories || DEFAULT_INVESTMENT_CATEGORIES;
      const maxRows = Math.max(
        categories.incomeCategories.length,
        categories.expenseCategories.length,
        investmentCats.length
      );

      const rows: string[][] = [
        ['Income Categories', 'Expense Categories', 'Investment Categories'],
      ];

      for (let i = 0; i < maxRows; i++) {
        rows.push([
          categories.incomeCategories[i] || '',
          categories.expenseCategories[i] || '',
          investmentCats[i] || '',
        ]);
      }

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        this.spreadsheetId
      )}/values/Categories!A:C?valueInputOption=USER_ENTERED`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          range: 'Categories!A:C',
          majorDimension: 'ROWS',
          values: rows,
        }),
      });

      if (!response.ok) {
        throw new Error(`Google Sheets updateCategories failed with status ${response.status}`);
      }

      return { success: true, fromRemote: true };
    } catch (err) {
      console.warn('Google Sheets updateCategories saved in local storage:', err);
      return { success: true, fromRemote: false };
    }
  }
}
