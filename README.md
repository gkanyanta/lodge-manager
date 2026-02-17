# Lodge Manager

A production-grade, multi-tenant Lodge Management System built as a mobile-first web application (PWA-ready).

## Architecture

```
lodge-manager/
├── apps/web/              # Next.js 14 frontend (App Router, Tailwind CSS)
├── services/api/          # NestJS backend (REST API, Prisma ORM)
├── packages/shared/       # Shared types, constants, utilities
├── docs/                  # Technical design documentation
└── docker-compose.yml     # Development environment
```

### Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend  | NestJS, TypeScript, Prisma ORM      |
| Database | PostgreSQL 16                       |
| Auth     | JWT + Refresh Tokens (httpOnly cookies) |
| DevOps   | Docker Compose                      |

## Features

### Public Guest Booking
- **No account required** — guests book using phone/email
- Search availability by dates and guest count
- Select room types and quantities
- Enter guest details and confirm booking
- Pay at lodge or online (mock provider)
- Manage booking via reference + last name

### Admin Dashboard
- Today's arrivals and departures
- Occupancy percentage and revenue summary
- Reservation management with calendar view
- Check-in / check-out flows
- Room status board

### Financial Management
- Payment recording with ledger system
- Income and expense tracking
- Daily cash-up reports
- Revenue and profit reports
- CSV export

### Inventory & Housekeeping
- Stock management with movements tracking
- Low stock alerts
- Housekeeping task assignment and tracking
- Room status updates after cleaning

### Multi-Tenancy
- Subdomain-based routing (`{lodge}.platform.com`)
- Strict data isolation via `tenantId` on all records
- Role-Based Access Control (RBAC)

## Quick Start

### Prerequisites
- Node.js 20+
- Docker and Docker Compose
- npm 9+

### 1. Clone and Install

```bash
git clone <repository-url>
cd lodge-manager
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your settings (defaults work for local dev)
```

### 3. Start Database

```bash
docker compose up -d postgres
```

### 4. Setup Database

```bash
cd services/api
npx prisma migrate dev --name init
npx prisma generate
npm run db:seed
cd ../..
```

### 5. Start Development Servers

```bash
# Start both API and Web
npm run dev

# Or start individually:
npm run dev:api   # API on http://localhost:4000
npm run dev:web   # Web on http://localhost:3000
```

### 6. Access the Application

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Public booking page |
| http://localhost:3000/admin/login | Admin login |
| http://localhost:4000/api/docs | Swagger API documentation |

### Demo Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@sunsetlodge.com | admin123 | Owner |

### Tenant Header (Development)

In development without subdomains, pass the tenant slug via header:

```bash
curl -H "x-tenant-slug: demo" http://localhost:4000/api/v1/availability/search
```

Or via query parameter: `?tenant=demo`

## Full Docker Development

```bash
docker compose up --build
```

This starts:
- **PostgreSQL** on port 5432
- **API** on port 4000
- **Web** on port 3000

## API Documentation

Interactive Swagger docs available at: `http://localhost:4000/api/docs`

### Key Endpoints

#### Public (No Auth)
```
POST /api/v1/availability/search    # Search room availability
POST /api/v1/bookings               # Create a booking
POST /api/v1/bookings/manage        # Look up booking by reference
POST /api/v1/bookings/:ref/cancel   # Cancel a booking
```

#### Admin (JWT Auth Required)
```
GET  /api/v1/admin/dashboard        # Dashboard summary
GET  /api/v1/admin/reservations     # List reservations
POST /api/v1/admin/reservations     # Create reservation (walk-in)
POST /api/v1/admin/reservations/:id/check-in
POST /api/v1/admin/reservations/:id/check-out
GET  /api/v1/admin/rooms            # Room management
POST /api/v1/admin/payments         # Record payment
GET  /api/v1/admin/reports/revenue  # Revenue report
GET  /api/v1/admin/reports/profit   # Profit summary
```

## Roles & Permissions

| Role | Scope | Access |
|------|-------|--------|
| Super Admin | Platform | Everything, cross-tenant |
| Owner | Lodge | Everything within tenant |
| Manager | Lodge | All except tenant settings |
| Receptionist | Lodge | Reservations, check-in/out, guests |
| Accountant | Lodge | Payments, income, expenses, reports |
| Housekeeping | Lodge | Tasks, room status |
| Inventory Manager | Lodge | Inventory, stock |

## Key Design Decisions

### Append-Only Ledger
All financial records use an append-only `LedgerEntry` system. No financial data is ever updated or deleted — corrections create new offsetting entries.

### Payment Abstraction
A `PaymentProvider` interface allows plugging in different payment gateways. The MVP ships with a `MockPaymentProvider`. Future providers (Stripe, mobile money) implement the same interface.

### Guest Verification (OTP-Ready)
The system is designed so OTP verification can be added without refactoring. A `GuestVerificationStrategy` interface is defined, with a no-op implementation for MVP. When OTP is needed, implement the interface and enable via tenant settings.

### Double-Booking Prevention
Availability checks use PostgreSQL transactions with SERIALIZABLE isolation level. Date overlap detection uses the standard algorithm: `existingCheckIn < requestedCheckOut AND existingCheckOut > requestedCheckIn`.

## Testing

```bash
cd services/api
npm test                    # Run all tests
npm run test:watch          # Watch mode
```

### Test Coverage
- Availability overlap detection
- Ledger append-only enforcement
- Reservation creation and status transitions
- Payment recording and refunds

## Project Structure

### API Modules
```
services/api/src/modules/
├── auth/           # JWT authentication, login/logout
├── tenants/        # Tenant management
├── users/          # User CRUD, role assignment
├── rooms/          # Rooms, room types, rate plans
├── availability/   # Availability search engine
├── bookings/       # Public booking flow
├── reservations/   # Admin reservation management
├── guests/         # Guest management
├── payments/       # Payments, refunds, provider abstraction
├── dashboard/      # Dashboard metrics
├── income/         # Income tracking
├── expenses/       # Expense tracking
├── inventory/      # Inventory management
├── housekeeping/   # Housekeeping tasks
├── audit/          # Audit logging
└── reports/        # Financial reports, CSV export
```

### Web Pages
```
apps/web/src/app/
├── page.tsx                  # Public landing / search
├── booking/
│   ├── search/page.tsx       # Room availability results
│   ├── details/page.tsx      # Guest details form
│   ├── confirm/page.tsx      # Booking confirmation
│   └── manage/page.tsx       # Manage existing booking
└── admin/
    ├── login/page.tsx        # Admin login
    ├── dashboard/page.tsx    # Dashboard
    ├── reservations/page.tsx # Reservation list + calendar
    ├── rooms/page.tsx        # Room management
    ├── payments/page.tsx     # Payment list
    ├── income/page.tsx       # Income tracking
    ├── expenses/page.tsx     # Expense tracking
    ├── inventory/page.tsx    # Inventory management
    ├── housekeeping/page.tsx # Housekeeping tasks
    ├── reports/page.tsx      # Reports
    └── users/page.tsx        # User management
```

## License

Private — All rights reserved.
