'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { getTenantSlugFromClient } from '@/lib/tenant';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import Button from '@/components/ui/Button';

interface ReportStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  averageOccupancy: number;
}

interface ReportRow {
  date: string;
  label: string;
  amount: number;
  category?: string;
  method?: string;
}

interface ReportData {
  stats: ReportStats;
  rows: ReportRow[];
}

const reportTabs = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'profit', label: 'Profit' },
  { key: 'daily_cash_up', label: 'Daily Cash-Up' },
];

function StatSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="mb-2 h-4 w-24 rounded bg-stone-200" />
      <div className="h-8 w-20 rounded bg-stone-200" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex animate-pulse items-center justify-between rounded-lg bg-white px-4 py-3">
          <div className="h-4 w-32 rounded bg-stone-200" />
          <div className="h-4 w-20 rounded bg-stone-200" />
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('revenue');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Date range
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [dateFrom, setDateFrom] = useState(firstOfMonth.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const tenantSlug = getTenantSlugFromClient();
      const params = new URLSearchParams();
      params.set('type', activeTab);
      params.set('dateFrom', dateFrom);
      params.set('dateTo', dateTo);

      const result = await api.get<ReportData>(
        `/admin/reports?${params.toString()}`,
        { tenantSlug },
      );
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateFrom, dateTo]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCSV = () => {
    if (!data || data.rows.length === 0) return;

    const headers = ['Date', 'Description', 'Amount'];
    if (data.rows[0]?.category) headers.push('Category');
    if (data.rows[0]?.method) headers.push('Method');

    const csvRows = [
      headers.join(','),
      ...data.rows.map((row) => {
        const values = [
          formatDate(row.date),
          `"${row.label}"`,
          row.amount.toFixed(2),
        ];
        if (row.category) values.push(`"${row.category}"`);
        if (row.method) values.push(`"${row.method}"`);
        return values.join(',');
      }),
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${activeTab}-report-${dateFrom}-to-${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Reports</h1>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleExportCSV}
          disabled={!data || data.rows.length === 0}
        >
          Export CSV
        </Button>
      </div>

      {/* Report type tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-stone-200 pb-px">
        {reportTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px] border-b-2 -mb-px',
              activeTab === tab.key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-stone-500 hover:text-stone-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date range */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input-field min-h-[44px]"
          />
          <span className="flex items-center text-stone-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input-field min-h-[44px]"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      {/* Summary stats */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="card">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Revenue</p>
            <p className="mt-1 text-xl font-bold text-primary-700">
              {formatCurrency(data.stats.totalRevenue)}
            </p>
          </div>
          <div className="card">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Expenses</p>
            <p className="mt-1 text-xl font-bold text-red-600">
              {formatCurrency(data.stats.totalExpenses)}
            </p>
          </div>
          <div className="card">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Net Profit</p>
            <p
              className={cn(
                'mt-1 text-xl font-bold',
                data.stats.netProfit >= 0 ? 'text-primary-700' : 'text-red-600',
              )}
            >
              {formatCurrency(data.stats.netProfit)}
            </p>
          </div>
          <div className="card">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Avg Occupancy
            </p>
            <p className="mt-1 text-xl font-bold text-stone-900">
              {data.stats.averageOccupancy}%
            </p>
          </div>
        </div>
      ) : null}

      {/* Report data table */}
      {loading ? (
        <TableSkeleton />
      ) : data && data.rows.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-sm font-medium text-stone-900">No data for the selected period</p>
          <p className="mt-1 text-sm text-stone-500">Try adjusting the date range.</p>
        </div>
      ) : data ? (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-950/5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-left">
                    <th className="px-4 py-3 font-medium text-stone-500">Date</th>
                    <th className="px-4 py-3 font-medium text-stone-500">Description</th>
                    {data.rows[0]?.category !== undefined && (
                      <th className="px-4 py-3 font-medium text-stone-500">Category</th>
                    )}
                    {data.rows[0]?.method !== undefined && (
                      <th className="px-4 py-3 font-medium text-stone-500">Method</th>
                    )}
                    <th className="px-4 py-3 text-right font-medium text-stone-500">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, i) => (
                    <tr key={i} className="border-b border-stone-100 last:border-0">
                      <td className="px-4 py-3 text-stone-500">{formatDate(row.date)}</td>
                      <td className="px-4 py-3 font-medium text-stone-900">{row.label}</td>
                      {row.category !== undefined && (
                        <td className="px-4 py-3 text-stone-500">{row.category}</td>
                      )}
                      {row.method !== undefined && (
                        <td className="px-4 py-3 capitalize text-stone-500">
                          {row.method.replace('_', ' ')}
                        </td>
                      )}
                      <td
                        className={cn(
                          'px-4 py-3 text-right font-semibold',
                          row.amount >= 0 ? 'text-primary-700' : 'text-red-600',
                        )}
                      >
                        {formatCurrency(Math.abs(row.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {data.rows.map((row, i) => (
              <div key={i} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-stone-900">{row.label}</p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {formatDate(row.date)}
                      {row.category && <> &middot; {row.category}</>}
                    </p>
                  </div>
                  <p
                    className={cn(
                      'whitespace-nowrap text-sm font-semibold',
                      row.amount >= 0 ? 'text-primary-700' : 'text-red-600',
                    )}
                  >
                    {row.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(row.amount))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
