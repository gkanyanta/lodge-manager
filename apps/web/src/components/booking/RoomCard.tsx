'use client';

import Image from 'next/image';
import { getRoomImages } from '@/lib/images';
import { formatCurrency, cn } from '@/lib/utils';

interface RoomCardShowcaseProps {
  variant: 'showcase';
  name: string;
  description: string;
  price: number;
  images?: string[];
}

interface RoomCardSelectableProps {
  variant: 'selectable';
  roomTypeId: string;
  name: string;
  description: string;
  maxOccupancy: number;
  amenities: string[];
  effectivePrice: number;
  availableCount: number;
  nights: number;
  selectedQty: number;
  onQuantityChange: (roomTypeId: string, quantity: number) => void;
  images?: string[];
}

type RoomCardProps = RoomCardShowcaseProps | RoomCardSelectableProps;

export default function RoomCard(props: RoomCardProps) {
  const images = getRoomImages(
    props.name,
    props.images,
  );
  const imageUrl = images[0];

  if (props.variant === 'showcase') {
    return (
      <div className="card-luxury group overflow-hidden">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={imageUrl}
            alt={props.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </div>
        <div className="p-5">
          <h3 className="font-serif text-xl font-bold text-stone-900">{props.name}</h3>
          <p className="mt-1 text-sm text-stone-500 line-clamp-2">{props.description}</p>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="font-serif text-xl font-bold text-gold-600">
              {formatCurrency(props.price)}
            </span>
            <span className="text-xs text-stone-400">/ night</span>
          </div>
        </div>
      </div>
    );
  }

  // Selectable variant
  const { roomTypeId, maxOccupancy, amenities, effectivePrice, availableCount, nights, selectedQty, onQuantityChange } = props;
  const isSelected = selectedQty > 0;

  return (
    <div
      className={cn(
        'card-luxury overflow-hidden transition-all duration-200',
        isSelected && 'ring-2 ring-gold-500 ring-offset-1',
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={imageUrl}
          alt={props.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {isSelected && (
          <div className="absolute top-3 right-3 rounded-full bg-gold-500 px-3 py-1 text-xs font-semibold text-white shadow">
            {selectedQty} selected
          </div>
        )}
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-lg font-bold text-stone-900">{props.name}</h3>
          <div className="text-right shrink-0">
            <p className="font-serif text-lg font-bold text-gold-600">
              {formatCurrency(effectivePrice)}
            </p>
            <p className="text-xs text-stone-400">per night</p>
          </div>
        </div>

        <p className="mt-1 text-sm text-stone-500 line-clamp-2">{props.description}</p>

        {/* Meta */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
          <span className="flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            Up to {maxOccupancy} guests
          </span>
          <span className="flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            {availableCount} available
          </span>
        </div>

        {/* Amenities */}
        {amenities && amenities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {amenities.slice(0, 4).map((amenity) => (
              <span
                key={amenity}
                className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-600"
              >
                {amenity}
              </span>
            ))}
            {amenities.length > 4 && (
              <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-400">
                +{amenities.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Price for stay & quantity selector */}
        <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
          <div>
            <p className="text-sm font-medium text-stone-900">
              {formatCurrency(effectivePrice * nights)} total
            </p>
            <p className="text-xs text-stone-500">
              for {nights} {nights === 1 ? 'night' : 'nights'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor={`qty-${roomTypeId}`} className="sr-only">
              Quantity for {props.name}
            </label>
            <select
              id={`qty-${roomTypeId}`}
              value={selectedQty}
              onChange={(e) => onQuantityChange(roomTypeId, Number(e.target.value))}
              className="input-field w-auto min-h-[44px] pr-8"
            >
              {Array.from({ length: availableCount + 1 }, (_, i) => (
                <option key={i} value={i}>
                  {i === 0 ? 'Select' : `${i} room${i > 1 ? 's' : ''}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
