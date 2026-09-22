import React from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';

interface SummaryCardsProps {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  compact?: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  totalIncome,
  totalExpenses,
  netBalance,
  compact = false,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const isNetPositive = netBalance >= 0;

  return (
    <div id="summary-cards-container" className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Net Balance Card */}
      <div
        id="card-net-balance"
        className={`rounded-xl border transition-all ${
          compact ? 'p-4' : 'p-5'
        } ${
          isNetPositive
            ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-100'
            : 'bg-rose-950/20 border-rose-800/40 text-rose-100'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
            Net Balance
          </span>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isNetPositive
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-rose-500/10 text-rose-400'
            }`}
          >
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div
            id="net-balance-value"
            className="text-2xl lg:text-3xl font-bold tracking-tight text-neutral-100"
          >
            {formatCurrency(netBalance)}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {isNetPositive ? 'Positive net cashflow' : 'Expenditures exceed earnings'}
          </p>
        </div>
      </div>

      {/* Total Income Card */}
      <div
        id="card-total-income"
        className={`rounded-xl border border-neutral-800 bg-neutral-900/60 transition-all ${
          compact ? 'p-4' : 'p-5'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">
            Total Income
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div
            id="total-income-value"
            className="text-2xl lg:text-3xl font-bold tracking-tight text-emerald-400"
          >
            {formatCurrency(totalIncome)}
          </div>
          <p className="text-xs text-neutral-400 mt-1">Cumulative received deposits</p>
        </div>
      </div>

      {/* Total Expenses Card */}
      <div
        id="card-total-expenses"
        className={`rounded-xl border border-neutral-800 bg-neutral-900/60 transition-all ${
          compact ? 'p-4' : 'p-5'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-rose-400">
            Total Expenses
          </span>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <ArrowDownRight className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div
            id="total-expenses-value"
            className="text-2xl lg:text-3xl font-bold tracking-tight text-rose-400"
          >
            {formatCurrency(totalExpenses)}
          </div>
          <p className="text-xs text-neutral-400 mt-1">Cumulative logged outflows</p>
        </div>
      </div>
    </div>
  );
};
