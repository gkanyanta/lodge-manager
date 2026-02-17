'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { getTenantSlugFromClient } from '@/lib/tenant';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  reservationRef: string;
  reservationId: string;
  guestName: string;
  reference: string;
  createdAt: string;
}

interface PaymentListResponse {
  payments: Payment[];
  total: number;
  page: number;
  limit: number;
}

const methodOptions = ['cash', 'card', 'bank_transfer', 'mobile_money', 'other'];
const statusFilters = ['all', 'paid', 'initiated', 'failed', 'refunded'];

function PaymentSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="mb-2 h-4 w-32 rounded bg-stone-200" />
      <div className="h-3 w-48 rounded bg-stone-200" />
    </div>
  );
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Record payment modal
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [newPayment, setNewPayment] = useState({
    reservationId: '',
    amount: '',
    method: 'cash',
    reference: '',
  });
  const [recordLoading, setRecordLoading] = useState(false);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const tenantSlug = getTenantSlugFromClient();
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (methodFilter !== 'all') params.set('method', methodFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const data = await api.get<PaymentListResponse>(
        `/admin/payments?${params.toString()}`,
        { tenantSlug },
      );
      setPayments(data.payments);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, methodFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleRecordPayment = async () => {
    setRecordLoading(true);
    try {
      const tenantSlug = getTenantSlugFromClient();
      await api.post(
        '/admin/payments',
        {
          reservationId: newPayment.reservationId,
          amount: Number(newPayment.amount),
          method: newPayment.method,
          reference: newPayment.reference,
        },
        { tenantSlug },
      );
      setShowRecordModal(false);
      setNewPayment({ reservationId: '', amount: '', method: 'cash', reference: '' });
      fetchPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setRecordLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Payments</h1>
        <Button size="sm" onClick={() => setShowRecordModal(true)}>
          Record Payment
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field min-h-[44px]"
          >
            {statusFilters.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-auto">
          <select
            value={methodFilter}
            onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
            className="input-field min-h-[44px]"
          >
            <option value="all">All Methods</option>
            {methodOptions.map((m) => (
              <option key={m} value={m}>
                {m.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="input-field min-h-[44px]"
            placeholder="From"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="input-field min-h-[44px]"
            placeholder="To"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      {/* Payments list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <PaymentSkeleton key={i} />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="card py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-stone-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
          <p className="mt-3 text-sm font-medium text-stone-900">No payments found</p>
          <p className="mt-1 text-sm text-stone-500">Adjust your filters or record a new payment.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-950/5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-left">
                    <th className="px-4 py-3 font-medium text-stone-500">Date</th>
                    <th className="px-4 py-3 font-medium text-stone-500">Guest</th>
                    <th className="px-4 py-3 font-medium text-stone-500">Booking</th>
                    <th className="px-4 py-3 font-medium text-stone-500">Method</th>
                    <th className="px-4 py-3 font-medium text-stone-500">Amount</th>
                    <th className="px-4 py-3 font-medium text-stone-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-stone-100 last:border-0">
                      <td className="px-4 py-3 text-stone-500">{formatDate(payment.createdAt)}</td>
                      <td className="px-4 py-3 font-medium text-stone-900">{payment.guestName}</td>
                      <td className="px-4 py-3 text-stone-500">{payment.reservationRef}</td>
                      <td className="px-4 py-3 capitalize text-stone-500">
                        {payment.method.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 font-semibold text-stone-900">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={payment.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {payments.map((payment) => (
              <div key={payment.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-stone-900">{payment.guestName}</p>
                    <p className="mt-0.5 text-sm text-stone-500">
                      {payment.reservationRef} &middot;{' '}
                      <span className="capitalize">{payment.method.replace('_', ' ')}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-stone-400">{formatDate(payment.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-stone-900">{formatCurrency(payment.amount)}</p>
                    <div className="mt-1">
                      <StatusBadge status={payment.status} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-stone-500">
            Page {page} of {totalPages} ({total} total)
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

      {/* Record payment modal */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowRecordModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-xl bg-white p-6 shadow-xl sm:rounded-xl">
            <h3 className="mb-4 text-lg font-semibold text-stone-900">Record Payment</h3>
            <div className="space-y-3">
              <Input
                label="Reservation ID"
                required
                value={newPayment.reservationId}
                onChange={(e) => setNewPayment({ ...newPayment, reservationId: e.target.value })}
                placeholder="Reservation ID or booking ref"
              />
              <Input
                label="Amount"
                type="number"
                required
                value={newPayment.amount}
                onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                placeholder="0.00"
              />
              <div className="w-full">
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Payment Method <span className="ml-0.5 text-red-500">*</span>
                </label>
                <select
                  value={newPayment.method}
                  onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value })}
                  className="input-field min-h-[44px]"
                >
                  {methodOptions.map((m) => (
                    <option key={m} value={m}>
                      {m.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Reference"
                value={newPayment.reference}
                onChange={(e) => setNewPayment({ ...newPayment, reference: e.target.value })}
                placeholder="Transaction reference (optional)"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="secondary" onClick={() => setShowRecordModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                loading={recordLoading}
                onClick={handleRecordPayment}
                disabled={!newPayment.reservationId || !newPayment.amount}
                className="flex-1"
              >
                Record
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
