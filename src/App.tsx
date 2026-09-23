import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Transaction,
  CategoriesData,
  MobileTab,
  TransactionType,
  SheetConnectionConfig,
} from './types';
import {
  GoogleSheetsService,
  loadStoredTransactions,
  saveStoredTransactions,
  loadStoredCategories,
  saveStoredCategories,
  loadStoredConfig,
  saveStoredConfig,
  getPersistentSpreadsheetId,
  setPersistentSpreadsheetId,
} from './services/googleSheetsService';
import { SummaryCards } from './components/SummaryCards';
import { ExpensePieChart } from './components/ExpensePieChart';
import { TrendLineChart } from './components/TrendLineChart';
import { TransactionForm } from './components/TransactionForm';
import { RecentTransactions } from './components/RecentTransactions';
import { AnnualOverview } from './components/AnnualOverview';
import { MobileNav } from './components/MobileNav';
import { SheetStatusBar } from './components/SheetStatusBar';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { GoogleAuthButton } from './components/GoogleAuthButton';
import { LoginPage } from './components/LoginPage';
import { User } from 'firebase/auth';
import {
  initAuth,
  getCachedAccessToken,
  googleSignOut,
  findExistingFinancesSpreadsheet,
} from './services/authService';
import { getTransactionYear, getDistinctYears } from './utils/dateUtils';
import {
  Plus,
  Minus,
  TrendingUp,
  Wallet,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  ExternalLink,
  Loader2,
  LogOut,
  Calendar,
  BarChart3,
  Layers,
} from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<SheetConnectionConfig>(loadStoredConfig);
  const [categories, setCategories] = useState<CategoriesData>(loadStoredCategories);
  const [transactions, setTransactions] = useState<Transaction[]>(loadStoredTransactions);
  const [mobileTab, setMobileTab] = useState<MobileTab>('home');
  const [formInitialType, setFormInitialType] = useState<TransactionType>('Expense');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(getCachedAccessToken());
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>('ALL');
  const [dashboardView, setDashboardView] = useState<'dashboard' | 'annual'>('dashboard');
  const [mobileAnalysisView, setMobileAnalysisView] = useState<'charts' | 'annual'>('charts');
  const isDeletingRef = useRef(false);

  // Initialize service
  const sheetsService = useMemo(() => {
    return new GoogleSheetsService(config.spreadsheetId, config.accessToken || null);
  }, [config.spreadsheetId, config.accessToken]);

  // Synchronize with Google Sheets REST API
  const syncWithSheet = useCallback(async () => {
    if (isDeletingRef.current) return;
    try {
      const [catResult, txResult] = await Promise.all([
        sheetsService.fetchCategories(),
        sheetsService.fetchTransactions(),
      ]);

      if (catResult.data) {
        setCategories(catResult.data);
      }
      if (txResult.fromRemote) {
        setTransactions(txResult.data);
      } else if (txResult.data && txResult.data.length > 0) {
        setTransactions(txResult.data);
      }

      setConfig((prev) => {
        const next = {
          ...prev,
          lastSyncedAt: new Date().toISOString(),
          status: 'connected' as const,
        };
        saveStoredConfig(next);
        return next;
      });
    } catch (err) {
      console.warn('Sync encounter notice:', err);
    }
  }, [sheetsService]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (authUser, token) => {
        setUser(authUser);
        setAccessToken(token);
        setAuthLoading(false);

        const savedSheetId = getPersistentSpreadsheetId(authUser.email, authUser.uid);

        setConfig((prev) => {
          const effectiveSheetId = prev.spreadsheetId || savedSheetId;
          const next = {
            ...prev,
            spreadsheetId: effectiveSheetId,
            accessToken: token,
            status: 'connected' as const,
          };
          saveStoredConfig(next, authUser.email, authUser.uid);
          return next;
        });

        // If no spreadsheet ID is stored locally, discover automatically from user's Drive
        if (!savedSheetId) {
          findExistingFinancesSpreadsheet(token).then((discoveredId) => {
            if (discoveredId) {
              setPersistentSpreadsheetId(discoveredId, authUser.email, authUser.uid);
              setConfig((prev) => {
                const next = {
                  ...prev,
                  spreadsheetId: discoveredId,
                  status: 'connected' as const,
                };
                saveStoredConfig(next, authUser.email, authUser.uid);
                return next;
              });
            }
          });
        }
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setTransactions([]);
        setAuthLoading(false);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Initial load and automated background synchronization (only when user is authenticated)
  useEffect(() => {
    if (!user || !accessToken) return;

    // Initial sync
    syncWithSheet();

    // Auto-sync whenever user focuses or switches back to this tab after editing in Google Sheets
    const onFocus = () => {
      syncWithSheet();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncWithSheet();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Continuous background polling (every 10s) to automatically catch edits made in Google Sheets
    const intervalId = setInterval(() => {
      syncWithSheet();
    }, 10000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(intervalId);
    };
  }, [user, accessToken, syncWithSheet]);

  // Available distinct years from recorded transactions (includes current calendar year)
  const availableYears = useMemo(() => {
    return getDistinctYears(transactions.map((t) => t.date));
  }, [transactions]);

  // Transactions filtered by selected year (or all if 'ALL')
  const filteredTransactions = useMemo(() => {
    if (selectedYear === 'ALL') return transactions;
    return transactions.filter((tx) => getTransactionYear(tx.date) === selectedYear);
  }, [transactions, selectedYear]);

  // Financial summary calculations
  const { totalIncome, totalExpenses, totalInvestments, netBalance } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    let inv = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.type === 'Income') {
        inc += tx.amount;
      } else if (tx.type === 'Investment') {
        inv += tx.amount;
      } else {
        exp += tx.amount;
      }
    });

    return {
      totalIncome: inc,
      totalExpenses: exp,
      totalInvestments: inv,
      netBalance: inc - exp - inv,
    };
  }, [filteredTransactions]);

  // Handler: Add new transaction
  const handleAddTransaction = async (newTxData: {
    date: string;
    type: TransactionType;
    category: string;
    amount: number;
    description: string;
  }) => {
    const newTx: Transaction = {
      ...newTxData,
      id: `tx-${Date.now()}`,
    };

    // Optimistically update state
    const nextList = [newTx, ...transactions];
    setTransactions(nextList);
    saveStoredTransactions(nextList);

    // Call Google Sheets REST API append endpoint
    await sheetsService.appendTransaction(newTxData);

    // If on mobile and in 'add' tab, switch back to 'home' after adding
    if (mobileTab === 'add') {
      setTimeout(() => {
        setMobileTab('home');
      }, 500);
    }
  };

  // Handler: Delete transaction
  const handleDeleteTransaction = async (id: string) => {
    isDeletingRef.current = true;
    const nextList = transactions.filter((t) => t.id !== id);
    setTransactions(nextList);
    saveStoredTransactions(nextList);

    try {
      await sheetsService.deleteTransaction(nextList);
      setConfig((prev) => {
        const next = {
          ...prev,
          lastSyncedAt: new Date().toISOString(),
        };
        saveStoredConfig(next);
        return next;
      });
    } catch (err) {
      console.error('Failed to sync deletion with Google Sheets:', err);
    } finally {
      setTimeout(() => {
        isDeletingRef.current = false;
      }, 1500);
    }
  };

  // Handler: Save Categories from modal
  const handleSaveCategories = async (newCategories: CategoriesData) => {
    setCategories(newCategories);
    saveStoredCategories(newCategories);
    await sheetsService.updateCategories(newCategories);
  };

  // Handler: Full sign out and privacy wipe
  const handleSignOut = useCallback(async () => {
    await googleSignOut();
    setUser(null);
    setAccessToken(null);
    setTransactions([]);
    setCategories({ incomeCategories: [], expenseCategories: [], investmentCategories: [] });
    // Keep the last linked spreadsheetId in config so it remains available immediately upon next login
    setConfig((prev) => ({
      spreadsheetId: prev.spreadsheetId || getPersistentSpreadsheetId(),
      accessToken: undefined,
      status: 'idle',
      lastSyncedAt: null,
    }));
  }, []);

  // Mobile Jump to Income
  const handleMobileJumpIncome = () => {
    setFormInitialType('Income');
    setMobileTab('add');
  };

  // Mobile Jump to Expense
  const handleMobileJumpExpense = () => {
    setFormInitialType('Expense');
    setMobileTab('add');
  };

  // Mobile Jump to Investment
  const handleMobileJumpInvestment = () => {
    setFormInitialType('Investment');
    setMobileTab('add');
  };

  // Gatekeeper: Authenticating
  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="text-xs text-neutral-400 font-medium tracking-wide">Loading session...</span>
      </div>
    );
  }

  // Gatekeeper: Not authenticated -> Show clean private login page
  if (!user) {
    return (
      <LoginPage
        onAuthSuccess={(authUser, token) => {
          setUser(authUser);
          setAccessToken(token);
          const savedSheetId = getPersistentSpreadsheetId(authUser.email, authUser.uid);
          setConfig((prev) => {
            const effectiveSheetId = prev.spreadsheetId || savedSheetId;
            const next = {
              ...prev,
              spreadsheetId: effectiveSheetId,
              accessToken: token,
              status: 'connected' as const,
            };
            saveStoredConfig(next, authUser.email, authUser.uid);
            return next;
          });

          // Discover from Drive if nothing found locally
          if (!savedSheetId) {
            findExistingFinancesSpreadsheet(token).then((discoveredId) => {
              if (discoveredId) {
                setPersistentSpreadsheetId(discoveredId, authUser.email, authUser.uid);
                setConfig((prev) => {
                  const next = {
                    ...prev,
                    spreadsheetId: discoveredId,
                    status: 'connected' as const,
                  };
                  saveStoredConfig(next, authUser.email, authUser.uid);
                  return next;
                });
              }
            });
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Navbar */}
      <header className="border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-neutral-100 tracking-tight flex items-center gap-2">
                Income &amp; Expense Tracker
              </h1>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                Powered by Google Sheets REST API
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Link to Google Sheets (Excel View) */}
            <a
              href={
                config.spreadsheetId && config.spreadsheetId !== 'personal-finances-tracker-sheet'
                  ? `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`
                  : '#google-workspace-auth-section'
              }
              target={
                config.spreadsheetId && config.spreadsheetId !== 'personal-finances-tracker-sheet'
                  ? '_blank'
                  : undefined
              }
              rel="noopener noreferrer"
              id="top-nav-google-sheet-link"
              onClick={(e) => {
                if (
                  !config.spreadsheetId ||
                  config.spreadsheetId === 'personal-finances-tracker-sheet'
                ) {
                  const authSec = document.getElementById('google-workspace-auth-section');
                  if (authSec) {
                    authSec.scrollIntoView({ behavior: 'smooth' });
                  }
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:text-emerald-100 hover:bg-emerald-900/50 hover:border-emerald-400 transition-all shadow-sm"
              title="Open Google Spreadsheet (Excel format in Google Sheets)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Open in</span>
              <span>Google Sheets</span>
            </a>

            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-800 bg-neutral-900/90 text-neutral-300 hover:text-neutral-100 hover:border-neutral-700 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Categories</span>
            </button>

            <button
              type="button"
              id="top-nav-signout-btn"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-800 bg-neutral-900/90 text-neutral-300 hover:text-rose-400 hover:border-rose-900/60 transition-colors cursor-pointer"
              title="Sign out and lock application"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
        {/* Google Workspace Authentication & Sheet Setup Bar */}
        <div className="mb-4">
          <GoogleAuthButton
            user={user}
            accessToken={accessToken}
            currentSpreadsheetId={config.spreadsheetId}
            onAuthSuccess={(authUser, token) => {
              setUser(authUser);
              setAccessToken(token);
              setConfig((prev) => {
                const next = { ...prev, accessToken: token, status: 'connected' as const };
                saveStoredConfig(next);
                return next;
              });
              syncWithSheet();
            }}
            onSignOut={handleSignOut}
            onSelectSpreadsheet={(newId) => {
              setPersistentSpreadsheetId(newId, user?.email, user?.uid);
              setConfig((prev) => {
                const next = {
                  ...prev,
                  spreadsheetId: newId,
                  status: 'connected' as const,
                  lastSyncedAt: new Date().toISOString(),
                };
                saveStoredConfig(next, user?.email, user?.uid);
                return next;
              });
              setTimeout(() => syncWithSheet(), 300);
            }}
          />
        </div>

        {/* Connection status bar */}
        <SheetStatusBar
          config={config}
          onRefresh={syncWithSheet}
          onUpdateConfig={(newCfg) => {
            setConfig(newCfg);
            saveStoredConfig(newCfg);
          }}
          openCategoryManager={() => setIsCategoryModalOpen(true)}
        />

        {/* Global Year Filter & View Switcher Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 sm:px-4 mb-6 shadow-sm">
          {/* Year Pills Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 shrink-0 mr-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Year:</span>
            </div>

            {/* All Time Pill */}
            <button
              type="button"
              onClick={() => setSelectedYear('ALL')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all shrink-0 cursor-pointer ${
                selectedYear === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800/80 hover:border-neutral-700'
              }`}
            >
              All Time ({transactions.length})
            </button>

            {/* Individual Year Pills */}
            {availableYears.map((yr) => {
              const countInYr = transactions.filter((t) => getTransactionYear(t.date) === yr).length;
              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all shrink-0 cursor-pointer ${
                    selectedYear === yr
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                      : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800/80 hover:border-neutral-700'
                  }`}
                >
                  {yr} {countInYr > 0 ? `(${countInYr})` : ''}
                </button>
              );
            })}
          </div>

          {/* Desktop View Switcher: Dashboard vs Annual YoY Review */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <div className="inline-flex rounded-lg bg-neutral-950 p-0.5 border border-neutral-800">
              <button
                type="button"
                onClick={() => setDashboardView('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  dashboardView === 'dashboard'
                    ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => setDashboardView('annual')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  dashboardView === 'annual'
                    ? 'bg-neutral-800 text-emerald-300 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Annual Review (YoY)</span>
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* DESKTOP VIEW: Unified Dashboard Grid or Annual YoY View  */}
        {/* ======================================================== */}
        <div className="hidden md:block">
          {dashboardView === 'annual' ? (
            <AnnualOverview
              transactions={transactions}
              selectedYear={selectedYear}
              onSelectYear={(yr) => {
                setSelectedYear(yr);
                setDashboardView('dashboard');
              }}
              spreadsheetId={config.spreadsheetId}
            />
          ) : (
            <div className="flex flex-col space-y-6">
              {/* Top Row: Summary Cards */}
              <SummaryCards
                totalIncome={totalIncome}
                totalExpenses={totalExpenses}
                totalInvestments={totalInvestments}
                netBalance={netBalance}
                periodLabel={selectedYear === 'ALL' ? 'All Time' : String(selectedYear)}
              />

              {/* Middle Row: Both Analysis Charts Side-by-Side */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-5 flex flex-col">
                  <ExpensePieChart
                    transactions={filteredTransactions}
                    expenseCategories={categories.expenseCategories}
                    investmentCategories={categories.investmentCategories}
                    height={260}
                  />
                </div>
                <div className="lg:col-span-7 flex flex-col">
                  <TrendLineChart transactions={filteredTransactions} height={260} />
                </div>
              </div>

              {/* Bottom Row: Input Form + Recent Activity Table */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-4">
                  <TransactionForm
                    categories={categories}
                    initialType="Expense"
                    onSubmit={handleAddTransaction}
                  />
                </div>
                <div className="lg:col-span-8">
                  <RecentTransactions
                    transactions={filteredTransactions}
                    onDeleteTransaction={handleDeleteTransaction}
                    limit={15}
                    showControls={true}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* MOBILE VIEW: Tab-driven with sticky bottom navigation     */}
        {/* ======================================================== */}
        <div className="md:hidden space-y-5">
          {/* MOBILE TAB: HOME */}
          {mobileTab === 'home' && (
            <div className="space-y-4">
              {/* Large, easy-to-tap quick action buttons right at top */}
              <div
                id="mobile-quick-actions"
                className="grid grid-cols-3 gap-2 p-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800/90 shadow-md"
              >
                {/* Plus (+) Button: Log Income */}
                <button
                  type="button"
                  id="mobile-btn-add-income"
                  onClick={handleMobileJumpIncome}
                  className="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3 px-2 rounded-lg bg-emerald-600 active:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-950/50 transition-transform active:scale-98 min-h-[50px]"
                >
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                  </div>
                  <span>Income</span>
                </button>

                {/* Minus (-) Button: Log Expense */}
                <button
                  type="button"
                  id="mobile-btn-add-expense"
                  onClick={handleMobileJumpExpense}
                  className="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3 px-2 rounded-lg bg-rose-600 active:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-950/50 transition-transform active:scale-98 min-h-[50px]"
                >
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <Minus className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                  </div>
                  <span>Expense</span>
                </button>

                {/* TrendingUp (↗) Button: Log Investment */}
                <button
                  type="button"
                  id="mobile-btn-add-investment"
                  onClick={handleMobileJumpInvestment}
                  className="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3 px-2 rounded-lg bg-violet-600 active:bg-violet-500 text-white font-semibold text-xs shadow-lg shadow-violet-950/50 transition-transform active:scale-98 min-h-[50px]"
                >
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                  </div>
                  <span>Invest</span>
                </button>
              </div>

              {/* Landing Page Summary Cards */}
              <SummaryCards
                totalIncome={totalIncome}
                totalExpenses={totalExpenses}
                totalInvestments={totalInvestments}
                netBalance={netBalance}
                compact={true}
                periodLabel={selectedYear === 'ALL' ? 'All Time' : String(selectedYear)}
              />

              {/* Expense & Investment Pie Chart right away on Home */}
              <ExpensePieChart
                transactions={filteredTransactions}
                expenseCategories={categories.expenseCategories}
                investmentCategories={categories.investmentCategories}
                height={220}
              />

              {/* Recent Activity Quick Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Latest Activity {selectedYear !== 'ALL' ? `(${selectedYear})` : ''}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setMobileTab('history')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <RecentTransactions
                  transactions={filteredTransactions}
                  onDeleteTransaction={handleDeleteTransaction}
                  limit={4}
                  showControls={false}
                />
              </div>
            </div>
          )}

          {/* MOBILE TAB: ADD NEW */}
          {mobileTab === 'add' && (
            <div className="space-y-4">
              <TransactionForm
                categories={categories}
                initialType={formInitialType}
                onSubmit={handleAddTransaction}
                onSuccess={() => {
                  setTimeout(() => setMobileTab('home'), 1000);
                }}
              />
            </div>
          )}

          {/* MOBILE TAB: ANALYSIS */}
          {mobileTab === 'analysis' && (
            <div className="space-y-4">
              {/* Mobile Sub-view Toggle */}
              <div className="flex rounded-xl bg-neutral-900/90 p-1 border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setMobileAnalysisView('charts')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    mobileAnalysisView === 'charts'
                      ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Monthly Charts</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileAnalysisView('annual')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    mobileAnalysisView === 'annual'
                      ? 'bg-neutral-800 text-emerald-300 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Annual Review (YoY)</span>
                </button>
              </div>

              {mobileAnalysisView === 'charts' ? (
                <div className="space-y-5">
                  <ExpensePieChart
                    transactions={filteredTransactions}
                    expenseCategories={categories.expenseCategories}
                    investmentCategories={categories.investmentCategories}
                    height={240}
                  />
                  <TrendLineChart transactions={filteredTransactions} height={260} />
                </div>
              ) : (
                <AnnualOverview
                  transactions={transactions}
                  selectedYear={selectedYear}
                  onSelectYear={(yr) => {
                    setSelectedYear(yr);
                    setMobileAnalysisView('charts');
                  }}
                  spreadsheetId={config.spreadsheetId}
                />
              )}
            </div>
          )}

          {/* MOBILE TAB: HISTORY */}
          {mobileTab === 'history' && (
            <div className="space-y-4">
              <RecentTransactions
                transactions={filteredTransactions}
                onDeleteTransaction={handleDeleteTransaction}
                limit={50}
                showControls={true}
              />
            </div>
          )}
        </div>
      </main>

      {/* Sticky Mobile Navigation Bar */}
      <MobileNav activeTab={mobileTab} onTabChange={setMobileTab} />

      {/* Modal: Category Manager for Columns A & B */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onSaveCategories={handleSaveCategories}
      />
    </div>
  );
}
