import React, { useState } from 'react';
import { CategoriesData } from '../types';
import { X, Plus, Trash2, Tag, Check, RefreshCw, TrendingUp } from 'lucide-react';
import { DEFAULT_INVESTMENT_CATEGORIES } from '../services/googleSheetsService';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoriesData;
  onSaveCategories: (newCategories: CategoriesData) => Promise<void>;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSaveCategories,
}) => {
  const [incomeList, setIncomeList] = useState<string[]>(categories.incomeCategories);
  const [expenseList, setExpenseList] = useState<string[]>(categories.expenseCategories);
  const [investmentList, setInvestmentList] = useState<string[]>(
    categories.investmentCategories && categories.investmentCategories.length > 0
      ? categories.investmentCategories
      : DEFAULT_INVESTMENT_CATEGORIES
  );
  const [newIncome, setNewIncome] = useState<string>('');
  const [newExpense, setNewExpense] = useState<string>('');
  const [newInvestment, setNewInvestment] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newIncome.trim();
    if (val && !incomeList.includes(val)) {
      setIncomeList([...incomeList, val]);
      setNewIncome('');
    }
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newExpense.trim();
    if (val && !expenseList.includes(val)) {
      setExpenseList([...expenseList, val]);
      setNewExpense('');
    }
  };

  const handleAddInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newInvestment.trim();
    if (val && !investmentList.includes(val)) {
      setInvestmentList([...investmentList, val]);
      setNewInvestment('');
    }
  };

  const handleRemoveIncome = (cat: string) => {
    setIncomeList(incomeList.filter((c) => c !== cat));
  };

  const handleRemoveExpense = (cat: string) => {
    setExpenseList(expenseList.filter((c) => c !== cat));
  };

  const handleRemoveInvestment = (cat: string) => {
    setInvestmentList(investmentList.filter((c) => c !== cat));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSaveCategories({
        incomeCategories: incomeList,
        expenseCategories: expenseList,
        investmentCategories: investmentList,
      });
      setStatusMessage('Categories successfully synced to "Categories" tab (Columns A, B & C)!');
      setTimeout(() => {
        setStatusMessage(null);
        onClose();
      }, 1200);
    } catch {
      setStatusMessage('Failed to sync categories. Saved locally.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        id="category-manager-modal"
        className="w-full max-w-4xl rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl my-8 max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-100">
                Manage Dynamic Categories
              </h3>
              <p className="text-xs text-neutral-400">
                Maps to Google Sheets &quot;Categories&quot; tab: Column A (Income), Column B (Expense), Column C (Investment)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMessage && (
          <div className="mb-4 p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{statusMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto pr-1 flex-1">
          {/* Income Categories (Column A) */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Income ({incomeList.length})
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">Column A</span>
            </div>

            <form onSubmit={handleAddIncome} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="New Income..."
                value={newIncome}
                onChange={(e) => setNewIncome(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </form>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {incomeList.map((cat) => (
                <div
                  key={cat}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-neutral-900/80 border border-neutral-800/80 text-xs text-neutral-200"
                >
                  <span>{cat}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveIncome(cat)}
                    disabled={incomeList.length <= 1}
                    className="text-neutral-500 hover:text-rose-400 p-0.5 disabled:opacity-30"
                    title="Remove category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Expense Categories (Column B) */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800">
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                Expenses ({expenseList.length})
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">Column B</span>
            </div>

            <form onSubmit={handleAddExpense} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="New Expense..."
                value={newExpense}
                onChange={(e) => setNewExpense(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </form>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {expenseList.map((cat) => (
                <div
                  key={cat}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-neutral-900/80 border border-neutral-800/80 text-xs text-neutral-200"
                >
                  <span>{cat}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveExpense(cat)}
                    disabled={expenseList.length <= 1}
                    className="text-neutral-500 hover:text-rose-400 p-0.5 disabled:opacity-30"
                    title="Remove category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Investment Categories (Column C) */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800">
              <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
                Investments ({investmentList.length})
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">Column C</span>
            </div>

            <form onSubmit={handleAddInvestment} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="New Investment..."
                value={newInvestment}
                onChange={(e) => setNewInvestment(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </form>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {investmentList.map((cat) => (
                <div
                  key={cat}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-neutral-900/80 border border-neutral-800/80 text-xs text-neutral-200"
                >
                  <span>{cat}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveInvestment(cat)}
                    disabled={investmentList.length <= 1}
                    className="text-neutral-500 hover:text-violet-400 p-0.5 disabled:opacity-30"
                    title="Remove category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 border-t border-neutral-800 pt-4 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-neutral-700 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all flex items-center gap-2"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {isSaving ? 'Syncing to Sheet...' : 'Save & Update Columns A, B & C'}
          </button>
        </div>
      </div>
    </div>
  );
};
