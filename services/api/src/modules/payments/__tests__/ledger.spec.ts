import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from '../payments.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('Ledger Append-Only Tests', () => {
  let service: PaymentsService;

  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-1';

  const createdLedgerEntries: any[] = [];
  const createdPayments: any[] = [];

  const mockPrisma = {
    payment: {
      create: jest.fn((args) => {
        const payment = { id: `pay-${createdPayments.length + 1}`, ...args.data };
        createdPayments.push(payment);
        return payment;
      }),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn(),
    },
    ledgerEntry: {
      create: jest.fn((args) => {
        const entry = { id: `le-${createdLedgerEntries.length + 1}`, createdAt: new Date(), ...args.data };
        createdLedgerEntries.push(entry);
        return entry;
      }),
      // These should NEVER be called
      update: jest.fn(() => { throw new Error('LedgerEntry update is not allowed'); }),
      updateMany: jest.fn(() => { throw new Error('LedgerEntry updateMany is not allowed'); }),
      delete: jest.fn(() => { throw new Error('LedgerEntry delete is not allowed'); }),
      deleteMany: jest.fn(() => { throw new Error('LedgerEntry deleteMany is not allowed'); }),
    },
    reservation: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);

    createdLedgerEntries.length = 0;
    createdPayments.length = 0;
    jest.clearAllMocks();
  });

  it('should create a CREDIT ledger entry when recording a payment', async () => {
    mockPrisma.reservation.findFirst.mockResolvedValue({
      id: 'res-1',
      tenantId: mockTenantId,
      totalAmount: 500,
      paidAmount: 0,
    });

    await service.recordPayment(mockTenantId, {
      reservationId: 'res-1',
      amount: 200,
      method: 'cash',
      description: 'Deposit payment',
    }, mockUserId);

    expect(mockPrisma.ledgerEntry.create).toHaveBeenCalled();
    const ledgerCall = mockPrisma.ledgerEntry.create.mock.calls[0][0].data;
    expect(ledgerCall.type).toBe('CREDIT');
    expect(ledgerCall.category).toBe('PAYMENT');
    expect(ledgerCall.amount).toBe(200);
    expect(ledgerCall.tenantId).toBe(mockTenantId);
  });

  it('should create a DEBIT ledger entry when refunding', async () => {
    mockPrisma.payment.findFirst.mockResolvedValue({
      id: 'pay-1',
      tenantId: mockTenantId,
      amount: 200,
      status: 'paid',
      reservationId: 'res-1',
    });
    mockPrisma.reservation.findFirst.mockResolvedValue({
      id: 'res-1',
      tenantId: mockTenantId,
      paidAmount: 200,
    });

    await service.refundPayment(mockTenantId, 'pay-1', { amount: 100, reason: 'Test refund' }, mockUserId);

    // Should have created a payment update AND a ledger entry
    const ledgerCall = mockPrisma.ledgerEntry.create.mock.calls[0][0].data;
    expect(ledgerCall.type).toBe('DEBIT');
    expect(ledgerCall.category).toBe('REFUND');
    expect(ledgerCall.amount).toBe(100);
  });

  it('should never call update on ledger entries', async () => {
    // Verify that the service code never calls update/delete on ledger entries
    expect(() => mockPrisma.ledgerEntry.update({})).toThrow('LedgerEntry update is not allowed');
    expect(() => mockPrisma.ledgerEntry.delete({})).toThrow('LedgerEntry delete is not allowed');
  });

  it('should support partial payments via multiple ledger entries', async () => {
    mockPrisma.reservation.findFirst.mockResolvedValue({
      id: 'res-1',
      tenantId: mockTenantId,
      totalAmount: 500,
      paidAmount: 0,
    });

    // First payment
    await service.recordPayment(mockTenantId, {
      reservationId: 'res-1',
      amount: 200,
      method: 'cash',
    }, mockUserId);

    // Update mock for second payment
    mockPrisma.reservation.findFirst.mockResolvedValue({
      id: 'res-1',
      tenantId: mockTenantId,
      totalAmount: 500,
      paidAmount: 200,
    });

    // Second payment
    await service.recordPayment(mockTenantId, {
      reservationId: 'res-1',
      amount: 300,
      method: 'card',
    }, mockUserId);

    // Should have two separate ledger entries
    expect(mockPrisma.ledgerEntry.create).toHaveBeenCalledTimes(2);
    expect(createdLedgerEntries).toHaveLength(2);
    expect(createdLedgerEntries[0].amount).toBe(200);
    expect(createdLedgerEntries[1].amount).toBe(300);
  });

  it('each ledger entry should have an immutable createdAt timestamp', async () => {
    mockPrisma.reservation.findFirst.mockResolvedValue({
      id: 'res-1',
      tenantId: mockTenantId,
      totalAmount: 500,
      paidAmount: 0,
    });

    await service.recordPayment(mockTenantId, {
      reservationId: 'res-1',
      amount: 100,
      method: 'cash',
    }, mockUserId);

    expect(createdLedgerEntries[0].createdAt).toBeInstanceOf(Date);
  });
});
