# Lodge Management System - Technical Design Document

## 1. Architecture Overview

```
                    ┌─────────────────────────────────┐
                    │         Load Balancer            │
                    │   (subdomain routing)            │
                    └──────────┬──────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
     ┌────────▼────────┐              ┌────────▼────────┐
     │   Next.js Web   │              │   NestJS API    │
     │   (apps/web)    │─────────────▶│  (services/api) │
     │   SSR + CSR     │   REST API   │   Port 4000     │
     │   Port 3000     │              │                 │
     └─────────────────┘              └────────┬────────┘
                                               │
                                      ┌────────▼────────┐
                                      │   PostgreSQL    │
                                      │   Port 5432     │
                                      └─────────────────┘
```

### Monorepo Structure

```
lodge-manager/
├── apps/web/              # Next.js frontend (App Router)
├── services/api/          # NestJS backend
├── packages/shared/       # Shared types, constants, utils
├── docs/                  # Documentation
├── docker-compose.yml     # Dev environment
└── package.json           # Root workspace
```

### Request Flow

1. Browser hits `{lodgeSlug}.platform.com`
2. Next.js middleware extracts `lodgeSlug` from subdomain
3. All API calls include `x-tenant-slug` header (or resolved `tenantId`)
4. NestJS TenantGuard resolves slug → tenantId, injects into request
5. All services/repositories scope queries by `tenantId`

---

## 2. Multi-Tenancy Strategy

### Approach: Shared Database, Tenant Column

Every table (except `Tenant` itself) includes a `tenantId` column with a foreign key to the `Tenant` table.

### Enforcement Layers

1. **Database level**: Composite indexes include `tenantId` for performance
2. **ORM level**: Prisma middleware auto-injects `tenantId` into all queries
3. **API level**: `TenantGuard` resolves and validates tenant on every request
4. **Application level**: Services receive `tenantId` from request context

### Tenant Resolution

```
Request → Extract subdomain → Lookup Tenant by slug → Inject tenantId → Scope all queries
```

- Public routes: tenant resolved from subdomain
- Admin routes: tenant resolved from subdomain + validated against user's tenant
- Super Admin: can switch tenant context explicitly

### Data Isolation Rules

- No query may omit `tenantId` WHERE clause (enforced by Prisma middleware)
- Cross-tenant JOINs are architecturally impossible
- Tenant deletion is soft-delete only (sets `active = false`)

---

## 3. Authentication & Authorization

### Auth Flow

```
Login → Validate credentials → Issue JWT access token (15m) + refresh token (7d)
       → Store refresh token in httpOnly secure cookie
       → Access token in httpOnly secure cookie
```

### Token Structure

```typescript
// Access Token Payload
{
  sub: string;        // userId
  tenantId: string;   // current tenant
  roles: string[];    // role names
  type: 'access';
}

// Refresh Token Payload
{
  sub: string;
  tenantId: string;
  type: 'refresh';
  jti: string;        // unique token ID for revocation
}
```

### RBAC Design

```
User ──M:N──▶ Role ──M:N──▶ Permission
```

Permissions are string-based: `resource:action`
Examples: `reservation:create`, `payment:view`, `inventory:update`

### Role Hierarchy

| Role              | Scope    | Key Permissions                           |
|-------------------|----------|-------------------------------------------|
| Super Admin       | Platform | All (cross-tenant)                        |
| Owner             | Lodge    | All (within tenant)                       |
| Manager           | Lodge    | All except tenant settings                |
| Receptionist      | Lodge    | Reservations, check-in/out, guests        |
| Accountant        | Lodge    | Payments, income, expenses, reports       |
| Housekeeping      | Lodge    | Housekeeping tasks, room status           |
| Inventory Manager | Lodge    | Inventory, stock movements                |

### Guest Access (No Auth Required)

Guests interact with public endpoints that require NO authentication.
Booking management uses `bookingReference + lastName` as a lookup key.

