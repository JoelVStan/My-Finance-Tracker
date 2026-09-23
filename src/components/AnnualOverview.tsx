import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { getTransactionYear, getDistinctYears } from '../utils/dateUtils';
import {
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Wallet,
  CheckCircle2,
  FileSpreadsheet,
  ChevronRight,
  BarChart3,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

interface AnnualOverviewProps {
  transactions: Transaction[];
  selectedYear: number | 'ALL';
  onSelectYear: (year: number | 'ALL') => void;
  spreadsheetId?: string;
}

export interface YearStats {
  year: number;
  income: number;
  expense: number;
  investment: number;
  net: number;
  count: number;
  savingsRate: number; // ((Income - Expense) / Income) * 100
  investmentRate: number; // (Investment / Income) * 100
}

export const AnnualOverview: React.FC<AnnualOverviewProps> = ({
  transactions,
  selectedYear,
  onSelectYear,
  spreadsheetId,
}) => {
  const [showGuide, setShowGuide] = React.useState<boolean>(false);

  // Compute year-by-year statistics
  const { yearlyData, chartData } = useMemo(() => {
    const years = getDistinctYears(transactions.map((t) => t.date));
    const statsMap: Record<number, { income: number; expense: number; investment: number; count: number }> = {};

    years.forEach((yr) => {
      statsMap[yr] = { income: 0, expense: 0, investment: 0, count: 0 };
    });

    transactions.forEach((tx) => {
      const yr = getTransactionYear(tx.date);
      if (yr && statsMap[yr]) {
        statsMap[yr].count += 1;
        if (tx.type === 'Income') {
          statsMap[yr].income += tx.amount;
        } else if (tx.type === 'Investment') {
          statsMap[yr].investment += tx.amount;
        } else {
          statsMap[yr].expense += tx.amount;
        }
      }
    });

    const list: YearStats[] = years.map((yr) => {
      const data = statsMap[yr];
      const net = data.income - data.expense - data.investment;
      const savingsRate = data.income > 0 ? Math.max(0, ((data.income - data.expense) / data.income) * 100) : 0;
      const investmentRate = data.income > 0 ? (data.investment / data.income) * 100 : 0;

      return {
        year: yr,
        income: data.income,
        expense: data.expense,
        investment: data.investment,
        net,
        count: data.count,
        savingsRate,
        investmentRate,
      };
    });

    // Chart data ordered chronologically (oldest to newest for natural bar progression)
    const cData = [...list]
      .sort((a, b) => a.year - b.year)
      .map((item) => ({
        year: String(item.year),
        Income: item.income,
        Expense: item.expense,
        Investment: item.investment,
        Net: item.net,
      }));

    return { yearlyData: list, chartData: cData };
  }, [transactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div id="annual-overview-container" className="space-y-6">
      {/* Header and Quick Guide Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 sm:p-5">
        <div>
          <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            Year-over-Year (YoY) Annual Comparison
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Compare annual income, living expenses, investments, and net savings rate across all years.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-200 hover:text-emerald-300 hover:border-emerald-500/50 transition-all self-start sm:self-auto cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>{showGuide ? 'Hide Guide' : 'How to Add Previous Years'}</span>
        </button>
      </div>

      {/* Guide Card (Collapsible) */}
      {showGuide && (
        <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-5 space-y-4">
          <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
            <FileSpreadsheet className="w-4 h-4" />
            How to Add Historical Data (2025, 2024, 2023, etc.)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-neutral-300">
            {/* Option 1: Google Sheet Bulk */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-4 space-y-2">
              <span className="font-semibold text-emerald-400 block text-sm">
                Method 1: Direct in Google Sheets (Recommended for Bulk Past Data)
              </span>
              <p className="text-neutral-400">
                If you have dozens or hundreds of previous transactions from bank statements or Excel:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-neutral-300 ml-1">
                <li>
                  Click <strong className="text-neutral-100">Open in Google Sheets</strong> in the top navbar.
                  {spreadsheetId && spreadsheetId !== 'personal-finances-tracker-sheet' && (
                    <div className="mt-1.5">
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm"
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                        <span>Open Your Google Sheet</span>
                        <ChevronRight className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </li>
                <li>
                  Switch to the <strong className="text-neutral-100">Transactions</strong> tab.
                </li>
                <li>
                  Paste or type rows with:
                  <div className="mt-1 font-mono text-[11px] bg-neutral-950 px-2 py-1 rounded border border-neutral-800 text-emerald-300">
                    Date (DD-MM-YYYY) | Type (Income/Expense/Investment) | Category | Amount | Description
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-1">
                    Example: <code className="text-neutral-200">14-06-2025 | Expense | Shopping | 2500 | Clothes</code>
                  </div>
                </li>
                <li>
                  Return to this app and tap <strong className="text-emerald-400">Sync</strong>. All historical years instantly appear in your filters and charts!
                </li>
              </ol>
            </div>

            {/* Option 2: In-App */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-4 space-y-2">
              <span className="font-semibold text-emerald-400 block text-sm">
                Method 2: One-by-One in the App
              </span>
              <p className="text-neutral-400">
                You can add individual historical records anytime right from the app:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-neutral-300 ml-1">
                <li>Open the transaction form (<strong className="text-neutral-100">Add New</strong>).</li>
                <li>
                  Tap the <strong className="text-neutral-100">Date</strong> field to open the calendar picker.
                </li>
                <li>Select any past year and date (e.g. May 2024 or November 2025).</li>
                <li>Enter the category and amount, then submit. It automatically syncs into your Google Sheet!</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Visual YoY Bar Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Annual Financial Volumes (Income vs Expenses vs Investments)
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Side-by-side annual comparison of total money inflows and outflows
              </p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="year" stroke="#737373" tick={{ fill: '#a3a3a3', fontSize: 12 }} />
                <YAxis
                  stroke="#737373"
                  tick={{ fill: '#a3a3a3', fontSize: 11 }}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border border-neutral-800 bg-neutral-950/95 p-3 shadow-xl text-xs space-y-1.5 backdrop-blur-md">
                          <p className="font-bold text-neutral-200 border-b border-neutral-800 pb-1">
                            Year {label}
                          </p>
                          {payload.map((entry, index) => (
                            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
                              <span style={{ color: entry.color }} className="font-medium">
                                {entry.name}:
                              </span>
                              <span className="font-bold text-neutral-100">
                                {formatCurrency(entry.value as number)}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => <span className="text-xs text-neutral-300 font-medium">{value}</span>}
                />
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={45} />
                <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={45} />
                <Bar dataKey="Investment" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Year-by-Year Cards / Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-200 flex items-center justify-between">
          <span>Annual Ledger Breakdown</span>
          <span className="text-xs font-normal text-neutral-400">
            Click any year to filter the entire dashboard
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {yearlyData.map((item) => {
            const isSelected = selectedYear === item.year;
            return (
              <div
                key={item.year}
                onClick={() => onSelectYear(item.year)}
                className={`rounded-xl border p-4 sm:p-5 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-neutral-900 border-emerald-500/80 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                    : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
                }`}
              >
                <div>
                  {/* Top: Year and Selection Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-neutral-100">{item.year}</span>
                      {isSelected && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Active Filter
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-neutral-400">{item.count} transactions</span>
                  </div>

                  {/* Metrics Grid */}
                  <div className="space-y-2 pt-2 border-t border-neutral-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <ArrowUpRight className="w-3.5 h-3.5" /> Total Income
                      </span>
                      <span className="font-semibold text-emerald-400">{formatCurrency(item.income)}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-rose-400 flex items-center gap-1">
                        <ArrowDownRight className="w-3.5 h-3.5" /> Total Expenses
                      </span>
                      <span className="font-semibold text-rose-400">{formatCurrency(item.expense)}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-violet-400 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" /> Investments
                      </span>
                      <span className="font-semibold text-violet-400">
                        {formatCurrency(item.investment)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-neutral-800/80">
                      <span className="text-neutral-300 font-medium flex items-center gap-1">
                        <Wallet className="w-3.5 h-3.5 text-neutral-400" /> Net Savings
                      </span>
                      <span
                        className={`font-bold ${
                          item.net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatCurrency(item.net)}
                      </span>
                    </div>
                  </div>

                  {/* Rates */}
                  <div className="mt-3 pt-2.5 border-t border-neutral-800/60 grid grid-cols-2 gap-2 text-[11px] text-neutral-400">
                    <div className="bg-neutral-950/60 p-2 rounded border border-neutral-800/80">
                      <span className="block text-neutral-500">Savings Rate</span>
                      <span className="font-bold text-neutral-200">{item.savingsRate.toFixed(1)}%</span>
                    </div>
                    <div className="bg-neutral-950/60 p-2 rounded border border-neutral-800/80">
                      <span className="block text-neutral-500">Invest Rate</span>
                      <span className="font-bold text-violet-300">{item.investmentRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Footer action */}
                <div className="mt-4 pt-2 flex items-center justify-between text-xs font-medium text-emerald-400">
                  <span>{isSelected ? 'Currently viewing' : 'Filter dashboard to ' + item.year}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
