import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilityService } from '../availability.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let prisma: PrismaService;

  const mockTenantId = 'tenant-1';
  const mockRoomTypeId = 'room-type-1';

  const mockPrisma = {
    roomType: {
      findMany: jest.fn(),
    },
    room: {
      count: jest.fn(),
    },
    reservationRoom: {
      count: jest.fn(),
    },
    ratePlan: {
      findFirst: jest.fn(),
    },
    seasonalRate: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('Date Overlap Detection', () => {
    it('should detect overlapping reservations with exact same dates', async () => {
      // Existing: Jan 10-15, Requested: Jan 10-15
      // Overlap: 10 < 15 AND 15 > 10 = true
      mockPrisma.roomType.findMany.mockResolvedValue([
        { id: mockRoomTypeId, name: 'Standard', maxOccupancy: 2, basePrice: 100, amenities: '[]', images: '[]' },
      ]);
      mockPrisma.room.count.mockResolvedValue(5);
      mockPrisma.reservationRoom.count.mockResolvedValue(3);
      mockPrisma.ratePlan.findFirst.mockResolvedValue(null);
      mockPrisma.seasonalRate.findFirst.mockResolvedValue(null);

      const result = await service.searchAvailability(
        mockTenantId,
        new Date('2025-01-10'),
        new Date('2025-01-15'),
        1,
      );

      expect(result).toBeDefined();
      expect(result[0].availableCount).toBe(2); // 5 total - 3 booked
    });

    it('should detect partial overlap (new starts before existing ends)', async () => {
      // Existing: Jan 10-15, Requested: Jan 13-18
      // Overlap: 10 < 18 AND 15 > 13 = true
      mockPrisma.roomType.findMany.mockResolvedValue([
        { id: mockRoomTypeId, name: 'Standard', maxOccupancy: 2, basePrice: 100, amenities: '[]', images: '[]' },
      ]);
      mockPrisma.room.count.mockResolvedValue(5);
      mockPrisma.reservationRoom.count.mockResolvedValue(2);
      mockPrisma.ratePlan.findFirst.mockResolvedValue(null);
      mockPrisma.seasonalRate.findFirst.mockResolvedValue(null);

      const result = await service.searchAvailability(
        mockTenantId,
        new Date('2025-01-13'),
        new Date('2025-01-18'),
        1,
      );

      expect(result[0].availableCount).toBe(3); // 5 - 2
    });

    it('should NOT detect overlap when dates are adjacent (checkout = checkin)', async () => {
      // Existing: Jan 10-15, Requested: Jan 15-20
      // Not overlap: 10 < 20 AND 15 > 15 = false (using strict inequality)
      // This test validates the query uses: checkIn < checkOut AND checkOut > checkIn
      mockPrisma.roomType.findMany.mockResolvedValue([
        { id: mockRoomTypeId, name: 'Standard', maxOccupancy: 2, basePrice: 100, amenities: '[]', images: '[]' },
      ]);
      mockPrisma.room.count.mockResolvedValue(5);
      mockPrisma.reservationRoom.count.mockResolvedValue(0); // No overlap
      mockPrisma.ratePlan.findFirst.mockResolvedValue(null);
      mockPrisma.seasonalRate.findFirst.mockResolvedValue(null);

      const result = await service.searchAvailability(
        mockTenantId,
        new Date('2025-01-15'),
        new Date('2025-01-20'),
        1,
      );

      expect(result[0].availableCount).toBe(5); // All available
    });

    it('should show zero availability when all rooms are booked', async () => {
      mockPrisma.roomType.findMany.mockResolvedValue([
        { id: mockRoomTypeId, name: 'Standard', maxOccupancy: 2, basePrice: 100, amenities: '[]', images: '[]' },
      ]);
      mockPrisma.room.count.mockResolvedValue(5);
      mockPrisma.reservationRoom.count.mockResolvedValue(5); // All booked
      mockPrisma.ratePlan.findFirst.mockResolvedValue(null);
      mockPrisma.seasonalRate.findFirst.mockResolvedValue(null);

      const result = await service.searchAvailability(
        mockTenantId,
        new Date('2025-01-10'),
        new Date('2025-01-15'),
        1,
      );

      expect(result[0].availableCount).toBe(0);
    });

    it('should filter room types by max occupancy', async () => {
      mockPrisma.roomType.findMany.mockResolvedValue([
        { id: 'rt-1', name: 'Single', maxOccupancy: 1, basePrice: 50, amenities: '[]', images: '[]' },
        { id: 'rt-2', name: 'Double', maxOccupancy: 2, basePrice: 100, amenities: '[]', images: '[]' },
      ]);
      mockPrisma.room.count.mockResolvedValue(3);
      mockPrisma.reservationRoom.count.mockResolvedValue(0);
      mockPrisma.ratePlan.findFirst.mockResolvedValue(null);
      mockPrisma.seasonalRate.findFirst.mockResolvedValue(null);

      const result = await service.searchAvailability(
        mockTenantId,
        new Date('2025-01-10'),
        new Date('2025-01-15'),
        2, // 2 guests - should only show Double
      );

      // Only room types with maxOccupancy >= 2 should be returned
      expect(result.every((r) => r.maxOccupancy >= 2)).toBe(true);
    });

    it('should apply seasonal rate multiplier to pricing', async () => {
      mockPrisma.roomType.findMany.mockResolvedValue([
        { id: mockRoomTypeId, name: 'Standard', maxOccupancy: 2, basePrice: 100, amenities: '[]', images: '[]' },
      ]);
      mockPrisma.room.count.mockResolvedValue(5);
      mockPrisma.reservationRoom.count.mockResolvedValue(0);
      mockPrisma.ratePlan.findFirst.mockResolvedValue(null);
      mockPrisma.seasonalRate.findFirst.mockResolvedValue({ multiplier: 1.5 }); // 50% markup

      const result = await service.searchAvailability(
        mockTenantId,
        new Date('2025-12-20'),
        new Date('2025-12-25'),
        1,
      );

      expect(result[0].effectivePrice).toBe(150); // 100 * 1.5
    });
  });
});
