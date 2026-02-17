'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getTenantSlugFromClient } from '@/lib/tenant';
import { formatCurrency, formatDate, nightsBetween, cn } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';

interface Room {
  id: string;
  roomNumber: string;
  roomType: string;
  floor: number;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  reference: string;
}

interface StatusEvent {
  status: string;
  timestamp: string;
  note?: string;
}

interface ReservationDetail {
  id: string;
  bookingRef: string;
  status: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  paidAmount: number;
  roomCount: number;
  specialRequests: string;
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  rooms: Room[];
  payments: Payment[];
  statusHistory: StatusEvent[];
  roomType: string;
}

interface AvailableRoom {
  id: string;
  roomNumber: string;
  roomType: string;
  floor: number;
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-6 w-48 rounded bg-stone-200" />
      <div className="card">
        <div className="space-y-3">
          <div className="h-4 w-32 rounded bg-stone-200" />
          <div className="h-4 w-56 rounded bg-stone-200" />
          <div className="h-4 w-40 rounded bg-stone-200" />
        </div>
      </div>
      <div className="card">
        <div className="space-y-3">
          <div className="h-4 w-32 rounded bg-stone-200" />
          <div className="h-4 w-48 rounded bg-stone-200" />
        </div>
      </div>
    </div>
  );
}

