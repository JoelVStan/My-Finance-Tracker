import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Transaction } from '../types';
import { PieChart as PieIcon } from 'lucide-react';

interface ExpensePieChartProps {
  transactions: Transaction[];
  expenseCategories: string[];
  title?: string;
  height?: number;
}

const CATEGORY_COLORS = [
  '#f43f5e', // rose-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#10b981', // emerald-500
  '#06b6d4', // cyan-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#6366f1', // indigo-500
  '#d946ef', // fuchsia-500
  '#84cc16', // lime-500
  '#a855f7', // purple-500
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      category: string;
      amount: number;
      percentage: number;
      fill: string;
    };
  }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-neutral-700 bg-neutral-900/95 p-2.5 shadow-xl text-xs backdrop-blur-sm">
        <div className="font-semibold text-neutral-200 flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: data.fill }}
          />
          {data.category}
        </div>
        <div className="mt-1 text-neutral-400">
          Amount: <span className="font-medium text-neutral-100">₹{data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="text-neutral-400">
          Share: <span className="font-medium text-emerald-400">{data.percentage.toFixed(1)}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export const ExpensePieChart: React.FC<ExpensePieChartProps> = ({
  transactions,
  expenseCategories,
  title = "Current Month's Expense Breakdown",
  height = 260,
}) => {
  // Current month filter: e.g. YYYY-MM
  const currentYearMonth = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const monthLabel = useMemo(() => {
    const now = new Date();
    return now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  // Filter expenses strictly for current month and mapped to Expense list
  const { chartData, totalExpense } = useMemo(() => {
    // Current month expenses matching expense list
    const monthExpenses = transactions.filter((tx) => {
      if (tx.type !== 'Expense') return false;
      const isCurrentMonth = tx.date.startsWith(currentYearMonth);
      if (!isCurrentMonth) return false;
      // Match against expense categories list (case-insensitive for robustness)
      const mapped = expenseCategories.some(
        (cat) => cat.trim().toLowerCase() === tx.category.trim().toLowerCase()
      );
      return mapped;
    });

    // Group by category
    const categoryTotals: Record<string, number> = {};
    let sum = 0;

    monthExpenses.forEach((tx) => {
      const cat = tx.category.trim();
      categoryTotals[cat] = (categoryTotals[cat] || 0) + tx.amount;
      sum += tx.amount;
    });

    const data = Object.entries(categoryTotals)
      .map(([category, amount], index) => ({
        name: category,
        category,
        amount,
        percentage: sum > 0 ? (amount / sum) * 100 : 0,
        fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount);

    return { chartData: data, totalExpense: sum };
  }, [transactions, expenseCategories, currentYearMonth]);

  return (
    <div
      id="expense-pie-chart-card"
      className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-rose-400" />
            {title}
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            {monthLabel} • {chartData.length} active categories
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-neutral-400">Total Spent</span>
          <div className="text-base font-bold text-rose-400">
            ₹{totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-center p-4">
          <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 mb-2">
            <PieIcon className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-neutral-300">No expenses recorded this month</p>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs">
            Log an expense with a category from the Expense list to see your breakdown.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center mt-2">
          {/* Pie Visualizer */}
          <div className="md:col-span-6 w-full flex items-center justify-center" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={height * 0.22}
                  outerRadius={height * 0.38}
                  paddingAngle={3}
                  dataKey="amount"
                  stroke="#171717"
                  strokeWidth={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Breakdown Legend List */}
          <div className="md:col-span-6 max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {chartData.map((item) => (
              <div
                key={item.category}
                className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-neutral-800/40 hover:bg-neutral-800/70 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="font-medium text-neutral-200 truncate">{item.category}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="text-neutral-400 font-mono text-[11px]">
                    ₹{item.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="font-semibold text-neutral-200 bg-neutral-800 px-1.5 py-0.5 rounded text-[11px] min-w-[42px] text-right">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
