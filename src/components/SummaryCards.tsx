import React from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp } from 'lucide-react';

interface SummaryCardsProps {
  totalIncome: number;
  totalExpenses: number;
  totalInvestments?: number;
  netBalance: number;
  compact?: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  totalIncome,
  totalExpenses,
  totalInvestments = 0,
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
  const investmentRate = totalIncome > 0 ? ((totalInvestments / totalIncome) * 100).toFixed(1) : '0.0';

  return (
    <div
      id="summary-cards-container"
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 ${
        compact ? 'gap-2.5' : ''
      }`}
    >
      {/* Net Balance / Unallocated Cash Card */}
      <div
        id="card-net-balance"
        className={`rounded-xl border transition-all ${
          compact ? 'p-3.5' : 'p-4 sm:p-5'
        } ${
          isNetPositive
            ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-100'
            : 'bg-rose-950/20 border-rose-800/40 text-rose-100'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
            Net Savings / Cash
          </span>
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              isNetPositive
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-rose-500/10 text-rose-400'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div
            id="net-balance-value"
            className="text-xl sm:text-2xl lg:text-2xl font-bold tracking-tight text-neutral-100 truncate"
            title={formatCurrency(netBalance)}
          >
            {formatCurrency(netBalance)}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1 truncate">
            {isNetPositive ? 'Income - (Expenses + Invest)' : 'Outflows exceed earnings'}
          </p>
        </div>
      </div>

      {/* Total Income Card */}
      <div
        id="card-total-income"
        className={`rounded-xl border border-neutral-800 bg-neutral-900/60 transition-all ${
          compact ? 'p-3.5' : 'p-4 sm:p-5'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-400">
            Total Income
          </span>
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div
            id="total-income-value"
            className="text-xl sm:text-2xl lg:text-2xl font-bold tracking-tight text-emerald-400 truncate"
            title={formatCurrency(totalIncome)}
          >
            {formatCurrency(totalIncome)}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1 truncate">Cumulative deposits</p>
        </div>
      </div>

      {/* Total Expenses Card */}
      <div
        id="card-total-expenses"
        className={`rounded-xl border border-neutral-800 bg-neutral-900/60 transition-all ${
          compact ? 'p-3.5' : 'p-4 sm:p-5'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-rose-400">
            Total Expenses
          </span>
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <ArrowDownRight className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div
            id="total-expenses-value"
            className="text-xl sm:text-2xl lg:text-2xl font-bold tracking-tight text-rose-400 truncate"
            title={formatCurrency(totalExpenses)}
          >
            {formatCurrency(totalExpenses)}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1 truncate">Living &amp; lifestyle spending</p>
        </div>
      </div>

      {/* Total Investments Card */}
      <div
        id="card-total-investments"
        className={`rounded-xl border border-neutral-800 bg-neutral-900/60 transition-all ${
          compact ? 'p-3.5' : 'p-4 sm:p-5'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-violet-400">
            Investments
          </span>
          <div className="w-7 h-7 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div
            id="total-investments-value"
            className="text-xl sm:text-2xl lg:text-2xl font-bold tracking-tight text-violet-400 truncate"
            title={formatCurrency(totalInvestments)}
          >
            {formatCurrency(totalInvestments)}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1 truncate">
            {investmentRate}% of income invested
          </p>
        </div>
      </div>
    </div>
  );
};
