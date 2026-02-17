'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

export default function HomePage() {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [guests, setGuests] = useState(2);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!checkIn) newErrors.checkIn = 'Check-in date is required';
    if (!checkOut) newErrors.checkOut = 'Check-out date is required';
    if (checkIn && checkOut && checkIn >= checkOut) {
      newErrors.checkOut = 'Check-out must be after check-in';
    }
    if (guests < 1) newErrors.guests = 'At least 1 guest required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const params = new URLSearchParams({
      checkIn,
      checkOut,
      guests: guests.toString(),
    });
    router.push(`/booking/search?${params.toString()}`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
          <span className="text-lg font-bold text-stone-900">Lodge Manager</span>
        </div>
        <a
          href="/booking/manage"
          className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors min-h-[44px] flex items-center"
        >
          Manage Booking
        </a>
      </header>

      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-12 sm:px-6">
        <div className="w-full max-w-2xl text-center">
          {/* Hero text */}
          <div className="mb-8 sm:mb-12">
            <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl lg:text-5xl">
              Your Perfect
              <span className="block text-primary-600">Lodge Getaway</span>
            </h1>
            <p className="mt-4 text-base text-stone-600 sm:text-lg">
              Escape the everyday. Discover comfort, nature, and unforgettable experiences
              at our lodge.
            </p>
          </div>

          {/* Search Form */}
          <form
            onSubmit={handleSubmit}
            className="card mx-auto w-full max-w-lg"
          >
            <h2 className="mb-4 text-lg font-semibold text-stone-900">
              Find Your Stay
            </h2>

            <div className="space-y-4">
              {/* Check-in */}
              <div>
                <label
                  htmlFor="check-in"
                  className="mb-1.5 block text-sm font-medium text-stone-700"
                >
                  Check-in
                </label>
                <input
                  id="check-in"
                  type="date"
                  value={checkIn}
                  min={today}
                  onChange={(e) => {
                    setCheckIn(e.target.value);
                    setErrors((prev) => ({ ...prev, checkIn: '' }));
                  }}
                  className="input-field"
                />
                {errors.checkIn && (
                  <p className="mt-1 text-sm text-red-600">{errors.checkIn}</p>
                )}
              </div>

              {/* Check-out */}
              <div>
                <label
                  htmlFor="check-out"
                  className="mb-1.5 block text-sm font-medium text-stone-700"
                >
                  Check-out
                </label>
                <input
                  id="check-out"
                  type="date"
                  value={checkOut}
                  min={checkIn || today}
                  onChange={(e) => {
                    setCheckOut(e.target.value);
                    setErrors((prev) => ({ ...prev, checkOut: '' }));
                  }}
                  className="input-field"
                />
                {errors.checkOut && (
                  <p className="mt-1 text-sm text-red-600">{errors.checkOut}</p>
                )}
              </div>

              {/* Guests */}
              <div>
                <label
                  htmlFor="guests"
                  className="mb-1.5 block text-sm font-medium text-stone-700"
                >
                  Guests
                </label>
                <select
                  id="guests"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="input-field"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'Guest' : 'Guests'}
                    </option>
                  ))}
                </select>
                {errors.guests && (
                  <p className="mt-1 text-sm text-red-600">{errors.guests}</p>
                )}
              </div>

              <Button type="submit" size="lg" className="w-full">
                Search Availability
              </Button>
            </div>
          </form>

          {/* Features */}
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-2 rounded-lg p-4">
              <svg className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <h3 className="text-sm font-semibold text-stone-900">Instant Confirmation</h3>
              <p className="text-xs text-stone-500">Book now, confirm instantly</p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg p-4">
              <svg className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
              <h3 className="text-sm font-semibold text-stone-900">Best Price</h3>
              <p className="text-xs text-stone-500">No hidden fees, guaranteed</p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg p-4">
              <svg className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
              <h3 className="text-sm font-semibold text-stone-900">24/7 Support</h3>
              <p className="text-xs text-stone-500">We are here to help</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 px-4 py-6 text-center text-xs text-stone-500 sm:px-6">
        <p>Powered by Lodge Manager</p>
      </footer>
    </div>
  );
}