**Future OTP Extension Point**: The `GuestVerification` interface is defined but not implemented. When OTP is needed, implement `OtpVerificationStrategy` that sends a code to phone/email and validates it. The booking management endpoint accepts an optional `verificationToken` field that is currently ignored but will be required when OTP is enabled.

---

## 4. Availability Algorithm

### Core Problem
Given a date range [checkIn, checkOut) and a room type, determine how many rooms are available.

### Algorithm

```
Available = TotalRooms(type, tenant) - BookedRooms(type, tenant, dateRange)
```

### Overlap Detection (PostgreSQL)

Two date ranges [A_start, A_end) and [B_start, B_end) overlap when:
```sql
A_start < B_end AND B_start < A_end
```

### Query

```sql
SELECT COUNT(DISTINCT rr."roomId")
FROM "ReservationRoom" rr
JOIN "Reservation" r ON rr."reservationId" = r.id
WHERE r."tenantId" = $tenantId
  AND rr."roomId" IN (SELECT id FROM "Room" WHERE "roomTypeId" = $roomTypeId)
  AND r.status NOT IN ('cancelled', 'no_show', 'checked_out')
  AND r."checkIn" < $checkOut
  AND r."checkOut" > $checkIn
```

### Double-Booking Prevention

1. **Optimistic locking**: Check availability in a transaction
2. **Database constraint**: Exclusion constraint on (roomId, daterange(checkIn, checkOut))
3. **Application check**: Verify room availability before INSERT, within a SERIALIZABLE transaction

### Implementation

```typescript
async checkAvailability(tenantId, roomTypeId, checkIn, checkOut): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const totalRooms = await tx.room.count({
      where: { tenantId, roomTypeId, status: 'available' }
    });

    const bookedRooms = await tx.reservationRoom.count({
      where: {
        room: { tenantId, roomTypeId },
        reservation: {
          tenantId,
          status: { notIn: ['cancelled', 'no_show', 'checked_out'] },
          checkIn: { lt: checkOut },
          checkOut: { gt: checkIn },
        }
      }
    });

    return totalRooms - bookedRooms;
  }, { isolationLevel: 'Serializable' });
}
```

---

## 5. Ledger Design (Append-Only)

### Principle
All financial mutations create new `LedgerEntry` records. No UPDATE or DELETE on financial data.

### LedgerEntry Structure

```
LedgerEntry {
  id
  tenantId
  type: DEBIT | CREDIT
  amount: Decimal (positive)
  category: ROOM_REVENUE | PAYMENT | REFUND | EXPENSE | ADJUSTMENT | DEPOSIT
  referenceType: RESERVATION | PAYMENT | EXPENSE | INCOME | ADJUSTMENT
  referenceId: string
  description: string
  balanceBefore: Decimal
  balanceAfter: Decimal
  createdBy: userId
  createdAt: timestamp (immutable)
}
```

### Rules

1. **Never UPDATE** a LedgerEntry row
2. **Never DELETE** a LedgerEntry row
3. **Corrections** create new offsetting entries (e.g., a refund creates a DEBIT entry)
4. **Balance** is always computed: SUM(CREDIT) - SUM(DEBIT)
5. **Audit trail** is inherent — every change is a new row

### Financial Reports

- **Revenue**: SUM of CREDIT entries where category = ROOM_REVENUE
- **Payments received**: SUM of CREDIT entries where category = PAYMENT
- **Expenses**: SUM of DEBIT entries where category = EXPENSE
- **Profit**: Revenue - Expenses
- **Daily cash-up**: Group by paymentMethod, date, SUM amounts

---

## 6. Payment Abstraction Design

### Interface

```typescript
interface PaymentProvider {
  initiatePayment(params: InitiatePaymentParams): Promise<PaymentInitResult>;
  verifyPayment(transactionRef: string): Promise<PaymentVerifyResult>;
  refundPayment(transactionRef: string, amount?: number): Promise<RefundResult>;
}

interface InitiatePaymentParams {
  amount: number;
  currency: string;
  reference: string;
  customerPhone?: string;
  customerEmail?: string;
  description: string;
  callbackUrl: string;
}

interface PaymentInitResult {
  success: boolean;
  transactionRef: string;
  redirectUrl?: string;   // For hosted checkout
  status: PaymentStatus;
}
```