export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  // Check-in modal state
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);

  useEffect(() => {
    const fetchReservation = async () => {
      try {
        const tenantSlug = getTenantSlugFromClient();
        const data = await api.get<ReservationDetail>(`/admin/reservations/${id}`, { tenantSlug });
        setReservation(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reservation');
      } finally {
        setLoading(false);
      }
    };

    fetchReservation();
  }, [id]);

  const handleAction = async (action: string) => {
    if (action === 'check_in') {
      // Open modal to assign rooms
      setShowCheckInModal(true);
      setRoomsLoading(true);
      try {
        const tenantSlug = getTenantSlugFromClient();
        const rooms = await api.get<AvailableRoom[]>(
          `/admin/rooms/available?checkIn=${reservation?.checkIn}&checkOut=${reservation?.checkOut}`,
          { tenantSlug },
        );
        setAvailableRooms(rooms);
      } catch {
        setError('Failed to load available rooms');
        setShowCheckInModal(false);
      } finally {
        setRoomsLoading(false);
      }
      return;
    }

    setActionLoading(action);
    try {
      const tenantSlug = getTenantSlugFromClient();
      await api.patch(
        `/admin/reservations/${id}/${action}`,
        {},
        { tenantSlug },
      );
      // Refresh data
      const data = await api.get<ReservationDetail>(`/admin/reservations/${id}`, { tenantSlug });
      setReservation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action.replace('_', ' ')}`);
    } finally {
      setActionLoading('');
    }
  };

  const handleCheckIn = async () => {
    if (selectedRoomIds.length === 0) return;

    setActionLoading('check_in');
    try {
      const tenantSlug = getTenantSlugFromClient();
      await api.patch(
        `/admin/reservations/${id}/check_in`,
        { roomIds: selectedRoomIds },
        { tenantSlug },
      );
      setShowCheckInModal(false);
      const data = await api.get<ReservationDetail>(`/admin/reservations/${id}`, { tenantSlug });
      setReservation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check in');
    } finally {
      setActionLoading('');
    }
  };

  const toggleRoomSelection = (roomId: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId],
    );
  };

  if (loading) return <DetailSkeleton />;

  if (error && !reservation) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-lg bg-red-50 px-6 py-4 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
        <Button variant="secondary" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  if (!reservation) return null;

  const balance = reservation.totalAmount - reservation.paidAmount;
  const nights = nightsBetween(reservation.checkIn, reservation.checkOut);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="mb-2 flex min-h-[44px] items-center gap-1 text-sm text-stone-500 hover:text-stone-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back
          </button>
          <h1 className="text-xl font-bold text-stone-900">{reservation.bookingRef}</h1>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={reservation.status} />
            <span className="text-sm text-stone-500">{nights} night(s)</span>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {reservation.status === 'pending' && (
          <>
            <Button loading={actionLoading === 'confirm'} onClick={() => handleAction('confirm')}>
              Confirm Reservation
            </Button>
            <Button
              variant="danger"
              loading={actionLoading === 'cancel'}
              onClick={() => handleAction('cancel')}
            >
              Cancel
            </Button>
          </>
        )}
        {reservation.status === 'confirmed' && (
          <>
            <Button loading={actionLoading === 'check_in'} onClick={() => handleAction('check_in')}>
              Check In
            </Button>
            <Button
              variant="danger"
              loading={actionLoading === 'cancel'}
              onClick={() => handleAction('cancel')}
            >
              Cancel
            </Button>
          </>
        )}
        {reservation.status === 'checked_in' && (
          <Button loading={actionLoading === 'check_out'} onClick={() => handleAction('check_out')}>
            Check Out
          </Button>
        )}
      </div>

      {/* Guest information */}
      <div className="card">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Guest Information
        </h2>
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <span className="text-stone-400">Name</span>
            <p className="font-medium text-stone-900">
              {reservation.guest.firstName} {reservation.guest.lastName}
            </p>
          </div>
          <div>
            <span className="text-stone-400">Email</span>
            <p className="font-medium text-stone-900">{reservation.guest.email}</p>
          </div>
          <div>
            <span className="text-stone-400">Phone</span>
            <p className="font-medium text-stone-900">{reservation.guest.phone || '-'}</p>
          </div>
          <div>
            <span className="text-stone-400">Special Requests</span>
            <p className="font-medium text-stone-900">{reservation.specialRequests || 'None'}</p>
          </div>
        </div>
      </div>

      {/* Booking details */}
      <div className="card">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Booking Details
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <span className="text-stone-400">Check-in</span>
            <p className="font-medium text-stone-900">{formatDate(reservation.checkIn)}</p>
          </div>
          <div>
            <span className="text-stone-400">Check-out</span>
            <p className="font-medium text-stone-900">{formatDate(reservation.checkOut)}</p>
          </div>
          <div>
            <span className="text-stone-400">Room Type</span>
            <p className="font-medium text-stone-900">{reservation.roomType}</p>
          </div>
          <div>
            <span className="text-stone-400">Rooms</span>
            <p className="font-medium text-stone-900">{reservation.roomCount}</p>
          </div>
        </div>
      </div>

      {/* Room assignments */}
      {reservation.rooms.length > 0 && (
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Assigned Rooms
          </h2>
          <div className="space-y-2">
            {reservation.rooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-stone-900">Room {room.roomNumber}</span>
                  <span className="ml-2 text-stone-500">{room.roomType}</span>
                </div>
                <span className="text-stone-400">Floor {room.floor}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment summary and history */}
      <div className="card">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Payments
        </h2>
        <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-stone-400">Total</span>
            <p className="font-semibold text-stone-900">{formatCurrency(reservation.totalAmount)}</p>
          </div>
          <div>
            <span className="text-stone-400">Paid</span>
            <p className="font-semibold text-primary-700">{formatCurrency(reservation.paidAmount)}</p>
          </div>
          <div>
            <span className="text-stone-400">Balance</span>
            <p className={cn('font-semibold', balance > 0 ? 'text-red-600' : 'text-stone-900')}>
              {formatCurrency(balance)}
            </p>
          </div>
        </div>

        {reservation.payments.length > 0 ? (
          <div className="space-y-2">
            {reservation.payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-stone-900">{formatCurrency(payment.amount)}</p>
                  <p className="text-xs text-stone-500">
                    {payment.method} &middot; {formatDate(payment.createdAt)}
                  </p>
                </div>
                <StatusBadge status={payment.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-400">No payments recorded yet.</p>
        )}
      </div>

      {/* Status timeline */}
      {reservation.statusHistory.length > 0 && (
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Status Timeline
          </h2>
          <div className="relative space-y-0">
            {reservation.statusHistory.map((event, i) => (
              <div key={i} className="relative flex gap-3 pb-4 last:pb-0">
                {/* Timeline line */}
                {i < reservation.statusHistory.length - 1 && (
                  <div className="absolute left-[7px] top-4 h-full w-0.5 bg-stone-200" />
                )}
                {/* Dot */}
                <div className="relative z-10 mt-1 h-4 w-4 flex-shrink-0 rounded-full border-2 border-primary-600 bg-white" />
                <div className="text-sm">
                  <StatusBadge status={event.status} />
                  <p className="mt-0.5 text-xs text-stone-400">{formatDate(event.timestamp)}</p>
                  {event.note && <p className="mt-0.5 text-xs text-stone-500">{event.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Check-in modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCheckInModal(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-t-xl bg-white p-6 shadow-xl sm:rounded-xl">
            <h3 className="mb-1 text-lg font-semibold text-stone-900">Assign Rooms</h3>
            <p className="mb-4 text-sm text-stone-500">
              Select {reservation.roomCount} room(s) for this reservation.
            </p>

            {roomsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-stone-100" />
                ))}
              </div>
            ) : availableRooms.length === 0 ? (
              <p className="py-4 text-center text-sm text-stone-500">No rooms available for the selected dates.</p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {availableRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => toggleRoomSelection(room.id)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors min-h-[48px]',
                      selectedRoomIds.includes(room.id)
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50',
                    )}
                  >
                    <div>
                      <span className="font-medium">Room {room.roomNumber}</span>
                      <span className="ml-2 text-stone-400">{room.roomType}</span>
                    </div>
                    <span className="text-stone-400">Floor {room.floor}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCheckInModal(false);
                  setSelectedRoomIds([]);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                loading={actionLoading === 'check_in'}
                disabled={selectedRoomIds.length === 0}
                onClick={handleCheckIn}
                className="flex-1"
              >
                Check In ({selectedRoomIds.length}/{reservation.roomCount})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
