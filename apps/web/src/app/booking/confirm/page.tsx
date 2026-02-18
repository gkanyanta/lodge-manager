'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getTenantSlugFromClient } from '@/lib/tenant';
import { formatCurrency, formatDate, nightsBetween } from '@/lib/utils';
import Button from '@/components/ui/Button';

interface SelectedRoom {
  roomTypeId: string;
  name: string;
  quantity: number;
  pricePerNight: number;
}

interface BookingData {
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: SelectedRoom[];
  nights: number;
  totalPrice: number;
  guest: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  specialRequests?: string;
}

interface BookingResponse {
  data: {
    id: string;
    bookingReference: string;
    status: string;
    checkIn: string;
    checkOut: string;
    totalAmount: number;
  };
}

export default function ConfirmPage() {
  const router = useRouter();
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pay_at_lodge' | 'online'>('pay_at_lodge');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<BookingResponse['data'] | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('bookingData');
    if (!stored) {
      router.push('/');
      return;
    }
    try {
      const data = JSON.parse(stored);
      if (!data.guest) {
        router.push('/booking/details');
        return;
      }
      setBookingData(data);
    } catch {
      router.push('/');
    }
  }, [router]);

  async function handleConfirm() {
    if (!bookingData || !termsAccepted) return;

    setSubmitting(true);
    setError('');

    try {
      const tenantSlug = getTenantSlugFromClient();
      const payload = {
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        guests: bookingData.guests,
        rooms: bookingData.rooms.map((r) => ({
          roomTypeId: r.roomTypeId,
          quantity: r.quantity,
        })),
        guest: bookingData.guest,
        specialRequests: bookingData.specialRequests,
        paymentMethod,
      };

      const response = await api.post<BookingResponse>(
        '/bookings',
        payload,
        { tenantSlug },
      );

      setConfirmation(response.data);
      localStorage.removeItem('bookingData');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // --- Confirmation Success Screen ---
  if (confirmation) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="card mx-auto w-full max-w-md text-center">
          {/* Green checkmark */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>

          <h1 className="mt-4 font-serif text-2xl font-bold text-stone-900">Booking Confirmed!</h1>
          <p className="mt-1 text-sm text-stone-500">Your reservation has been created.</p>

          {/* Reference */}
          <div className="mt-6 rounded-lg bg-stone-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
              Booking Reference
            </p>
            <p className="mt-1 font-serif text-2xl font-bold tracking-wide text-gold-600">
              {confirmation.bookingReference}
            </p>
          </div>

          <p className="mt-3 text-xs text-stone-500">
            Save this reference to manage your booking later.
          </p>

          {/* Summary */}
          <div className="mt-6 space-y-2 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">Check-in</span>
              <span className="font-medium text-stone-900">{formatDate(confirmation.checkIn)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Check-out</span>
              <span className="font-medium text-stone-900">{formatDate(confirmation.checkOut)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Total</span>
              <span className="font-semibold text-gold-600">
                {formatCurrency(confirmation.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Status</span>
              <span className="badge-green">{confirmation.status}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-3">
            <a
              href={`/booking/manage?ref=${confirmation.bookingReference}`}
              className="btn-primary block w-full text-center min-h-[44px] leading-[44px]"
            >
              Manage Booking
            </a>
            <a
              href="/"
              className="btn-secondary block w-full text-center min-h-[44px] leading-[44px]"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  // --- Loading state ---
  if (!bookingData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  const nights = nightsBetween(bookingData.checkIn, bookingData.checkOut);

  // --- Confirm & Pay Form ---
  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
            aria-label="Go back"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div>
            <h1 className="font-serif text-lg font-bold text-stone-900">Confirm & Pay</h1>
            <p className="text-xs text-stone-500">Step 3 of 3</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Booking summary */}
            <div className="card space-y-4">
              <h2 className="text-base font-semibold text-stone-900">Booking Summary</h2>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-stone-500">Check-in</p>
                  <p className="font-medium text-stone-900">{formatDate(bookingData.checkIn)}</p>
                </div>
                <div>
                  <p className="text-stone-500">Check-out</p>
                  <p className="font-medium text-stone-900">{formatDate(bookingData.checkOut)}</p>
                </div>
                <div>
                  <p className="text-stone-500">Duration</p>
                  <p className="font-medium text-stone-900">{nights} {nights === 1 ? 'night' : 'nights'}</p>
                </div>
                <div>
                  <p className="text-stone-500">Guests</p>
                  <p className="font-medium text-stone-900">{bookingData.guests}</p>
                </div>
              </div>

              <hr className="border-stone-100" />

              <div className="space-y-2">
                {bookingData.rooms.map((room) => (
                  <div key={room.roomTypeId} className="flex justify-between text-sm">
                    <span className="text-stone-600">
                      {room.name} x{room.quantity}
                    </span>
                    <span className="font-medium text-stone-900">
                      {formatCurrency(room.pricePerNight * room.quantity * nights)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Guest info review */}
            <div className="card space-y-3">
              <h2 className="text-base font-semibold text-stone-900">Guest Information</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-stone-500">Name</p>
                  <p className="font-medium text-stone-900">
                    {bookingData.guest.firstName} {bookingData.guest.lastName}
                  </p>
                </div>
                {bookingData.guest.email && (
                  <div>
                    <p className="text-stone-500">Email</p>
                    <p className="font-medium text-stone-900">{bookingData.guest.email}</p>
                  </div>
                )}
                {bookingData.guest.phone && (
                  <div>
                    <p className="text-stone-500">Phone</p>
                    <p className="font-medium text-stone-900">{bookingData.guest.phone}</p>
                  </div>
                )}
              </div>
              {bookingData.specialRequests && (
                <div className="text-sm">
                  <p className="text-stone-500">Special Requests</p>
                  <p className="font-medium text-stone-900">{bookingData.specialRequests}</p>
                </div>
              )}
            </div>

            {/* Payment method */}
            <div className="card space-y-4">
              <h2 className="text-base font-semibold text-stone-900">Payment Method</h2>

              <div className="space-y-3">
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors min-h-[44px] ${
                    paymentMethod === 'pay_at_lodge'
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="pay_at_lodge"
                    checked={paymentMethod === 'pay_at_lodge'}
                    onChange={() => setPaymentMethod('pay_at_lodge')}
                    className="mt-0.5 h-4 w-4 text-primary-600 focus:ring-primary-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-stone-900">Pay at Lodge</p>
                    <p className="text-xs text-stone-500">
                      Pay when you arrive. Cash, card, or mobile payment accepted.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors min-h-[44px] ${
                    paymentMethod === 'online'
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="online"
                    checked={paymentMethod === 'online'}
                    onChange={() => setPaymentMethod('online')}
                    className="mt-0.5 h-4 w-4 text-primary-600 focus:ring-primary-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-stone-900">Pay Online</p>
                    <p className="text-xs text-stone-500">
                      Secure online payment &mdash; coming soon.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Terms */}
            <div className="card">
              <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-primary-600 focus:ring-primary-600"
                />
                <span className="text-sm text-stone-600">
                  I agree to the booking terms and conditions, including the cancellation policy.
                  I understand that this booking is subject to availability confirmation.
                </span>
              </label>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Mobile: confirm button */}
            <div className="lg:hidden">
              <Button
                onClick={handleConfirm}
                loading={submitting}
                disabled={!termsAccepted}
                size="lg"
                className="w-full"
              >
                Confirm Booking
              </Button>
            </div>
          </div>

          {/* Sidebar: price summary + confirm */}
          <div className="order-first lg:order-last">
            <div className="card sticky top-20 space-y-4 border-t-2 border-gold-400">
              <h2 className="font-serif text-base font-semibold text-stone-900">Price Summary</h2>

              <div className="space-y-2 text-sm">
                {bookingData.rooms.map((room) => (
                  <div key={room.roomTypeId} className="flex justify-between">
                    <span className="text-stone-500">
                      {room.name} x{room.quantity} ({nights}n)
                    </span>
                    <span className="text-stone-900">
                      {formatCurrency(room.pricePerNight * room.quantity * nights)}
                    </span>
                  </div>
                ))}
              </div>

              <hr className="border-stone-100" />

              <div className="flex justify-between text-base font-semibold">
                <span className="text-stone-900">Total</span>
                <span className="text-gold-600">{formatCurrency(bookingData.totalPrice)}</span>
              </div>

              <div className="hidden lg:block">
                <Button
                  onClick={handleConfirm}
                  loading={submitting}
                  disabled={!termsAccepted}
                  size="lg"
                  className="w-full"
                >
                  Confirm Booking
                </Button>
                {!termsAccepted && (
                  <p className="mt-2 text-center text-xs text-stone-400">
                    Please accept the terms to continue
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
