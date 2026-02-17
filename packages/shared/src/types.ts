import type {
  ReservationStatus,
  PaymentStatus,
  PaymentMethod,
  LedgerEntryType,
  LedgerCategory,
  RoomStatus,
} from './constants';

// API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Auth
export interface JwtPayload {
  sub: string;
  tenantId: string;
  roles: string[];
  type: 'access' | 'refresh';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
  };
  accessToken: string;
}

// Availability
export interface AvailabilitySearchRequest {
  checkIn: string; // ISO date
  checkOut: string; // ISO date
  guests: number;
}

export interface RoomTypeAvailability {
  roomTypeId: string;
  name: string;
  description: string;
  maxOccupancy: number;
  basePrice: number;
  effectivePrice: number;
  availableCount: number;
  amenities: string[];
  images: string[];
}

// Booking
export interface CreateBookingRequest {
  checkIn: string;
  checkOut: string;
  rooms: { roomTypeId: string; quantity: number }[];
  guest: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  specialRequests?: string;
  paymentMethod: PaymentMethod;
}

export interface BookingConfirmation {
  bookingReference: string;
  status: ReservationStatus;
  checkIn: string;
  checkOut: string;
  guest: {
    firstName: string;
    lastName: string;
  };
  rooms: {
    roomTypeName: string;
    roomNumber?: string;
    pricePerNight: number;
  }[];
  totalAmount: number;
  paymentStatus: PaymentStatus;
}

export interface ManageBookingRequest {
  bookingReference: string;
  lastName: string;
  verificationToken?: string; // Future OTP support
}

// Payment Provider Interface
export interface InitiatePaymentParams {
  amount: number;
  currency: string;
  reference: string;
  customerPhone?: string;
  customerEmail?: string;
  description: string;
  callbackUrl: string;
}

export interface PaymentInitResult {
  success: boolean;
  transactionRef: string;
  redirectUrl?: string;
  status: PaymentStatus;
}

export interface PaymentVerifyResult {
  success: boolean;
  transactionRef: string;
  amount: number;
  status: PaymentStatus;
}

export interface RefundResult {
  success: boolean;
  transactionRef: string;
  refundedAmount: number;
  status: PaymentStatus;
}

// Dashboard
export interface DashboardSummary {
  todayArrivals: number;
  todayDepartures: number;
  occupancyPercent: number;
  totalRooms: number;
  occupiedRooms: number;
  revenueToday: number;
  revenueMonth: number;
  pendingReservations: number;
}

// Guest Verification Strategy (future OTP)
export interface GuestVerificationStrategy {
  sendVerification(
    contact: string,
    type: 'phone' | 'email',
  ): Promise<{ sessionId: string }>;
  verify(
    sessionId: string,
    code: string,
  ): Promise<{ valid: boolean; token: string }>;
}
