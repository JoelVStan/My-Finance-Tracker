import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Search, Filter, Trash2, Calendar, FileText } from 'lucide-react';
import { getDateTimestamp, formatToDDMMYYYY } from '../utils/dateUtils';

interface RecentTransactionsProps {
  transactions: Transaction[];
  onDeleteTransaction?: (id: string) => void;
  limit?: number;
  showControls?: boolean;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  onDeleteTransaction,
  limit,
  showControls = true,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'All' | TransactionType>('All');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Filtered and sorted transactions (newest date first)
  const filteredList = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (typeFilter !== 'All' && tx.type !== typeFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchDesc = tx.description.toLowerCase().includes(q);
          const matchCat = tx.category.toLowerCase().includes(q);
          const matchDate = tx.date.includes(q);
          if (!matchDesc && !matchCat && !matchDate) return false;
        }
        return true;
      })
      .sort((a, b) => getDateTimestamp(b.date) - getDateTimestamp(a.date));
  }, [transactions, typeFilter, searchQuery]);

  const displayedList = limit ? filteredList.slice(0, limit) : filteredList;

  const confirmDelete = () => {
    if (deleteTargetId && onDeleteTransaction) {
      onDeleteTransaction(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  return (
    <div
      id="recent-transactions-card"
      className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 flex flex-col justify-between"
    >
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-neutral-400" />
            Recent Activity
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Log from &quot;Transactions&quot; tab ({transactions.length} total entries)
          </p>
        </div>

        {showControls && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-500" />
              <input
                type="text"
                placeholder="Search category or note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-600 w-44"
              />
            </div>

            {/* Type Filter Buttons */}
            <div className="inline-flex rounded-lg bg-neutral-950 p-0.5 border border-neutral-800">
              {(['All', 'Income', 'Expense', 'Investment'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                    typeFilter === t
                      ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Deletion */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-neutral-700 bg-neutral-900 p-5 shadow-2xl">
            <h4 className="text-sm font-semibold text-neutral-100">Confirm Deletion</h4>
            <p className="text-xs text-neutral-300 mt-2">
              Are you sure you want to remove this transaction entry? This will update the local state
              and active spreadsheet log.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-3 py-1.5 rounded-lg border border-neutral-700 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors"
              >
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-neutral-800 text-neutral-400 uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-3 font-medium">Date</th>
              <th className="py-2.5 px-3 font-medium">Type</th>
              <th className="py-2.5 px-3 font-medium">Category</th>
              <th className="py-2.5 px-3 font-medium">Description</th>
              <th className="py-2.5 px-3 font-medium text-right">Amount</th>
              {onDeleteTransaction && <th className="py-2.5 px-2 text-right"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60 text-neutral-200">
            {displayedList.length === 0 ? (
              <tr>
                <td
                  colSpan={onDeleteTransaction ? 6 : 5}
                  className="py-8 text-center text-neutral-500 text-xs"
                >
                  No transactions found matching your criteria.
                </td>
              </tr>
            ) : (
              displayedList.map((tx) => {
                const isIncome = tx.type === 'Income';
                const isInvestment = tx.type === 'Investment';
                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-neutral-800/40 transition-colors group"
                  >
                    {/* Date (DD-MM-YYYY) */}
                    <td className="py-2.5 px-3 font-mono text-neutral-300 whitespace-nowrap">
                      {formatToDDMMYYYY(tx.date)}
                    </td>

                    {/* Type Badge */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                          isIncome
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                            : isInvestment
                            ? 'bg-violet-950/60 text-violet-400 border border-violet-800/40'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                        }`}
                      >
                        {isIncome ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : isInvestment ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {tx.type}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-2.5 px-3 font-medium text-neutral-200 whitespace-nowrap">
                      {tx.category}
                    </td>

                    {/* Description */}
                    <td className="py-2.5 px-3 text-neutral-300 max-w-xs truncate" title={tx.description}>
                      {tx.description || '—'}
                    </td>

                    {/* Amount */}
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-semibold whitespace-nowrap ${
                        isIncome
                          ? 'text-emerald-400'
                          : isInvestment
                          ? 'text-violet-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {isIncome ? '+' : isInvestment ? '↗' : '-'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Action */}
                    {onDeleteTransaction && (
                      <td className="py-2.5 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => setDeleteTargetId(tx.id)}
                          className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition-colors opacity-60 group-hover:opacity-100"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
