import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto, PaymentMethod } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a public booking (no auth required).
   * Uses SERIALIZABLE transaction to prevent double-booking.
   */
  async createBooking(tenantId: string, dto: CreateBookingDto) {
    const checkInDate = new Date(dto.checkIn);
    const checkOutDate = new Date(dto.checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Validate dates
    if (checkOutDate <= checkInDate) {
      throw new BadRequestException(
        'Check-out date must be after check-in date',
      );
    }

    if (checkInDate < today) {
      throw new BadRequestException(
        'Check-in date must be today or in the future',
      );
    }

    // Calculate number of nights
    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Execute within a SERIALIZABLE transaction
    return this.prisma.$transaction(
      async (tx) => {
        // 2. For each room request, verify availability
        const roomTypeDetails: Array<{
          roomTypeId: string;
          quantity: number;
          basePrice: Prisma.Decimal;
          roomTypeName: string;
        }> = [];

        for (const roomRequest of dto.rooms) {
          // Fetch the room type
          const roomType = await tx.roomType.findFirst({
            where: {
              id: roomRequest.roomTypeId,
              tenantId,
              active: true,
            },
          });

          if (!roomType) {
            throw new NotFoundException(
              `Room type "${roomRequest.roomTypeId}" not found`,
            );
          }

          // Count total rooms of this type
          const totalRooms = await tx.room.count({
            where: {
              tenantId,
              roomTypeId: roomRequest.roomTypeId,
              active: true,
            },
          });

          // Count rooms already booked for overlapping dates
          // A reservation overlaps if its checkIn < our checkOut AND its checkOut > our checkIn
          const bookedRoomCount = await tx.reservationRoom.count({
            where: {
              roomTypeId: roomRequest.roomTypeId,
              reservation: {
                tenantId,
                status: { in: ['pending', 'confirmed', 'checked_in'] },
                checkIn: { lt: checkOutDate },
                checkOut: { gt: checkInDate },
              },
            },
          });

          const availableRooms = totalRooms - bookedRoomCount;

          if (availableRooms < roomRequest.quantity) {
            throw new ConflictException(
              `Only ${Math.max(0, availableRooms)} room(s) of type "${roomType.name}" available for the selected dates. Requested: ${roomRequest.quantity}`,
            );
          }

          roomTypeDetails.push({
            roomTypeId: roomRequest.roomTypeId,
            quantity: roomRequest.quantity,
            basePrice: roomType.basePrice,
            roomTypeName: roomType.name,
          });
        }

        // 3. Find or create Guest by email/phone within tenant
        let guest = await this.findExistingGuest(tx, tenantId, dto.guest);

        if (!guest) {
          guest = await tx.guest.create({
            data: {
              tenantId,
              firstName: dto.guest.firstName,
              lastName: dto.guest.lastName,
              email: dto.guest.email || null,
              phone: dto.guest.phone || null,
            },
          });
        } else {
          // Update guest name if it has changed
          guest = await tx.guest.update({
            where: { id: guest.id },
            data: {
              firstName: dto.guest.firstName,
              lastName: dto.guest.lastName,
            },
          });
        }

        // 4. Generate unique booking reference
        const bookingReference = await this.generateBookingReference(tx);

        // 5. Calculate total amount based on effective pricing
        let totalAmount = new Prisma.Decimal(0);
        const reservationRoomData: Array<{
          roomTypeId: string;
          pricePerNight: Prisma.Decimal;
        }> = [];

        for (const detail of roomTypeDetails) {
          // Check for seasonal rates that apply
          const seasonalRate = await tx.seasonalRate.findFirst({
            where: {
              tenantId,
              roomTypeId: detail.roomTypeId,
              active: true,
              startDate: { lte: checkOutDate },
              endDate: { gte: checkInDate },
            },
            orderBy: { startDate: 'desc' },
          });

          // Check for active rate plans
          const ratePlan = await tx.ratePlan.findFirst({
            where: {
              tenantId,
              roomTypeId: detail.roomTypeId,
              active: true,
              startDate: { lte: checkOutDate },
              endDate: { gte: checkInDate },
              minNights: { lte: nights },
            },
            orderBy: { price: 'asc' },
          });

          let effectivePrice: Prisma.Decimal;

          if (ratePlan) {
            effectivePrice = ratePlan.price;
          } else {
            effectivePrice = detail.basePrice;
          }

          // Apply seasonal multiplier if present
          if (seasonalRate) {
            effectivePrice = effectivePrice.mul(seasonalRate.multiplier);
          }

          // Add room entries for each requested quantity
          for (let i = 0; i < detail.quantity; i++) {
            reservationRoomData.push({
              roomTypeId: detail.roomTypeId,
              pricePerNight: effectivePrice,
            });

            totalAmount = totalAmount.add(effectivePrice.mul(nights));
          }
        }

        // Determine initial status
        const initialStatus =
          dto.paymentMethod === PaymentMethod.PAY_AT_LODGE
            ? 'confirmed'
            : 'pending';

        // 6. Create Reservation
        const numberOfGuests = dto.rooms.reduce(
          (sum, r) => sum + r.quantity,
          0,
        );

        const reservation = await tx.reservation.create({
          data: {
            tenantId,
            guestId: guest.id,
            bookingReference,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            numberOfGuests,
            status: initialStatus,
            specialRequests: dto.specialRequests || null,
            totalAmount,
            paidAmount: 0,
            source: 'online',
          },
        });

        // 7. Create ReservationRoom entries (roomId null until assignment)
        for (const roomData of reservationRoomData) {
          await tx.reservationRoom.create({
            data: {
              reservationId: reservation.id,
              roomTypeId: roomData.roomTypeId,
              pricePerNight: roomData.pricePerNight,
              roomId: null,
            },
          });
        }

        // 8. If paymentMethod is 'online', create Payment record with status 'initiated'
        let payment: { id: string } | null = null;
        if (dto.paymentMethod === PaymentMethod.ONLINE) {
          payment = await tx.payment.create({
            data: {
              tenantId,
              reservationId: reservation.id,
              amount: totalAmount,
              method: 'online',
              status: 'initiated',
              description: `Online payment for booking ${bookingReference}`,
            },
          });
        }

        // 9. Create audit log entry
        await tx.auditLog.create({
          data: {
            tenantId,
            action: 'create',
            entityType: 'reservation',
            entityId: reservation.id,
            after: {
              bookingReference,
              checkIn: dto.checkIn,
              checkOut: dto.checkOut,
              status: initialStatus,
              totalAmount: totalAmount.toString(),
              paymentMethod: dto.paymentMethod,
              guestName: `${dto.guest.firstName} ${dto.guest.lastName}`,
            },
          },
        });

        // 10. Return booking confirmation
        return {
          bookingReference,
          status: initialStatus,
          checkIn: dto.checkIn,
          checkOut: dto.checkOut,
          nights,
          guest: {
            firstName: guest.firstName,
            lastName: guest.lastName,
            email: guest.email,
            phone: guest.phone,
          },
          rooms: roomTypeDetails.map((d) => ({
            roomType: d.roomTypeName,
            quantity: d.quantity,
          })),
          totalAmount: totalAmount.toString(),
          paymentMethod: dto.paymentMethod,
          paymentId: payment?.id || null,
          createdAt: reservation.createdAt,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      },
    );
  }

  /**
   * Get booking details by reference and last name (public lookup).
   */
  async getBookingByReference(
    tenantId: string,
    bookingReference: string,
    lastName: string,
    _verificationToken?: string, // reserved for future OTP support
  ) {
    const reservation = await this.prisma.reservation.findFirst({
      where: {
        tenantId,
        bookingReference,
        guest: {
          lastName: { equals: lastName, mode: 'insensitive' },
        },
      },
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        reservationRooms: {
          include: {
            roomType: {
              select: {
                id: true,
                name: true,
              },
            },
            room: {
              select: {
                id: true,
                number: true,
              },
            },
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
            paidAt: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException(
        'Booking not found. Please check your booking reference and last name.',
      );
    }

    const nights = Math.ceil(
      (new Date(reservation.checkOut).getTime() -
        new Date(reservation.checkIn).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return {
      bookingReference: reservation.bookingReference,
      status: reservation.status,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      nights,
      numberOfGuests: reservation.numberOfGuests,
      specialRequests: reservation.specialRequests,
      totalAmount: reservation.totalAmount.toString(),
      paidAmount: reservation.paidAmount.toString(),
      guest: reservation.guest,
      rooms: reservation.reservationRooms.map((rr) => ({
        id: rr.id,
        roomType: rr.roomType.name,
        pricePerNight: rr.pricePerNight.toString(),
        assignedRoom: rr.room?.number || null,
      })),
      payments: reservation.payments,
      createdAt: reservation.createdAt,
      checkedInAt: reservation.checkedInAt,
      checkedOutAt: reservation.checkedOutAt,
      cancelledAt: reservation.cancelledAt,
      cancelReason: reservation.cancelReason,
    };
  }

  /**
   * Cancel a booking by reference and last name (public cancellation).
   */
  async cancelBooking(
    tenantId: string,
    bookingReference: string,
    lastName: string,
    reason?: string,
  ) {
    const reservation = await this.prisma.reservation.findFirst({
      where: {
        tenantId,
        bookingReference,
        guest: {
          lastName: { equals: lastName, mode: 'insensitive' },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException(
        'Booking not found. Please check your booking reference and last name.',
      );
    }

    const cancellableStatuses = ['pending', 'confirmed'];
    if (!cancellableStatuses.includes(reservation.status)) {
      throw new BadRequestException(
        `Cannot cancel a booking with status "${reservation.status}". Only pending or confirmed bookings can be cancelled.`,
      );
    }

    const previousStatus = reservation.status;

    const updated = await this.prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: reason || null,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        action: 'status_change',
        entityType: 'reservation',
        entityId: reservation.id,
        before: { status: previousStatus },
        after: {
          status: 'cancelled',
          cancelReason: reason || null,
        },
      },
    });

    return {
      bookingReference: updated.bookingReference,
      status: updated.status,
      cancelledAt: updated.cancelledAt,
      cancelReason: updated.cancelReason,
      message: 'Booking has been cancelled successfully.',
    };
  }

  /**
   * Find an existing guest by email or phone within a tenant.
   */
  private async findExistingGuest(
    tx: Prisma.TransactionClient,
    tenantId: string,
    guestInfo: { email?: string; phone?: string },
  ) {
    if (guestInfo.email) {
      const guest = await tx.guest.findFirst({
        where: { tenantId, email: guestInfo.email },
      });
      if (guest) return guest;
    }

    if (guestInfo.phone) {
      const guest = await tx.guest.findFirst({
        where: { tenantId, phone: guestInfo.phone },
      });
      if (guest) return guest;
    }

    return null;
  }

  /**
   * Generate a unique booking reference in format LDG-XXXXXX.
   */
  private async generateBookingReference(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const reference = `LDG-${code}`;

      const existing = await tx.reservation.findUnique({
        where: { bookingReference: reference },
      });

      if (!existing) {
        return reference;
      }
    }

    throw new ConflictException(
      'Unable to generate a unique booking reference. Please try again.',
    );
  }
}
