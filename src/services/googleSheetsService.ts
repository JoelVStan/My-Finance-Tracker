import { Transaction, CategoriesData, SheetConnectionConfig } from '../types';
import { getCachedAccessToken } from './authService';

export const DEFAULT_INCOME_CATEGORIES: string[] = ['Salary', 'Others', 'Gift'];

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
  'Investment',
  'Education',
];

const LOCAL_STORAGE_TRANSACTIONS_KEY = 'income_expense_tracker_transactions';
const LOCAL_STORAGE_CATEGORIES_KEY = 'income_expense_tracker_categories';
const LOCAL_STORAGE_CONFIG_KEY = 'income_expense_tracker_config';

export const DEFAULT_SPREADSHEET_ID =
  (typeof window !== 'undefined' &&
    ((window as unknown as { SPREADSHEET_ID?: string; __SPREADSHEET_ID__?: string }).SPREADSHEET_ID ||
      (window as unknown as { SPREADSHEET_ID?: string; __SPREADSHEET_ID__?: string }).__SPREADSHEET_ID__)) ||
  import.meta.env.VITE_SPREADSHEET_ID ||
  'personal-finances-tracker-sheet';

// Helper to generate starter transactions for demonstration and immediate visual feedback
export function getInitialTransactions(): Transaction[] {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  return [
    {
      id: 'tx-1',
      date: `${year}-${month}-01`,
      type: 'Income',
      category: 'Salary',
      amount: 75000,
      description: 'Monthly Corporate Salary',
    },
    {
      id: 'tx-2',
      date: `${year}-${month}-03`,
      type: 'Expense',
      category: 'Utilities',
      amount: 3200,
      description: 'Electricity & Broadband Bill',
    },
    {
      id: 'tx-3',
      date: `${year}-${month}-05`,
      type: 'Expense',
      category: 'Food/Beverages',
      amount: 4800,
      description: 'Monthly Grocery & Provisions',
    },
    {
      id: 'tx-4',
      date: `${year}-${month}-08`,
      type: 'Expense',
      category: 'Gym/Health',
      amount: 2500,
      description: 'Fitness & Health Club',
    },
    {
      id: 'tx-5',
      date: `${year}-${month}-11`,
      type: 'Income',
      category: 'Others',
      amount: 12500,
      description: 'Consulting Advisory Payment',
    },
    {
      id: 'tx-6',
      date: `${year}-${month}-14`,
      type: 'Expense',
      category: 'Shopping',
      amount: 3800,
      description: 'Apparel & Work Accessories',
    },
    {
      id: 'tx-7',
      date: `${year}-${month}-16`,
      type: 'Expense',
      category: 'Travel',
      amount: 2200,
      description: 'Cab & Transit Pass',
    },
    {
      id: 'tx-8',
      date: `${year}-${month}-18`,
      type: 'Expense',
      category: 'Entertainment',
      amount: 1400,
      description: 'Weekend Dining & Streaming',
    },
    {
      id: 'tx-9',
      date: `${year}-${month}-20`,
      type: 'Expense',
      category: 'Investment',
      amount: 15000,
      description: 'Mutual Fund SIP & Deposits',
    },
  ];
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
  if (typeof window === 'undefined') {
    return {
      spreadsheetId: DEFAULT_SPREADSHEET_ID,
      status: 'connected',
    };
  }
  const saved = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  return {
    spreadsheetId: DEFAULT_SPREADSHEET_ID,
    status: 'connected',
    lastSyncedAt: new Date().toISOString(),
  };
}

export function saveStoredConfig(config: SheetConnectionConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(config));
  }
}

export function loadStoredTransactions(): Transaction[] {
  if (typeof window === 'undefined') return getInitialTransactions();
  const saved = localStorage.getItem(LOCAL_STORAGE_TRANSACTIONS_KEY);
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fallback
    }
  }
  const initial = getInitialTransactions();
  localStorage.setItem(LOCAL_STORAGE_TRANSACTIONS_KEY, JSON.stringify(initial));
  return initial;
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
        return parsed;
      }
    } catch {
      // fallback
    }
  }
  const defaults: CategoriesData = {
    incomeCategories: DEFAULT_INCOME_CATEGORIES,
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
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
   */
  async fetchCategories(): Promise<{ data: CategoriesData; fromRemote: boolean }> {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        this.spreadsheetId
      )}/values/Categories!A:B`;

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

      // Process rows, skipping header names if present
      for (let i = 0; i < rows.length; i++) {
        const colA = rows[i][0]?.trim();
        const colB = rows[i][1]?.trim();

        if (i === 0) {
          if (colA && colA.toLowerCase() !== 'income categories' && colA.toLowerCase() !== 'income') {
            incomeCategories.push(colA);
          }
          if (colB && colB.toLowerCase() !== 'expense categories' && colB.toLowerCase() !== 'expense') {
            expenseCategories.push(colB);
          }
          continue;
        }

        if (colA && !incomeCategories.includes(colA)) {
          incomeCategories.push(colA);
        }
        if (colB && !expenseCategories.includes(colB)) {
          expenseCategories.push(colB);
        }
      }

      const result: CategoriesData = {
        incomeCategories: incomeCategories.length > 0 ? incomeCategories : DEFAULT_INCOME_CATEGORIES,
        expenseCategories: expenseCategories.length > 0 ? expenseCategories : DEFAULT_EXPENSE_CATEGORIES,
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

        const date = row[0]?.trim() || new Date().toISOString().split('T')[0];
        const rawType = row[1]?.trim() || 'Expense';
        const type = rawType.toLowerCase() === 'income' ? 'Income' : 'Expense';
        const category = row[2]?.trim() || (type === 'Income' ? 'Salary' : 'Others');
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

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          range: 'Transactions!A:E',
          majorDimension: 'ROWS',
          values: [[tx.date, tx.type, tx.category, tx.amount.toString(), tx.description || '']],
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
          tx.date,
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
   */
  async updateCategories(categories: CategoriesData): Promise<{ success: boolean; fromRemote: boolean }> {
    saveStoredCategories(categories);

    try {
      const maxRows = Math.max(
        categories.incomeCategories.length,
        categories.expenseCategories.length
      );

      const rows: string[][] = [
        ['Income Categories', 'Expense Categories'],
      ];

      for (let i = 0; i < maxRows; i++) {
        rows.push([
          categories.incomeCategories[i] || '',
          categories.expenseCategories[i] || '',
        ]);
      }

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        this.spreadsheetId
      )}/values/Categories!A:B?valueInputOption=USER_ENTERED`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          range: 'Categories!A:B',
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
