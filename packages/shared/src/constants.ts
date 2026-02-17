export const RESERVATION_STATUSES = [
  'inquiry',
  'pending',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show',
] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const ROOM_STATUSES = [
  'available',
  'occupied',
  'reserved',
  'dirty',
  'out_of_service',
] as const;

export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'initiated',
  'pending',
  'paid',
  'failed',
  'refunded',
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const LEDGER_ENTRY_TYPES = ['DEBIT', 'CREDIT'] as const;
export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

export const LEDGER_CATEGORIES = [
  'ROOM_REVENUE',
  'PAYMENT',
  'REFUND',
  'EXPENSE',
  'ADJUSTMENT',
  'DEPOSIT',
  'INCOME_OTHER',
] as const;
export type LedgerCategory = (typeof LEDGER_CATEGORIES)[number];

export const PAYMENT_METHODS = [
  'cash',
  'card',
  'mobile_money',
  'bank_transfer',
  'online',
  'pay_at_lodge',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const STOCK_MOVEMENT_TYPES = [
  'stock_in',
  'stock_out',
  'adjustment',
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const HOUSEKEEPING_STATUSES = [
  'pending',
  'in_progress',
  'done',
] as const;
export type HousekeepingStatus = (typeof HOUSEKEEPING_STATUSES)[number];

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  OWNER: 'owner',
  MANAGER: 'manager',
  RECEPTIONIST: 'receptionist',
  ACCOUNTANT: 'accountant',
  HOUSEKEEPING: 'housekeeping',
  INVENTORY_MANAGER: 'inventory_manager',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];
