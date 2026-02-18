'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SearchFormProps {
  variant?: 'hero' | 'standalone';
}

export default function SearchForm({ variant = 'hero' }: SearchFormProps) {
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

  const isHero = variant === 'hero';

  return (
    <form
      onSubmit={handleSubmit}
      className={
        isHero
          ? 'w-full max-w-4xl rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md sm:p-8'
          : 'card mx-auto w-full max-w-lg'
      }
    >
      <div className={`grid gap-4 ${isHero ? 'sm:grid-cols-4 items-end' : 'space-y-4'}`}>
        {/* Check-in */}
        <div>
          <label
            htmlFor="search-check-in"
            className={`mb-1.5 block text-sm font-medium ${
              isHero ? 'text-white/90' : 'text-stone-700'
            }`}
          >
            Check-in
          </label>
          <input
            id="search-check-in"
            type="date"
            value={checkIn}
            min={today}
            onChange={(e) => {
              setCheckIn(e.target.value);
              setErrors((prev) => ({ ...prev, checkIn: '' }));
            }}
            className={
              isHero
                ? 'block w-full rounded-lg border border-white/30 bg-white/20 px-3 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50'
                : 'input-field'
            }
          />
          {errors.checkIn && (
            <p className={`mt-1 text-sm ${isHero ? 'text-red-300' : 'text-red-600'}`}>
              {errors.checkIn}
            </p>
          )}
        </div>

        {/* Check-out */}
        <div>
          <label
            htmlFor="search-check-out"
            className={`mb-1.5 block text-sm font-medium ${
              isHero ? 'text-white/90' : 'text-stone-700'
            }`}
          >
            Check-out
          </label>
          <input
            id="search-check-out"
            type="date"
            value={checkOut}
            min={checkIn || today}
            onChange={(e) => {
              setCheckOut(e.target.value);
              setErrors((prev) => ({ ...prev, checkOut: '' }));
            }}
            className={
              isHero
                ? 'block w-full rounded-lg border border-white/30 bg-white/20 px-3 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50'
                : 'input-field'
            }
          />
          {errors.checkOut && (
            <p className={`mt-1 text-sm ${isHero ? 'text-red-300' : 'text-red-600'}`}>
              {errors.checkOut}
            </p>
          )}
        </div>

        {/* Guests */}
        <div>
          <label
            htmlFor="search-guests"
            className={`mb-1.5 block text-sm font-medium ${
              isHero ? 'text-white/90' : 'text-stone-700'
            }`}
          >
            Guests
          </label>
          <select
            id="search-guests"
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className={
              isHero
                ? 'block w-full rounded-lg border border-white/30 bg-white/20 px-3 py-2.5 text-sm text-white focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50'
                : 'input-field'
            }
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n} className="text-stone-900">
                {n} {n === 1 ? 'Guest' : 'Guests'}
              </option>
            ))}
          </select>
          {errors.guests && (
            <p className={`mt-1 text-sm ${isHero ? 'text-red-300' : 'text-red-600'}`}>
              {errors.guests}
            </p>
          )}
        </div>

        {/* Submit */}
        <div className={isHero ? '' : 'pt-2'}>
          <button
            type="submit"
            className={
              isHero
                ? 'w-full rounded-lg bg-gold-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-gold-600 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400/50 min-h-[42px]'
                : 'btn-primary w-full min-h-[44px]'
            }
          >
            Search Availability
          </button>
        </div>
      </div>
    </form>
  );
}