### Provider Registry

```typescript
class PaymentProviderRegistry {
  private providers: Map<string, PaymentProvider>;

  register(name: string, provider: PaymentProvider): void;
  get(name: string): PaymentProvider;
  getDefault(): PaymentProvider;
}
```

### MVP Implementation

- `MockPaymentProvider`: Simulates success (90%) and failure (10%)
- Returns immediate result with generated transaction reference
- Can be configured per-tenant via `Tenant.paymentConfig` JSON field

### Future Providers

- Mobile Money (MTN, Airtel, etc.)
- Card payments (Stripe, Paystack, Flutterwave)
- Bank transfer

Each provider implements the same `PaymentProvider` interface.

---

## 7. Future OTP Extension Point

### Design (Not Implemented)

```typescript
// Defined but not implemented in MVP
interface GuestVerificationStrategy {
  sendVerification(contact: string, type: 'phone' | 'email'): Promise<{ sessionId: string }>;
  verify(sessionId: string, code: string): Promise<{ valid: boolean; token: string }>;
}

// MVP: No-op implementation
class NoOpVerificationStrategy implements GuestVerificationStrategy {
  async sendVerification() { return { sessionId: 'noop' }; }
  async verify() { return { valid: true, token: 'noop' }; }
}

// Future: OTP implementation
// class OtpVerificationStrategy implements GuestVerificationStrategy { ... }
```

### Integration Points

1. **Booking management endpoint**: Accepts optional `verificationToken` parameter
2. **Guest model**: Has `verified` boolean (default false, set true when OTP confirms)
3. **Config flag**: `tenant.features.requireOtp` (default false)
4. **Middleware hook**: `GuestVerificationGuard` that checks if OTP is required for tenant

When OTP is enabled:
- Guest enters phone/email → OTP sent → verified → booking management unlocked
- No changes to core booking logic needed

---

## 8. API Design Patterns

### Endpoint Structure

```
Public (no auth):
  POST   /api/v1/availability/search
  POST   /api/v1/bookings
  GET    /api/v1/bookings/:ref/manage?lastName=X

Admin (auth required):
  GET    /api/v1/admin/dashboard
  GET    /api/v1/admin/reservations
  POST   /api/v1/admin/reservations
  PATCH  /api/v1/admin/reservations/:id
  POST   /api/v1/admin/reservations/:id/check-in
  POST   /api/v1/admin/reservations/:id/check-out
  GET    /api/v1/admin/rooms
  ...
```

### Response Format

```typescript
{
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}
```

### Validation

- DTOs validated with `class-validator` decorators
- All inputs sanitized
- Date strings validated as ISO 8601
- Amounts validated as positive numbers with max 2 decimal places

### Rate Limiting

- Public booking endpoints: 20 req/min per IP
- Auth endpoints: 5 req/min per IP
- Admin endpoints: 100 req/min per user

---

## 9. Audit Logging

### Tracked Events

| Event                  | Data Captured                                |
|------------------------|----------------------------------------------|
| Reservation created    | Full reservation data                        |
| Reservation updated    | Changed fields (before/after)                |
| Status change          | Old status → new status                      |
| Payment recorded       | Amount, method, reference                    |
| Payment refunded       | Amount, reason                               |
| Room status changed    | Old → new status, reason                     |
| Stock movement         | Item, quantity, type, reason                 |
| User role changed      | User, old roles, new roles                   |
| Login/logout           | User, IP, timestamp                          |

### AuditLog Schema

```
AuditLog {
  id, tenantId, userId, action, entityType, entityId,
  before (JSON), after (JSON), ipAddress, userAgent, createdAt
}
```
