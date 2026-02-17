'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate, nightsBetween } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

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
}

interface GuestInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialRequests: string;
}

export default function DetailsPage() {
  const router = useRouter();
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [guest, setGuest] = useState<GuestInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialRequests: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const stored = localStorage.getItem('bookingData');
    if (!stored) {
      router.push('/');
      return;
    }
    try {
      setBookingData(JSON.parse(stored));
    } catch {
      router.push('/');
    }
  }, [router]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!guest.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!guest.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!guest.email.trim() && !guest.phone.trim()) {
      newErrors.contact = 'Please provide at least an email address or phone number';
    }
    if (guest.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const detailsData = {
      ...bookingData,
      guest: {
        firstName: guest.firstName.trim(),
        lastName: guest.lastName.trim(),
        email: guest.email.trim() || undefined,
        phone: guest.phone.trim() || undefined,
      },
      specialRequests: guest.specialRequests.trim() || undefined,
    };
    localStorage.setItem('bookingData', JSON.stringify(detailsData));
    router.push('/booking/confirm');
  }

  function handleChange(field: keyof GuestInfo, value: string) {
    setGuest((prev) => ({ ...prev, [field]: value }));
    // Clear relevant errors
    if (field === 'firstName' || field === 'lastName') {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
    if (field === 'email' || field === 'phone') {
      setErrors((prev) => ({ ...prev, contact: '', email: '' }));
    }
  }

  if (!bookingData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  const nights = nightsBetween(bookingData.checkIn, bookingData.checkOut);

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
            <h1 className="text-lg font-semibold text-stone-900">Guest Details</h1>
            <p className="text-xs text-stone-500">Step 2 of 3</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Guest form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} id="details-form" className="card space-y-5">
              <h2 className="text-base font-semibold text-stone-900">Your Information</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="First Name"
                  required
                  value={guest.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  error={errors.firstName}
                  placeholder="John"
                  autoComplete="given-name"
                />
                <Input
                  label="Last Name"
                  required
                  value={guest.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  error={errors.lastName}
                  placeholder="Doe"
                  autoComplete="family-name"
                />
              </div>

              {errors.contact && (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  {errors.contact}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Email"
                  type="email"
                  value={guest.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  error={errors.email}
                  placeholder="john@example.com"
                  autoComplete="email"
                />
                <Input
                  label="Phone"
                  type="tel"
                  value={guest.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+1 234 567 890"
                  autoComplete="tel"
                />
              </div>

              <p className="text-xs text-stone-400">
                Please provide at least an email address or phone number so we can contact you.
              </p>

              <div>
                <label
                  htmlFor="special-requests"
                  className="mb-1.5 block text-sm font-medium text-stone-700"
                >
                  Special Requests
                </label>
                <textarea
                  id="special-requests"
                  rows={3}
                  value={guest.specialRequests}
                  onChange={(e) => handleChange('specialRequests', e.target.value)}
                  className="input-field resize-none"
                  placeholder="Any special requests or notes for your stay..."
                />
              </div>

              {/* Mobile: submit button inside form */}
              <div className="lg:hidden">
                <Button type="submit" size="lg" className="w-full">
                  Continue to Payment
                </Button>
              </div>
            </form>
          </div>

          {/* Booking summary sidebar */}
          <div className="order-first lg:order-last">
            <div className="card sticky top-20 space-y-4">
              <h2 className="text-base font-semibold text-stone-900">Booking Summary</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">Check-in</span>
                  <span className="font-medium text-stone-900">{formatDate(bookingData.checkIn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Check-out</span>
                  <span className="font-medium text-stone-900">{formatDate(bookingData.checkOut)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Duration</span>
                  <span className="font-medium text-stone-900">{nights} {nights === 1 ? 'night' : 'nights'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Guests</span>
                  <span className="font-medium text-stone-900">{bookingData.guests}</span>
                </div>
              </div>

              <hr className="border-stone-100" />

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-stone-700">Rooms</h3>
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

              <hr className="border-stone-100" />

              <div className="flex justify-between text-base font-semibold">
                <span className="text-stone-900">Total</span>
                <span className="text-primary-700">{formatCurrency(bookingData.totalPrice)}</span>
              </div>

              {/* Desktop: submit button in sidebar */}
              <div className="hidden lg:block">
                <Button type="submit" form="details-form" size="lg" className="w-full">
                  Continue to Payment
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
