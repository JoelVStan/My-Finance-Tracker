import React, { useState, useEffect } from 'react';
import { TransactionType, CategoriesData } from '../types';
import { PlusCircle, MinusCircle, Calendar, Tag, FileText, CheckCircle2 } from 'lucide-react';
import { fromInputDateFormat } from '../utils/dateUtils';

interface TransactionFormProps {
  categories: CategoriesData;
  initialType?: TransactionType;
  onSubmit: (tx: {
    date: string;
    type: TransactionType;
    category: string;
    amount: number;
    description: string;
  }) => Promise<void>;
  onSuccess?: () => void;
  compact?: boolean;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  categories,
  initialType = 'Expense',
  onSubmit,
  onSuccess,
  compact = false,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // When initialType changes from outside (e.g. mobile Plus/Minus buttons)
  useEffect(() => {
    setType(initialType);
  }, [initialType]);

  // Dynamic categories based on tab structure:
  // Income categories for Income, Expense categories for Expense
  const activeCategoryList =
    type === 'Income' ? categories.incomeCategories : categories.expenseCategories;

  // Whenever category list or type changes, ensure valid category is selected
  useEffect(() => {
    if (activeCategoryList.length > 0) {
      if (!category || !activeCategoryList.includes(category)) {
        setCategory(activeCategoryList[0]);
      }
    } else {
      setCategory('');
    }
  }, [type, categories, activeCategoryList, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorNotice('Please specify an amount greater than 0.');
      return;
    }

    if (!category) {
      setErrorNotice(`Please select a valid ${type.toLowerCase()} category.`);
      return;
    }

    if (!date) {
      setErrorNotice('Please select a valid date.');
      return;
    }

    try {
      setIsSubmitting(true);
      const formattedDate = fromInputDateFormat(date);
      await onSubmit({
        date: formattedDate,
        type,
        category,
        amount: parsedAmount,
        description: description.trim() || `${type} in ${category}`,
      });

      setSuccessNotice(true);
      setAmount('');
      setDescription('');
      setTimeout(() => setSuccessNotice(false), 3000);
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorNotice('Failed to record transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="transaction-form-card"
      className={`rounded-xl border border-neutral-800 bg-neutral-900/60 ${
        compact ? 'p-4' : 'p-5'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100">
            {type === 'Income' ? 'Log Income' : 'Log Expenditure'}
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Writes row to spreadsheet &quot;Transactions&quot; tab
          </p>
        </div>

        {/* Dynamic Category Source Indicator */}
        <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-neutral-700 bg-neutral-800 text-neutral-400">
          Source: Tab &quot;Categories&quot; ({type})
        </span>
      </div>

      {/* Type Selector Tabs */}
      <div className="grid grid-cols-2 gap-2 mb-4 p-1 rounded-lg bg-neutral-950 border border-neutral-800">
        <button
          type="button"
          id="form-tab-expense"
          onClick={() => setType('Expense')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-all ${
            type === 'Expense'
              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <MinusCircle className="w-4 h-4 text-rose-400" />
          Expense
        </button>
        <button
          type="button"
          id="form-tab-income"
          onClick={() => setType('Income')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-all ${
            type === 'Income'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <PlusCircle className="w-4 h-4 text-emerald-400" />
          Income
        </button>
      </div>

      {/* Notifications */}
      {successNotice && (
        <div className="mb-4 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Transaction successfully saved and synced to &quot;Transactions&quot; tab!</span>
        </div>
      )}

      {errorNotice && (
        <div className="mb-4 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
          {errorNotice}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Amount Field */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center gap-1.5">
              <span className="font-semibold text-neutral-400">₹</span>
              Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-neutral-500 text-sm font-semibold">₹</span>
              <input
                id="input-transaction-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-sm rounded-lg bg-neutral-950 border border-neutral-700/80 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors font-mono"
              />
            </div>
          </div>

          {/* Date Field */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                Date *
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">DD-MM-YYYY</span>
            </label>
            <input
              id="input-transaction-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-neutral-950 border border-neutral-700/80 text-neutral-100 focus:outline-none focus:border-neutral-500 transition-colors"
            />
          </div>
        </div>

        {/* Dynamic Category Dropdown Field */}
        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-neutral-400" />
              Category *
            </span>
            <span className="text-[11px] text-neutral-400">
              {type === 'Income' ? 'Income' : 'Expense'}
            </span>
          </label>
          <select
            id="select-transaction-category"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg bg-neutral-950 border border-neutral-700/80 text-neutral-100 focus:outline-none focus:border-neutral-500 transition-colors cursor-pointer"
          >
            {activeCategoryList.map((cat) => (
              <option key={cat} value={cat} className="bg-neutral-900 text-neutral-100">
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Description Field */}
        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-neutral-400" />
            Description
          </label>
          <input
            id="input-transaction-description"
            type="text"
            placeholder={type === 'Income' ? 'e.g., Client retainer' : 'e.g., Weekly groceries'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={100}
            className="w-full px-3 py-2 text-sm rounded-lg bg-neutral-950 border border-neutral-700/80 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors"
          />
        </div>

        {/* Submit Button */}
        <button
          id="btn-submit-transaction"
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            type === 'Income'
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
          } ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isSubmitting ? (
            <span className="inline-block animate-spin mr-1">↻</span>
          ) : type === 'Income' ? (
            <PlusCircle className="w-4 h-4" />
          ) : (
            <MinusCircle className="w-4 h-4" />
          )}
          {isSubmitting ? 'Writing to Google Sheet...' : `Record ${type}`}
        </button>
      </form>
    </div>
  );
};
