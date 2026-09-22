export type TransactionType = 'Income' | 'Expense';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  category: string;
  amount: number;
  description: string;
}

export interface CategoriesData {
  incomeCategories: string[]; // Column A from "Categories" tab
  expenseCategories: string[]; // Column B from "Categories" tab
}

export type MobileTab = 'home' | 'add' | 'analysis' | 'history';

export type TrendPeriod = 'daily' | 'monthly';

export interface SheetConnectionConfig {
  spreadsheetId: string;
  accessToken?: string;
  lastSyncedAt?: string | null;
  status: 'connected' | 'syncing' | 'offline_cached' | 'error' | 'idle';
  errorMessage?: string;
}
