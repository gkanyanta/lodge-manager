'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { getTenantSlugFromClient } from '@/lib/tenant';
import { formatCurrency, nightsBetween } from '@/lib/utils';
import { getRoomImages } from '@/lib/images';
import Button from '@/components/ui/Button';
import RoomCard from '@/components/booking/RoomCard';

interface RoomTypeResult {
  roomTypeId: string;
  name: string;
  description: string;
  maxOccupancy: number;
  amenities: string[];
  effectivePrice: number;
  basePrice: number;
  availableCount: number;
  images?: string[];
}

interface SearchResponse {
  data: RoomTypeResult[];
}

interface SelectedRoom {
  roomTypeId: string;
  name: string;
  quantity: number;
  pricePerNight: number;
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gold-200 border-t-gold-600" /></div>}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const guests = Number(searchParams.get('guests')) || 2;

  const nights = useMemo(
    () => (checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0),
    [checkIn, checkOut],
  );

  const [results, setResults] = useState<RoomTypeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selections, setSelections] = useState<Record<string, number>>({});

  const tenantSlug = useMemo(() => getTenantSlugFromClient(), []);

  const fetchResults = useCallback(async () => {
    if (!checkIn || !checkOut) {
      setError('Missing search dates. Please go back and search again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post<SearchResponse>(
        '/availability/search',
        { checkIn, checkOut, guests },
        { tenantSlug },
      );
      setResults(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search availability.');
    } finally {
      setLoading(false);
    }
  }, [checkIn, checkOut, guests, tenantSlug]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  function handleQuantityChange(roomTypeId: string, quantity: number) {
    setSelections((prev) => {
      const next = { ...prev };
      if (quantity === 0) {
        delete next[roomTypeId];
      } else {
        next[roomTypeId] = quantity;
      }
      return next;
    });
  }

  const selectedRooms: SelectedRoom[] = useMemo(() => {
    return Object.entries(selections)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const room = results.find((r) => r.roomTypeId === id);
        return {
          roomTypeId: id,
          name: room?.name || '',
          quantity: qty,
          pricePerNight: room?.effectivePrice || 0,
        };
      });
  }, [selections, results]);

  const totalRooms = selectedRooms.reduce((sum, r) => sum + r.quantity, 0);
  const totalPrice = selectedRooms.reduce(
    (sum, r) => sum + r.quantity * r.pricePerNight * nights,
    0,
  );

  function handleContinue() {
    const bookingData = {
      checkIn,
      checkOut,
      guests,
      rooms: selectedRooms,
      nights,
      totalPrice,
    };
    localStorage.setItem('bookingData', JSON.stringify(bookingData));
    router.push('/booking/details');
  }

  function parseImages(room: RoomTypeResult): string[] {
    if (!room.images) return [];
    if (Array.isArray(room.images)) return room.images;
    try {
      const parsed = JSON.parse(room.images as unknown as string);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-32">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
            aria-label="Go back"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-lg font-bold text-stone-900 truncate">Available Rooms</h1>
            <p className="text-xs text-stone-500">
              {checkIn} to {checkOut} &middot; {guests} {guests === 1 ? 'guest' : 'guests'} &middot; {nights} {nights === 1 ? 'night' : 'nights'}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-stone-950/5">
                <div className="aspect-[16/10] bg-stone-200" />
                <div className="p-5">
                  <div className="h-5 w-2/3 rounded bg-stone-200" />
                  <div className="mt-3 h-4 w-full rounded bg-stone-100" />
                  <div className="mt-2 h-4 w-4/5 rounded bg-stone-100" />
                  <div className="mt-4 flex gap-2">
                    <div className="h-6 w-16 rounded-full bg-stone-100" />
                    <div className="h-6 w-16 rounded-full bg-stone-100" />
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
                    <div className="h-6 w-24 rounded bg-stone-200" />
                    <div className="h-9 w-24 rounded bg-stone-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="card border-l-4 border-red-500 text-center">
            <p className="text-sm text-red-700">{error}</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => router.push('/')}>
              Back to Search
            </Button>
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="card text-center">
            <svg className="mx-auto h-12 w-12 text-stone-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
            </svg>
            <h3 className="mt-3 font-serif text-base font-semibold text-stone-900">No rooms available</h3>
            <p className="mt-1 text-sm text-stone-500">
              No rooms are available for the selected dates. Try different dates.
            </p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => router.push('/')}>
              Change Dates
            </Button>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((room) => (
              <RoomCard
                key={room.roomTypeId}
                variant="selectable"
                roomTypeId={room.roomTypeId}
                name={room.name}
                description={room.description}
                maxOccupancy={room.maxOccupancy}
                amenities={room.amenities}
                effectivePrice={room.effectivePrice}
                availableCount={room.availableCount}
                nights={nights}
                selectedQty={selections[room.roomTypeId] || 0}
                onQuantityChange={handleQuantityChange}
                images={parseImages(room)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Bottom bar */}
      {totalRooms > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-20 border-t border-stone-200 bg-white px-4 py-3 shadow-lg sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-900">
                {totalRooms} {totalRooms === 1 ? 'room' : 'rooms'} selected
              </p>
              <p className="text-xs text-stone-500">
                {formatCurrency(totalPrice)} for {nights} {nights === 1 ? 'night' : 'nights'}
              </p>
            </div>
            <button
              onClick={handleContinue}
              className="rounded-lg bg-gold-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gold-600 min-h-[44px]"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
