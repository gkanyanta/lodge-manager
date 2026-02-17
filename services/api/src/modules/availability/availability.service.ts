import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Reservation statuses that block availability */
const BLOCKING_STATUSES = [
  'inquiry',
  'pending',
  'confirmed',
  'checked_in',
];

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search available room types for given dates and guest count.
   *
   * For each active room type that can accommodate the requested guests:
   * 1. Count total active rooms of that type
   * 2. Count rooms with overlapping reservations (blocking statuses)
   * 3. Available = total - booked
   * 4. Calculate effective price using rate plans / seasonal rates
   */
  async searchAvailability(
    tenantId: string,
    checkIn: Date,
    checkOut: Date,
    guests: number,
  ) {
    if (checkOut <= checkIn) {
      throw new BadRequestException('Check-out date must be after check-in date');
    }

    // Get all active room types that can accommodate the requested guests
    const roomTypes = await this.prisma.roomType.findMany({
      where: {
        tenantId,
        active: true,
        maxOccupancy: { gte: guests },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const results = await Promise.all(
      roomTypes.map(async (roomType) => {
        // Count total active rooms of this type
        const totalRooms = await this.prisma.room.count({
          where: {
            tenantId,
            roomTypeId: roomType.id,
            active: true,
          },
        });

        // Count rooms that are booked for overlapping dates.
        // A reservation overlaps when:
        //   existingCheckIn < requestedCheckOut AND existingCheckOut > requestedCheckIn
        //
        // We count distinct roomIds from reservationRooms whose parent
        // reservation has a blocking status and overlapping dates.
        const bookedRoomIds = await this.prisma.reservationRoom.findMany({
          where: {
            roomType: { tenantId },
            roomTypeId: roomType.id,
            roomId: { not: null },
            reservation: {
              tenantId,
              status: { in: BLOCKING_STATUSES },
              checkIn: { lt: checkOut },
              checkOut: { gt: checkIn },
            },
          },
          select: { roomId: true },
          distinct: ['roomId'],
        });

        const bookedCount = bookedRoomIds.length;
        const availableCount = Math.max(0, totalRooms - bookedCount);

        // Calculate effective nightly price
        const effectivePrice = await this.getEffectivePrice(
          tenantId,
          roomType.id,
          checkIn,
          checkOut,
        );

        const nights = Math.ceil(
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
        );

        return {
          roomType: {
            id: roomType.id,
            name: roomType.name,
            description: roomType.description,
            maxOccupancy: roomType.maxOccupancy,
            amenities: roomType.amenities,
            images: roomType.images,
          },
          totalRooms,
          bookedRooms: bookedCount,
          availableRooms: availableCount,
          pricePerNight: effectivePrice,
          totalPrice: effectivePrice.mul(nights),
          nights,
        };
      }),
    );

    return results.filter((r) => r.availableRooms > 0);
  }

  /**
   * Check if a specific room is available for the given date range.
   * Optionally exclude a specific reservation (for rebooking scenarios).
   */
  async isRoomAvailable(
    tenantId: string,
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    excludeReservationId?: string,
  ): Promise<boolean> {
    if (checkOut <= checkIn) {
      throw new BadRequestException('Check-out date must be after check-in date');
    }

    // Verify room exists and belongs to tenant
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, tenantId, active: true },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID "${roomId}" not found`);
    }

    // Find any overlapping reservation for this specific room
    // Overlap: existingCheckIn < requestedCheckOut AND existingCheckOut > requestedCheckIn
    const whereClause: Prisma.ReservationRoomWhereInput = {
      roomId,
      reservation: {
        tenantId,
        status: { in: BLOCKING_STATUSES },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    };

    // Exclude a specific reservation if provided (useful when modifying a reservation)
    if (excludeReservationId) {
      whereClause.reservationId = { not: excludeReservationId };
    }

    const conflicting = await this.prisma.reservationRoom.findFirst({
      where: whereClause,
    });

    return conflicting === null;
  }

  /**
   * Calculate the effective nightly rate for a room type over a date range.
   *
   * Priority:
   * 1. Find active rate plans covering the dates (most specific / cheapest wins)
   * 2. Fall back to the room type's base price
   * 3. Apply seasonal rate multiplier if one is active for the dates
   */
  async getEffectivePrice(
    tenantId: string,
    roomTypeId: string,
    checkIn: Date,
    checkOut: Date,
  ): Promise<Prisma.Decimal> {
    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (nights <= 0) {
      throw new BadRequestException('Check-out date must be after check-in date');
    }

    // Get room type base price
    const roomType = await this.prisma.roomType.findFirst({
      where: { id: roomTypeId, tenantId },
    });

    if (!roomType) {
      throw new NotFoundException(
        `Room type with ID "${roomTypeId}" not found`,
      );
    }

    // Find active rate plans that cover the requested dates and satisfy minNights.
    // A rate plan covers when:
    //   ratePlan.startDate <= checkIn AND ratePlan.endDate >= checkOut
    const ratePlans = await this.prisma.ratePlan.findMany({
      where: {
        tenantId,
        roomTypeId,
        active: true,
        startDate: { lte: checkIn },
        endDate: { gte: checkOut },
        minNights: { lte: nights },
      },
      orderBy: { price: 'asc' },
    });

    // Use the cheapest applicable rate plan, or fall back to base price
    let baseNightlyRate: Prisma.Decimal;

    if (ratePlans.length > 0) {
      baseNightlyRate = ratePlans[0].price;
    } else {
      baseNightlyRate = roomType.basePrice;
    }

    // Check for seasonal rate multipliers that overlap the requested dates.
    // A seasonal rate applies when:
    //   seasonalRate.startDate < checkOut AND seasonalRate.endDate > checkIn
    const seasonalRates = await this.prisma.seasonalRate.findMany({
      where: {
        tenantId,
        roomTypeId,
        active: true,
        startDate: { lt: checkOut },
        endDate: { gt: checkIn },
      },
      orderBy: { multiplier: 'desc' },
    });

    // Apply the highest seasonal multiplier if any overlap exists
    if (seasonalRates.length > 0) {
      baseNightlyRate = baseNightlyRate.mul(seasonalRates[0].multiplier);
    }

    // Round to 2 decimal places
    return new Prisma.Decimal(baseNightlyRate.toFixed(2));
  }
}
