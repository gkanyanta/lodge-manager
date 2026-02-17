'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getTenantSlugFromClient } from '@/lib/tenant';
import { formatCurrency, formatDate, nightsBetween, cn } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Reservation {
  id: string;
  bookingRef: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  roomCount: number;
  status: string;
  totalAmount: number;
  createdAt: string;
}

interface ReservationListResponse {
  reservations: Reservation[];
  total: number;
  page: number;
  limit: number;
}

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'checked_in', label: 'Checked In' },
];

function ReservationSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="mb-2 h-4 w-40 rounded bg-stone-200" />
      <div className="mb-1 h-3 w-28 rounded bg-stone-200" />
      <div className="h-3 w-56 rounded bg-stone-200" />
    </div>
  );
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 20;

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const tenantSlug = getTenantSlugFromClient();
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (activeTab !== 'all') params.set('status', activeTab);
      if (search.trim()) params.set('search', search.trim());

      const data = await api.get<ReservationListResponse>(
        `/admin/reservations?${params.toString()}`,
        { tenantSlug },
      );
      setReservations(data.reservations);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, search]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Reservations</h1>
        <Link href="/admin/reservations?action=new" className="btn-primary min-h-[44px] hidden md:inline-flex">
          + New Reservation
        </Link>
      </div>

      {/* Search */}
      <div>
        <Input
          placeholder="Search by guest name or booking ref..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* Tab filters */}
      <div className="flex gap-1 overflow-x-auto border-b border-stone-200 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setPage(1);
            }}
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

      {/* Error state */}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      {/* Reservation list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <ReservationSkeleton key={i} />
          ))}
        </div>
      ) : reservations.length === 0 ? (
        <div className="card py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-stone-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <p className="mt-3 text-sm font-medium text-stone-900">No reservations found</p>
          <p className="mt-1 text-sm text-stone-500">
            {search ? 'Try a different search term.' : 'Create a new reservation to get started.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map((res) => (
            <div key={res.id} className="card cursor-pointer" onClick={() => setExpandedId(expandedId === res.id ? null : res.id)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-stone-900">{res.guestName}</p>
                    <StatusBadge status={res.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-stone-500">
                    {res.bookingRef} &middot; {nightsBetween(res.checkIn, res.checkOut)} night(s) &middot; {res.roomCount} room(s)
                  </p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {formatDate(res.checkIn)} - {formatDate(res.checkOut)}
                  </p>
                </div>
                <p className="whitespace-nowrap text-sm font-semibold text-stone-900">
                  {formatCurrency(res.totalAmount)}
                </p>
              </div>

              {/* Expanded details */}
              {expandedId === res.id && (
                <div className="mt-3 border-t border-stone-100 pt-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-stone-400">Email:</span>
                      <p className="text-stone-700">{res.guestEmail}</p>
                    </div>
                    <div>
                      <span className="text-stone-400">Created:</span>
                      <p className="text-stone-700">{formatDate(res.createdAt)}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link
                      href={`/admin/reservations/${res.id}`}
                      className="btn-primary inline-flex min-h-[36px] px-3 py-1.5 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-stone-500">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Mobile FAB */}
      <Link
        href="/admin/reservations?action=new"
        className="btn-primary fixed bottom-20 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full shadow-lg md:hidden"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </Link>
    </div>
  );
}
