'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { getTenantSlugFromClient } from '@/lib/tenant';
import { formatCurrency, formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface ExpenseCategory {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  categoryId: string;
  method: string;
  vendor: string;
  date: string;
  createdAt: string;
}

interface ExpenseListResponse {
  expenses: Expense[];
  total: number;
  totalAmount: number;
  page: number;
  limit: number;
}

const methodOptions = ['cash', 'card', 'bank_transfer', 'mobile_money', 'other'];

function ExpenseSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="mb-2 h-4 w-36 rounded bg-stone-200" />
      <div className="h-3 w-48 rounded bg-stone-200" />
    </div>
  );
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Add expense modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    categoryId: '',
    amount: '',
    description: '',
    method: 'cash',
    vendor: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [addLoading, setAddLoading] = useState(false);

  // Add category modal
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addCatLoading, setAddCatLoading] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const tenantSlug = getTenantSlugFromClient();
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const data = await api.get<ExpenseListResponse>(
        `/admin/expenses?${params.toString()}`,
        { tenantSlug },
      );
      setExpenses(data.expenses);
      setTotal(data.total);
      setTotalAmount(data.totalAmount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo]);

  const fetchCategories = useCallback(async () => {
    try {
      const tenantSlug = getTenantSlugFromClient();
      const data = await api.get<ExpenseCategory[]>('/admin/expense-categories', { tenantSlug });
      setCategories(data);
    } catch {
      // Silently fail - categories will be empty
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, [fetchExpenses, fetchCategories]);

  const handleAddExpense = async () => {
    setAddLoading(true);
    try {
      const tenantSlug = getTenantSlugFromClient();
      await api.post(
        '/admin/expenses',
        {
          categoryId: newExpense.categoryId,
          amount: Number(newExpense.amount),
          description: newExpense.description,
          method: newExpense.method,
          vendor: newExpense.vendor,
          date: newExpense.date,
        },
        { tenantSlug },
      );
      setShowAddModal(false);
      setNewExpense({
        categoryId: '',
        amount: '',
        description: '',
        method: 'cash',
        vendor: '',
        date: new Date().toISOString().split('T')[0],
      });
      fetchExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add expense');
    } finally {
      setAddLoading(false);
    }
  };

  const handleAddCategory = async () => {
    setAddCatLoading(true);
    try {
      const tenantSlug = getTenantSlugFromClient();
      await api.post('/admin/expense-categories', { name: newCategoryName }, { tenantSlug });
      setShowAddCategory(false);
      setNewCategoryName('');
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add category');
    } finally {
      setAddCatLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Expenses</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowAddCategory(true)}>
            Categories
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            + Add Expense
          </Button>
        </div>
      </div>

      {/* Total summary */}
      {!loading && (
        <div className="card bg-red-50">
          <p className="text-xs font-medium uppercase tracking-wide text-red-600">
            Total Expenses {dateFrom || dateTo ? '(filtered)' : ''}
          </p>
          <p className="mt-1 text-2xl font-bold text-red-800">
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

      {/* Expense list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <ExpenseSkeleton key={i} />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-sm font-medium text-stone-900">No expenses recorded</p>
          <p className="mt-1 text-sm text-stone-500">Track your lodge expenses here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <div key={expense.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-stone-900">{expense.description}</p>
                  <p className="mt-0.5 text-sm text-stone-500">
                    {expense.category}
                    {expense.vendor && <> &middot; {expense.vendor}</>}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {formatDate(expense.date)} &middot;{' '}
                    <span className="capitalize">{expense.method.replace('_', ' ')}</span>
                  </p>
                </div>
                <p className="whitespace-nowrap text-sm font-semibold text-red-600">
                  -{formatCurrency(expense.amount)}
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

      {/* Add expense modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-xl bg-white p-6 shadow-xl sm:rounded-xl">
            <h3 className="mb-4 text-lg font-semibold text-stone-900">Add Expense</h3>
            <div className="space-y-3">
              <div className="w-full">
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Category <span className="ml-0.5 text-red-500">*</span>
                </label>
                <select
                  value={newExpense.categoryId}
                  onChange={(e) => setNewExpense({ ...newExpense, categoryId: e.target.value })}
                  className="input-field min-h-[44px]"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Amount"
                type="number"
                required
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                placeholder="0.00"
              />
              <Input
                label="Description"
                required
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                placeholder="Expense description"
              />
              <div className="w-full">
                <label className="mb-1.5 block text-sm font-medium text-stone-700">Method</label>
                <select
                  value={newExpense.method}
                  onChange={(e) => setNewExpense({ ...newExpense, method: e.target.value })}
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
                label="Vendor"
                value={newExpense.vendor}
                onChange={(e) => setNewExpense({ ...newExpense, vendor: e.target.value })}
                placeholder="Vendor name (optional)"
              />
              <Input
                label="Date"
                type="date"
                required
                value={newExpense.date}
                onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
              />
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="secondary" onClick={() => setShowAddModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                loading={addLoading}
                onClick={handleAddExpense}
                disabled={!newExpense.categoryId || !newExpense.amount || !newExpense.description}
                className="flex-1"
              >
                Add Expense
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add category modal */}
      {showAddCategory && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddCategory(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-t-xl bg-white p-6 shadow-xl sm:rounded-xl">
            <h3 className="mb-4 text-lg font-semibold text-stone-900">Expense Categories</h3>

            {/* Existing categories */}
            {categories.length > 0 && (
              <div className="mb-4 space-y-1">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700"
                  >
                    {cat.name}
                  </div>
                ))}
              </div>
            )}

            {/* Add new */}
            <div className="flex gap-2">
              <Input
                placeholder="Category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <Button
                loading={addCatLoading}
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim()}
                size="sm"
              >
                Add
              </Button>
            </div>

            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => setShowAddCategory(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
