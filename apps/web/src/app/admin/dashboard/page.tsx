'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getTenantSlugFromClient } from '@/lib/tenant';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';

interface DashboardData {
  stats: {
    arrivalsToday: number;
    departuresToday: number;
    occupancyPercent: number;
    revenueToday: number;
    totalRooms: number;
    occupiedRooms: number;
  };
  arrivals: Array<{
    id: string;
    guestName: string;
    roomType: string;
    status: string;
    checkIn: string;
    bookingRef: string;
  }>;
  departures: Array<{
    id: string;
    guestName: string;
    roomNumber: string;
    status: string;
    checkOut: string;
    bookingRef: string;
  }>;
}

function StatSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="mb-2 h-4 w-24 rounded bg-stone-200" />
      <div className="h-8 w-16 rounded bg-stone-200" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card animate-pulse">
          <div className="mb-2 h-4 w-32 rounded bg-stone-200" />
          <div className="h-3 w-48 rounded bg-stone-200" />
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const tenantSlug = getTenantSlugFromClient();
        const result = await api.get<DashboardData>('/admin/dashboard', { tenantSlug });
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-lg bg-red-50 px-6 py-4 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
        <Button variant="secondary" className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Dashboard</h1>
          <p className="mt-0.5 text-sm text-stone-500">{formatDate(new Date())}</p>
        </div>
      </div>

      {/* Stats cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {/* Arrivals today */}
          <div className="card">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Arrivals Today
            </p>
            <p className="mt-1 text-2xl font-bold text-stone-900">{data.stats.arrivalsToday}</p>
          </div>

          {/* Departures today */}
          <div className="card">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Departures Today
            </p>
            <p className="mt-1 text-2xl font-bold text-stone-900">{data.stats.departuresToday}</p>
          </div>

          {/* Occupancy */}
          <div className="card">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Occupancy</p>
            <p className="mt-1 text-2xl font-bold text-stone-900">
              {data.stats.occupancyPercent}%
            </p>
            <div className="mt-2 h-2 w-full rounded-full bg-stone-100">
              <div
                className={cn(
                  'h-2 rounded-full transition-all',
                  data.stats.occupancyPercent >= 80
                    ? 'bg-red-500'
                    : data.stats.occupancyPercent >= 50
                      ? 'bg-yellow-500'
                      : 'bg-primary-500',
                )}
                style={{ width: `${Math.min(data.stats.occupancyPercent, 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-stone-400">
              {data.stats.occupiedRooms}/{data.stats.totalRooms} rooms
            </p>
          </div>

          {/* Revenue today */}
          <div className="card">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Revenue Today
            </p>
            <p className="mt-1 text-2xl font-bold text-primary-700">
              {formatCurrency(data.stats.revenueToday)}
            </p>
          </div>
        </div>
      ) : null}

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link href="/admin/reservations?action=new" className="btn-primary min-h-[44px]">
          + New Reservation
        </Link>
        <Link href="/admin/reservations?action=walkin" className="btn-secondary min-h-[44px]">
          Walk-in
        </Link>
      </div>

      {/* Arrivals and Departures */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Today's Arrivals */}
        <div>
          <h2 className="mb-3 text-base font-semibold text-stone-900">
            Today&apos;s Arrivals
          </h2>
          {loading ? (
            <ListSkeleton />
          ) : data && data.arrivals.length > 0 ? (
            <div className="space-y-3">
              {data.arrivals.map((arrival) => (
                <div key={arrival.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-stone-900">{arrival.guestName}</p>
                      <p className="mt-0.5 text-sm text-stone-500">
                        {arrival.roomType} &middot; {arrival.bookingRef}
                      </p>
                    </div>
                    <StatusBadge status={arrival.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-stone-400">
                      Check-in: {formatDate(arrival.checkIn)}
                    </span>
                    {arrival.status === 'confirmed' && (
                      <Link
                        href={`/admin/reservations/${arrival.id}`}
                        className="btn-primary px-3 py-1.5 text-xs min-h-[36px]"
                      >
                        Check In
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center">
              <p className="text-sm text-stone-400">No arrivals scheduled for today</p>
            </div>
          )}
        </div>

        {/* Today's Departures */}
        <div>
          <h2 className="mb-3 text-base font-semibold text-stone-900">
            Today&apos;s Departures
          </h2>
          {loading ? (
            <ListSkeleton />
          ) : data && data.departures.length > 0 ? (
            <div className="space-y-3">
              {data.departures.map((departure) => (
                <div key={departure.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-stone-900">{departure.guestName}</p>
                      <p className="mt-0.5 text-sm text-stone-500">
                        Room {departure.roomNumber} &middot; {departure.bookingRef}
                      </p>
                    </div>
                    <StatusBadge status={departure.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-stone-400">
                      Check-out: {formatDate(departure.checkOut)}
                    </span>
                    {departure.status === 'checked_in' && (
                      <Link
                        href={`/admin/reservations/${departure.id}`}
                        className="btn-secondary px-3 py-1.5 text-xs min-h-[36px]"
                      >
                        Check Out
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center">
              <p className="text-sm text-stone-400">No departures scheduled for today</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
