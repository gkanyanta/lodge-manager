import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    inquiry: 'badge-gray',
    pending: 'badge-yellow',
    confirmed: 'badge-blue',
    checked_in: 'badge-green',
    checked_out: 'badge-gray',
    cancelled: 'badge-red',
    no_show: 'badge-red',
    available: 'badge-green',
    occupied: 'badge-blue',
    reserved: 'badge-yellow',
    dirty: 'badge-red',
    out_of_service: 'badge-gray',
    paid: 'badge-green',
    failed: 'badge-red',
    refunded: 'badge-yellow',
    initiated: 'badge-gray',
    done: 'badge-green',
    in_progress: 'badge-blue',
  };
  return colors[status] || 'badge-gray';
}

export function nightsBetween(checkIn: string | Date, checkOut: string | Date): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
