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
import { parseDateParts } from '../utils/dateUtils';

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
      // Group by canonical date: YYYY-MM-DD for accurate chronological order
      const map: Record<
        string,
        { income: number; expense: number; investment: number; day: number; month: number; year: number }
      > = {};

      transactions.forEach((tx) => {
        const parts = parseDateParts(tx.date);
        if (!parts) return;
        const sortKey = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(
          parts.day
        ).padStart(2, '0')}`;
        if (!map[sortKey]) {
          map[sortKey] = {
            income: 0,
            expense: 0,
            investment: 0,
            day: parts.day,
            month: parts.month,
            year: parts.year,
          };
        }
        if (tx.type === 'Income') {
          map[sortKey].income += tx.amount;
        } else if (tx.type === 'Investment') {
          map[sortKey].investment += tx.amount;
        } else {
          map[sortKey].expense += tx.amount;
        }
      });

      const sortedDates = Object.keys(map).sort();
      const recentDates = sortedDates.slice(-30);

      return recentDates.map((dateKey) => {
        const item = map[dateKey];
        const dateObj = new Date(item.year, item.month - 1, item.day);
        const label = dateObj.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
        });
        const fullDDMMYYYY = `${String(item.day).padStart(2, '0')}-${String(item.month).padStart(
          2,
          '0'
        )}-${item.year}`;

        return {
          label,
          rawDate: fullDDMMYYYY,
          income: item.income,
          expense: item.expense,
          investment: item.investment,
          net: item.income - item.expense - item.investment,
        };
      });
    } else {
      // Group by Month: YYYY-MM (e.g. 2026-01 for all January transactions)
      const map: Record<
        string,
        { income: number; expense: number; investment: number; month: number; year: number }
      > = {};

      transactions.forEach((tx) => {
        const parts = parseDateParts(tx.date);
        if (!parts) return;
        const monthKey = `${parts.year}-${String(parts.month).padStart(2, '0')}`;
        if (!map[monthKey]) {
          map[monthKey] = {
            income: 0,
            expense: 0,
            investment: 0,
            month: parts.month,
            year: parts.year,
          };
        }
        if (tx.type === 'Income') {
          map[monthKey].income += tx.amount;
        } else if (tx.type === 'Investment') {
          map[monthKey].investment += tx.amount;
        } else {
          map[monthKey].expense += tx.amount;
        }
      });

      const sortedMonths = Object.keys(map).sort();

      return sortedMonths.map((mKey) => {
        const item = map[mKey];
        const d = new Date(item.year, item.month - 1, 1);
        const label = d.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        });

        return {
          label,
          rawDate: mKey,
          income: item.income,
          expense: item.expense,
          investment: item.investment,
          net: item.income - item.expense - item.investment,
        };
      });
    }
  }, [transactions, period]);

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  return (
    <div
      id="trend-line-chart-card"
      className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 sm:p-5 flex flex-col justify-between overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Cashflow &amp; Investment Trends
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Temporal comparison over {period === 'daily' ? 'recent days' : 'months'}
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
                    const inv = Number(payload.find((p) => p.dataKey === 'investment')?.value || 0);
                    const net = inc - exp - inv;

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
                        <div className="flex items-center justify-between gap-4 text-violet-400 mt-0.5">
                          <span>Investment:</span>
                          <span className="font-bold">₹{inv.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-neutral-300 mt-1 pt-1 border-t border-neutral-800">
                          <span>Net Balance:</span>
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
              <Line
                type="monotone"
                name="Investment"
                dataKey="investment"
                stroke="#a78bfa"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#a78bfa', strokeWidth: 1, stroke: '#4c1d95' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
