import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Transaction, TrendPeriod } from '../types';
import { TrendingUp, Calendar, Clock } from 'lucide-react';

interface TrendLineChartProps {
  transactions: Transaction[];
  height?: number;
}

interface TrendPoint {
  label: string;
  income: number;
  expense: number;
  net: number;
  rawDate: string;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({
  transactions,
  height = 280,
}) => {
  const [period, setPeriod] = useState<TrendPeriod>('daily');

  const trendData = useMemo(() => {
    if (transactions.length === 0) return [];

    if (period === 'daily') {
      // Group by Date (YYYY-MM-DD)
      const map: Record<string, { income: number; expense: number }> = {};

      transactions.forEach((tx) => {
        const d = tx.date;
        if (!map[d]) {
          map[d] = { income: 0, expense: 0 };
        }
        if (tx.type === 'Income') {
          map[d].income += tx.amount;
        } else {
          map[d].expense += tx.amount;
        }
      });

      // Sort dates ascending
      const sortedDates = Object.keys(map).sort();
      // Take up to recent 14-30 dates for clean readability
      const recentDates = sortedDates.slice(-20);

      return recentDates.map((dateStr) => {
        const [y, m, d] = dateStr.split('-');
        const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        const formatted = dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });

        const inc = map[dateStr].income;
        const exp = map[dateStr].expense;

        return {
          label: formatted,
          rawDate: dateStr,
          income: inc,
          expense: exp,
          net: inc - exp,
        };
      });
    } else {
      // Group by Month (YYYY-MM)
      const map: Record<string, { income: number; expense: number }> = {};

      transactions.forEach((tx) => {
        const monthKey = tx.date.substring(0, 7); // YYYY-MM
        if (!map[monthKey]) {
          map[monthKey] = { income: 0, expense: 0 };
        }
        if (tx.type === 'Income') {
          map[monthKey].income += tx.amount;
        } else {
          map[monthKey].expense += tx.amount;
        }
      });

      const sortedMonths = Object.keys(map).sort();

      return sortedMonths.map((mKey) => {
        const [year, month] = mKey.split('-');
        const d = new Date(parseInt(year), parseInt(month) - 1, 1);
        const label = d.toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        });

        const inc = map[mKey].income;
        const exp = map[mKey].expense;

        return {
          label,
          rawDate: mKey,
          income: inc,
          expense: exp,
          net: inc - exp,
        };
      });
    }
  }, [transactions, period]);

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  return (
    <div
      id="trend-line-chart-card"
      className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 flex flex-col justify-between"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Income vs. Expenses Trend
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Temporal cashflow comparison over {period === 'daily' ? 'recent days' : 'months'}
          </p>
        </div>

        {/* View toggle */}
        <div className="inline-flex items-center rounded-lg bg-neutral-800/80 p-0.5 border border-neutral-700/60 self-start sm:self-auto">
          <button
            type="button"
            id="toggle-daily-trend"
            onClick={() => setPeriod('daily')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              period === 'daily'
                ? 'bg-neutral-900 text-neutral-100 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Daily
          </button>
          <button
            type="button"
            id="toggle-monthly-trend"
            onClick={() => setPeriod('monthly')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              period === 'monthly'
                ? 'bg-neutral-900 text-neutral-100 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Monthly
          </button>
        </div>
      </div>

      {trendData.length === 0 ? (
        <div className="h-56 flex flex-col items-center justify-center text-center p-4">
          <TrendingUp className="w-8 h-8 text-neutral-600 mb-2" />
          <p className="text-sm font-medium text-neutral-300">No trend data available</p>
          <p className="text-xs text-neutral-400 mt-1">Log transactions to plot temporal trends</p>
        </div>
      ) : (
        <div className="w-full" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendData}
              margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#737373"
                tick={{ fill: '#a3a3a3', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#404040' }}
              />
              <YAxis
                stroke="#737373"
                tick={{ fill: '#a3a3a3', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#404040' }}
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const inc = Number(payload.find((p) => p.dataKey === 'income')?.value || 0);
                    const exp = Number(payload.find((p) => p.dataKey === 'expense')?.value || 0);
                    const net = inc - exp;

                    return (
                      <div className="rounded-lg border border-neutral-700 bg-neutral-900/95 p-3 shadow-xl text-xs backdrop-blur-sm">
                        <div className="font-semibold text-neutral-200 mb-1.5 border-b border-neutral-800 pb-1">
                          {label}
                        </div>
                        <div className="flex items-center justify-between gap-4 text-emerald-400">
                          <span>Income:</span>
                          <span className="font-bold">₹{inc.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-rose-400 mt-0.5">
                          <span>Expense:</span>
                          <span className="font-bold">₹{exp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-neutral-300 mt-1 pt-1 border-t border-neutral-800">
                          <span>Net Cashflow:</span>
                          <span
                            className={`font-bold ${
                              net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            ₹{net.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '8px', fontSize: '12px' }}
              />
              <Line
                type="monotone"
                name="Income"
                dataKey="income"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#10b981', strokeWidth: 1, stroke: '#064e3b' }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                name="Expense"
                dataKey="expense"
                stroke="#f43f5e"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#f43f5e', strokeWidth: 1, stroke: '#881337' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
