'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getTenantSlugFromClient } from '@/lib/tenant';
import { formatCurrency, formatDate, nightsBetween } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import StatusBadge from '@/components/ui/StatusBadge';

interface BookingRoom {
  roomTypeName: string;
  roomNumber?: string;
  quantity: number;
  pricePerNight: number;
}

interface BookingDetails {
  id: string;
  bookingReference: string;
  status: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  guest: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  rooms: BookingRoom[];
  specialRequests?: string;
  createdAt: string;
}

interface ManageResponse {
  data: BookingDetails;
}

const CANCELLABLE_STATUSES = ['pending', 'confirmed', 'inquiry'];

export default function ManagePage() {
  const searchParams = useSearchParams();
  const prefillRef = searchParams.get('ref') || '';

  const [reference, setReference] = useState(prefillRef);
  const [lastName, setLastName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  // Auto-clear errors on input
  useEffect(() => {
    if (reference) setErrors((prev) => ({ ...prev, reference: '' }));
  }, [reference]);
  useEffect(() => {
    if (lastName) setErrors((prev) => ({ ...prev, lastName: '' }));
  }, [lastName]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!reference.trim()) newErrors.reference = 'Booking reference is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setError('');
    setBooking(null);
    setCancelConfirm(false);

    try {
      const tenantSlug = getTenantSlugFromClient();
      const response = await api.post<ManageResponse>(
        '/bookings/manage',
        { bookingReference: reference.trim(), lastName: lastName.trim() },
        { tenantSlug },
      );
      setBooking(response.data);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setError('No booking found with that reference and last name. Please check and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!booking) return;

    setCancelling(true);
    setError('');

    try {
      const tenantSlug = getTenantSlugFromClient();
      await api.post(
        `/bookings/${booking.id}/cancel`,
        {},
        { tenantSlug },
      );
      // Refresh booking
      const response = await api.post<ManageResponse>(
        '/bookings/manage',
        { bookingReference: reference.trim(), lastName: lastName.trim() },
        { tenantSlug },
      );
      setBooking(response.data);
      setCancelConfirm(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to cancel booking. Please try again.');
      }
    } finally {
      setCancelling(false);
    }
  }

  const canCancel = booking && CANCELLABLE_STATUSES.includes(booking.status);

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3 sm:px-6">
          <a
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
            aria-label="Back to home"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </a>
          <h1 className="text-lg font-semibold text-stone-900">Manage Booking</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        {/* Search form */}
        {!booking && (
          <div className="card">
            <h2 className="text-base font-semibold text-stone-900">Find Your Booking</h2>
            <p className="mt-1 text-sm text-stone-500">
              Enter your booking reference and last name to view your reservation.
            </p>

            <form onSubmit={handleSearch} className="mt-5 space-y-4">
              <Input
                label="Booking Reference"
                required
                value={reference}
                onChange={(e) => setReference(e.target.value.toUpperCase())}
                error={errors.reference}
                placeholder="e.g. BK-A1B2C3"
                autoComplete="off"
              />
              <Input
                label="Last Name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                error={errors.lastName}
                placeholder="As provided at booking"
                autoComplete="family-name"
              />

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} size="lg" className="w-full">
                Find Booking
              </Button>
            </form>
          </div>
        )}

        {/* Booking details */}
        {booking && (
          <div className="space-y-4">
            {/* Back to search */}
            <button
              onClick={() => {
                setBooking(null);
                setCancelConfirm(false);
                setError('');
              }}
              className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors min-h-[44px]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Search Again
            </button>

            {/* Status & Reference */}
            <div className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
                    Booking Reference
                  </p>
                  <p className="mt-1 text-xl font-bold tracking-wide text-stone-900">
                    {booking.bookingReference}
                  </p>
                </div>
                <StatusBadge status={booking.status} />
              </div>
            </div>

            {/* Dates & Guest */}
            <div className="card space-y-4">
              <h3 className="text-sm font-semibold text-stone-900">Stay Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-stone-500">Check-in</p>
                  <p className="font-medium text-stone-900">{formatDate(booking.checkIn)}</p>
                </div>
                <div>
                  <p className="text-stone-500">Check-out</p>
                  <p className="font-medium text-stone-900">{formatDate(booking.checkOut)}</p>
                </div>
                <div>
                  <p className="text-stone-500">Duration</p>
                  <p className="font-medium text-stone-900">
                    {nightsBetween(booking.checkIn, booking.checkOut)} nights
                  </p>
                </div>
                <div>
                  <p className="text-stone-500">Guests</p>
                  <p className="font-medium text-stone-900">{booking.guests}</p>
                </div>
              </div>

              <hr className="border-stone-100" />

              <h3 className="text-sm font-semibold text-stone-900">Guest</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-stone-500">Name</p>
                  <p className="font-medium text-stone-900">
                    {booking.guest.firstName} {booking.guest.lastName}
                  </p>
                </div>
                {booking.guest.email && (
                  <div>
                    <p className="text-stone-500">Email</p>
                    <p className="font-medium text-stone-900">{booking.guest.email}</p>
                  </div>
                )}
                {booking.guest.phone && (
                  <div>
                    <p className="text-stone-500">Phone</p>
                    <p className="font-medium text-stone-900">{booking.guest.phone}</p>
                  </div>
                )}
              </div>

              {booking.specialRequests && (
                <>
                  <hr className="border-stone-100" />
                  <div className="text-sm">
                    <p className="text-stone-500">Special Requests</p>
                    <p className="mt-1 font-medium text-stone-900">{booking.specialRequests}</p>
                  </div>
                </>
              )}
            </div>

            {/* Rooms */}
            <div className="card space-y-3">
              <h3 className="text-sm font-semibold text-stone-900">Rooms</h3>
              {booking.rooms.map((room, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium text-stone-900">{room.roomTypeName}</p>
                    {room.roomNumber && (
                      <p className="text-xs text-stone-500">Room {room.roomNumber}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-stone-900">
                      {formatCurrency(room.pricePerNight)} /night
                    </p>
                    <p className="text-xs text-stone-500">x{room.quantity}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Payment */}
            <div className="card">
              <h3 className="text-sm font-semibold text-stone-900">Payment</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-stone-500">Method</p>
                  <p className="font-medium text-stone-900 capitalize">
                    {booking.paymentMethod.replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-stone-500">Status</p>
                  <StatusBadge status={booking.paymentStatus} />
                </div>
                <div className="col-span-2">
                  <p className="text-stone-500">Total Amount</p>
                  <p className="text-lg font-bold text-primary-700">
                    {formatCurrency(booking.totalAmount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Cancel action */}
            {canCancel && (
              <div className="card">
                {!cancelConfirm ? (
                  <Button
                    variant="danger"
                    size="md"
                    className="w-full"
                    onClick={() => setCancelConfirm(true)}
                  >
                    Cancel Booking
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-stone-700">
                      Are you sure you want to cancel this booking? This action cannot be undone.
                    </p>
                    {error && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                      </div>
                    )}
                    <div className="flex gap-3">
                      <Button
                        variant="secondary"
                        size="md"
                        className="flex-1"
                        onClick={() => {
                          setCancelConfirm(false);
                          setError('');
                        }}
                      >
                        Keep Booking
                      </Button>
                      <Button
                        variant="danger"
                        size="md"
                        className="flex-1"
                        loading={cancelling}
                        onClick={handleCancel}
                      >
                        Yes, Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
