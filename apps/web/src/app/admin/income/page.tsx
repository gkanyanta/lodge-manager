'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { getTenantSlugFromClient } from '@/lib/tenant';
import { formatCurrency, formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface IncomeEntry {
  id: string;
  amount: number;
  description: string;
  source: string;
  method: string;
  date: string;
  createdAt: string;
}

interface IncomeListResponse {
  income: IncomeEntry[];
  total: number;
  totalAmount: number;
  page: number;
  limit: number;
}

const sourceOptions = ['room_revenue', 'restaurant', 'bar', 'laundry', 'tours', 'events', 'other'];
const methodOptions = ['cash', 'card', 'bank_transfer', 'mobile_money', 'other'];

function IncomeSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="mb-2 h-4 w-36 rounded bg-stone-200" />
      <div className="h-3 w-48 rounded bg-stone-200" />
    </div>
  );
}

export default function IncomePage() {
  const [income, setIncome] = useState<IncomeEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Date filter
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Add income modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newIncome, setNewIncome] = useState({
    amount: '',
    description: '',
    source: 'room_revenue',
    method: 'cash',
    date: new Date().toISOString().split('T')[0],
  });
  const [addLoading, setAddLoading] = useState(false);

  const fetchIncome = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const tenantSlug = getTenantSlugFromClient();
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const data = await api.get<IncomeListResponse>(
        `/admin/income?${params.toString()}`,
        { tenantSlug },
      );
      setIncome(data.income);
      setTotal(data.total);
      setTotalAmount(data.totalAmount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load income');
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo]);

  useEffect(() => {
    fetchIncome();
  }, [fetchIncome]);

  const handleAddIncome = async () => {
    setAddLoading(true);
    try {
      const tenantSlug = getTenantSlugFromClient();
      await api.post(
        '/admin/income',
        {
          amount: Number(newIncome.amount),
          description: newIncome.description,
          source: newIncome.source,
          method: newIncome.method,
          date: newIncome.date,
        },
        { tenantSlug },
      );
      setShowAddModal(false);
      setNewIncome({
        amount: '',
        description: '',
        source: 'room_revenue',
        method: 'cash',
        date: new Date().toISOString().split('T')[0],
      });
      fetchIncome();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add income');
    } finally {
      setAddLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Income</h1>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          + Add Income
        </Button>
      </div>

      {/* Total summary */}
      {!loading && (
        <div className="card bg-primary-50">
          <p className="text-xs font-medium uppercase tracking-wide text-primary-600">
            Total Income {dateFrom || dateTo ? '(filtered)' : ''}
          </p>
          <p className="mt-1 text-2xl font-bold text-primary-800">
            {formatCurrency(totalAmount)}
          </p>
        </div>
      )}

      {/* Date range filter */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="input-field min-h-[44px]"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="input-field min-h-[44px]"
          />
        </div>
        {(dateFrom || dateTo) && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
          >
            Clear
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      {/* Income list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <IncomeSkeleton key={i} />
          ))}
        </div>
      ) : income.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-sm font-medium text-stone-900">No income entries found</p>
          <p className="mt-1 text-sm text-stone-500">Record your first income entry to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {income.map((entry) => (
            <div key={entry.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-stone-900">{entry.description}</p>
                  <p className="mt-0.5 text-sm text-stone-500">
                    <span className="capitalize">{entry.source.replace('_', ' ')}</span>
                    {' '}&middot;{' '}
                    <span className="capitalize">{entry.method.replace('_', ' ')}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-stone-400">{formatDate(entry.date)}</p>
                </div>
                <p className="whitespace-nowrap text-sm font-semibold text-primary-700">
                  +{formatCurrency(entry.amount)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-stone-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add income modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-xl bg-white p-6 shadow-xl sm:rounded-xl">
            <h3 className="mb-4 text-lg font-semibold text-stone-900">Add Income</h3>
            <div className="space-y-3">
              <Input
                label="Amount"
                type="number"
                required
                value={newIncome.amount}
                onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })}
                placeholder="0.00"
              />
              <Input
                label="Description"
                required
                value={newIncome.description}
                onChange={(e) => setNewIncome({ ...newIncome, description: e.target.value })}
                placeholder="Income description"
              />
              <div className="w-full">
                <label className="mb-1.5 block text-sm font-medium text-stone-700">Source</label>
                <select
                  value={newIncome.source}
                  onChange={(e) => setNewIncome({ ...newIncome, source: e.target.value })}
                  className="input-field min-h-[44px]"
                >
                  {sourceOptions.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full">
                <label className="mb-1.5 block text-sm font-medium text-stone-700">Method</label>
                <select
                  value={newIncome.method}
                  onChange={(e) => setNewIncome({ ...newIncome, method: e.target.value })}
                  className="input-field min-h-[44px]"
                >
                  {methodOptions.map((m) => (
                    <option key={m} value={m}>
                      {m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Date"
                type="date"
                required
                value={newIncome.date}
                onChange={(e) => setNewIncome({ ...newIncome, date: e.target.value })}
              />
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="secondary" onClick={() => setShowAddModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                loading={addLoading}
                onClick={handleAddIncome}
                disabled={!newIncome.amount || !newIncome.description}
                className="flex-1"
              >
                Add Income
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
