import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { RoomAssignmentDto } from './dto/check-in.dto';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List reservations with pagination and optional filters.
   */
  async list(
    tenantId: string,
    filters?: {
      status?: string;
      fromDate?: string;
      toDate?: string;
      guestName?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const { status, fromDate, toDate, guestName, skip = 0, take = 20 } =
      filters || {};

    const where: Prisma.ReservationWhereInput = { tenantId };

    if (status) {
      where.status = status;
    }

    if (fromDate) {
      where.checkIn = { ...(where.checkIn as any), gte: new Date(fromDate) };
    }

    if (toDate) {
      where.checkOut = { ...(where.checkOut as any), lte: new Date(toDate) };
    }

    if (guestName) {
      where.guest = {
        OR: [
          { firstName: { contains: guestName, mode: 'insensitive' } },
          { lastName: { contains: guestName, mode: 'insensitive' } },
        ],
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.reservation.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          guest: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          reservationRooms: {
            include: {
              roomType: { select: { id: true, name: true } },
              room: { select: { id: true, number: true } },
            },
          },
          _count: {
            select: { payments: true },
          },
        },
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  /**
   * Get a single reservation by ID with full details.
   */
  async getById(tenantId: string, id: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id, tenantId },
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            idNumber: true,
            country: true,
          },
        },
        reservationRooms: {
          include: {
            roomType: {
              select: { id: true, name: true, maxOccupancy: true },
            },
            room: {
              select: { id: true, number: true, floor: true, status: true },
            },
          },
        },
        stays: true,
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
            transactionRef: true,
            paidAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID "${id}" not found`);
    }

    return reservation;
  }

  /**
   * Admin creates a reservation (walk-in support).
   */
  async create(tenantId: string, dto: CreateReservationDto, userId: string) {
    const checkInDate = new Date(dto.checkIn);
    const checkOutDate = new Date(dto.checkOut);

    if (checkOutDate <= checkInDate) {
      throw new BadRequestException(
        'Check-out date must be after check-in date',
      );
    }

    // Verify guest exists
    const guest = await this.prisma.guest.findFirst({
      where: { id: dto.guestId, tenantId },
    });

    if (!guest) {
      throw new NotFoundException(`Guest with ID "${dto.guestId}" not found`);
    }

    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    return this.prisma.$transaction(
      async (tx) => {
        // Generate booking reference
        const bookingReference = await this.generateBookingReference(tx);

        // Calculate total and prepare room entries
        let totalAmount = new Prisma.Decimal(0);
        const reservationRoomData: Array<{
          roomTypeId: string;
          roomId: string | null;
          pricePerNight: Prisma.Decimal;
        }> = [];

        for (const roomReq of dto.rooms) {
          const roomType = await tx.roomType.findFirst({
            where: { id: roomReq.roomTypeId, tenantId, active: true },
          });

          if (!roomType) {
            throw new NotFoundException(
              `Room type "${roomReq.roomTypeId}" not found`,
            );
          }

          // Check for rate plans
          const ratePlan = await tx.ratePlan.findFirst({
            where: {
              tenantId,
              roomTypeId: roomReq.roomTypeId,
              active: true,
              startDate: { lte: checkOutDate },
              endDate: { gte: checkInDate },
              minNights: { lte: nights },
            },
            orderBy: { price: 'asc' },
          });

          // Check for seasonal rates
          const seasonalRate = await tx.seasonalRate.findFirst({
            where: {
              tenantId,
              roomTypeId: roomReq.roomTypeId,
              active: true,
              startDate: { lte: checkOutDate },
              endDate: { gte: checkInDate },
            },
            orderBy: { startDate: 'desc' },
          });

          let effectivePrice = ratePlan ? ratePlan.price : roomType.basePrice;

          if (seasonalRate) {
            effectivePrice = effectivePrice.mul(seasonalRate.multiplier);
          }

          for (let i = 0; i < roomReq.quantity; i++) {
            // If a specific roomId was provided on the first entry, use it
            const assignedRoomId =
              i === 0 && roomReq.roomId ? roomReq.roomId : null;

            if (assignedRoomId) {
              // Verify the room exists and belongs to the correct type
              const room = await tx.room.findFirst({
                where: {
                  id: assignedRoomId,
                  tenantId,
                  roomTypeId: roomReq.roomTypeId,
                  active: true,
                },
              });

              if (!room) {
                throw new NotFoundException(
                  `Room "${assignedRoomId}" not found or does not match room type`,
                );
              }
            }

            reservationRoomData.push({
              roomTypeId: roomReq.roomTypeId,
              roomId: assignedRoomId,
              pricePerNight: effectivePrice,
            });

            totalAmount = totalAmount.add(effectivePrice.mul(nights));
          }
        }

        // Create reservation
        const reservation = await tx.reservation.create({
          data: {
            tenantId,
            guestId: dto.guestId,
            bookingReference,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            numberOfGuests: dto.numberOfGuests || dto.rooms.reduce((s, r) => s + r.quantity, 0),
            status: 'confirmed',
            specialRequests: dto.specialRequests || null,
            totalAmount,
            paidAmount: 0,
            source: dto.source || 'walk_in',
            notes: dto.notes || null,
          },
        });

        // Create reservation room entries
        for (const roomData of reservationRoomData) {
          await tx.reservationRoom.create({
            data: {
              reservationId: reservation.id,
              roomTypeId: roomData.roomTypeId,
              roomId: roomData.roomId,
              pricePerNight: roomData.pricePerNight,
            },
          });
        }

        // Audit log
        await tx.auditLog.create({
          data: {
            tenantId,
            userId,
            action: 'create',
            entityType: 'reservation',
            entityId: reservation.id,
            after: {
              bookingReference,
              guestId: dto.guestId,
              checkIn: dto.checkIn,
              checkOut: dto.checkOut,
              status: 'confirmed',
              source: dto.source || 'walk_in',
              totalAmount: totalAmount.toString(),
            },
          },
        });

        // Return full reservation
        return tx.reservation.findUnique({
          where: { id: reservation.id },
          include: {
            guest: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            reservationRooms: {
              include: {
                roomType: { select: { id: true, name: true } },
                room: { select: { id: true, number: true } },
              },
            },
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      },
    );
  }

  /**
   * Update reservation details (dates, notes, special requests, etc.).
   */
  async update(
    tenantId: string,
    id: string,
    dto: UpdateReservationDto,
    userId: string,
  ) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id, tenantId },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID "${id}" not found`);
    }

    const nonEditableStatuses = ['checked_out', 'cancelled'];
    if (nonEditableStatuses.includes(reservation.status)) {
      throw new BadRequestException(
        `Cannot update a reservation with status "${reservation.status}"`,
      );
    }

    const updateData: Prisma.ReservationUpdateInput = {};

    if (dto.checkIn) {
      updateData.checkIn = new Date(dto.checkIn);
    }
    if (dto.checkOut) {
      updateData.checkOut = new Date(dto.checkOut);
    }
    if (dto.checkIn && dto.checkOut) {
      const ci = new Date(dto.checkIn);
      const co = new Date(dto.checkOut);
      if (co <= ci) {
        throw new BadRequestException(
          'Check-out date must be after check-in date',
        );
      }
    }
    if (dto.numberOfGuests !== undefined) {
      updateData.numberOfGuests = dto.numberOfGuests;
    }
    if (dto.specialRequests !== undefined) {
      updateData.specialRequests = dto.specialRequests;
    }
    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    const before = {
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      numberOfGuests: reservation.numberOfGuests,
      specialRequests: reservation.specialRequests,
      notes: reservation.notes,
    };

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: updateData,
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        reservationRooms: {
          include: {
            roomType: { select: { id: true, name: true } },
            room: { select: { id: true, number: true } },
          },
        },
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'update',
        entityType: 'reservation',
        entityId: id,
        before,
        after: {
          checkIn: updated.checkIn,
          checkOut: updated.checkOut,
          numberOfGuests: updated.numberOfGuests,
          specialRequests: updated.specialRequests,
          notes: updated.notes,
        },
      },
    });

    return updated;
  }

  /**
   * Change reservation status.
   */
  async updateStatus(
    tenantId: string,
    id: string,
    status: string,
    userId: string,
  ) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id, tenantId },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID "${id}" not found`);
    }

    // Define valid status transitions
    const validTransitions: Record<string, string[]> = {
      inquiry: ['pending', 'confirmed', 'cancelled'],
      pending: ['confirmed', 'cancelled'],
      confirmed: ['checked_in', 'cancelled', 'no_show'],
      checked_in: ['checked_out'],
      checked_out: [],
      cancelled: [],
      no_show: [],
    };

    const allowed = validTransitions[reservation.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from "${reservation.status}" to "${status}". Allowed transitions: ${allowed.join(', ') || 'none'}`,
      );
    }

    const previousStatus = reservation.status;

    const updateData: Prisma.ReservationUpdateInput = { status };

    if (status === 'cancelled') {
      updateData.cancelledAt = new Date();
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'status_change',
        entityType: 'reservation',
        entityId: id,
        before: { status: previousStatus },
        after: { status },
      },
    });

    return updated;
  }

  /**
   * Check in a reservation: assign rooms, mark as checked_in, create Stay records.
   */
  async checkIn(
    tenantId: string,
    id: string,
    roomAssignments: RoomAssignmentDto[],
    userId: string,
  ) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id, tenantId },
      include: {
        reservationRooms: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID "${id}" not found`);
    }

    if (reservation.status !== 'confirmed') {
      throw new BadRequestException(
        `Cannot check in a reservation with status "${reservation.status}". Reservation must be "confirmed".`,
      );
    }

    // Validate all reservation rooms are assigned
    const reservationRoomIds = new Set(
      reservation.reservationRooms.map((rr) => rr.id),
    );

    for (const assignment of roomAssignments) {
      if (!reservationRoomIds.has(assignment.reservationRoomId)) {
        throw new BadRequestException(
          `Reservation room "${assignment.reservationRoomId}" does not belong to this reservation`,
        );
      }
    }

    // Ensure all reservation rooms are covered
    const assignedReservationRoomIds = new Set(
      roomAssignments.map((a) => a.reservationRoomId),
    );

    for (const rr of reservation.reservationRooms) {
      if (!assignedReservationRoomIds.has(rr.id)) {
        throw new BadRequestException(
          `Missing room assignment for reservation room "${rr.id}"`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // 1. Assign rooms and validate them
      for (const assignment of roomAssignments) {
        const reservationRoom = reservation.reservationRooms.find(
          (rr) => rr.id === assignment.reservationRoomId,
        );

        // Verify the room exists, is active, and matches the room type
        const room = await tx.room.findFirst({
          where: {
            id: assignment.roomId,
            tenantId,
            roomTypeId: reservationRoom!.roomTypeId,
            active: true,
          },
        });

        if (!room) {
          throw new BadRequestException(
            `Room "${assignment.roomId}" not found, not active, or does not match the required room type`,
          );
        }

        if (room.status === 'occupied') {
          throw new ConflictException(
            `Room "${room.number}" is already occupied`,
          );
        }

        // 2. Update ReservationRoom with assigned roomId
        await tx.reservationRoom.update({
          where: { id: assignment.reservationRoomId },
          data: { roomId: assignment.roomId },
        });

        // 3. Update room status to occupied
        await tx.room.update({
          where: { id: assignment.roomId },
          data: { status: 'occupied' },
        });

        // 4. Create Stay record
        await tx.stay.create({
          data: {
            reservationId: reservation.id,
            roomId: assignment.roomId,
            checkIn: now,
          },
        });
      }

      // 5. Update reservation status to checked_in
      const updated = await tx.reservation.update({
        where: { id: reservation.id },
        data: {
          status: 'checked_in',
          checkedInAt: now,
        },
        include: {
          guest: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          reservationRooms: {
            include: {
              roomType: { select: { id: true, name: true } },
              room: { select: { id: true, number: true, floor: true } },
            },
          },
          stays: true,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'status_change',
          entityType: 'reservation',
          entityId: reservation.id,
          before: { status: 'confirmed' },
          after: {
            status: 'checked_in',
            checkedInAt: now.toISOString(),
            roomAssignments: roomAssignments.map((a) => ({
              reservationRoomId: a.reservationRoomId,
              roomId: a.roomId,
            })),
          },
        },
      });

      return updated;
    });
  }

  /**
   * Check out a reservation: mark rooms as dirty, update Stay records, set status.
   */
  async checkOut(tenantId: string, id: string, userId: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id, tenantId },
      include: {
        reservationRooms: true,
        stays: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID "${id}" not found`);
    }

    if (reservation.status !== 'checked_in') {
      throw new BadRequestException(
        `Cannot check out a reservation with status "${reservation.status}". Reservation must be "checked_in".`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // 1. Update assigned rooms to dirty
      for (const rr of reservation.reservationRooms) {
        if (rr.roomId) {
          await tx.room.update({
            where: { id: rr.roomId },
            data: { status: 'dirty' },
          });
        }
      }

      // 2. Update Stay checkOut timestamps
      for (const stay of reservation.stays) {
        if (!stay.checkOut) {
          await tx.stay.update({
            where: { id: stay.id },
            data: { checkOut: now },
          });
        }
      }

      // 3. Update reservation status
      const updated = await tx.reservation.update({
        where: { id: reservation.id },
        data: {
          status: 'checked_out',
          checkedOutAt: now,
        },
        include: {
          guest: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          reservationRooms: {
            include: {
              roomType: { select: { id: true, name: true } },
              room: { select: { id: true, number: true } },
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

      // Audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'status_change',
          entityType: 'reservation',
          entityId: reservation.id,
          before: { status: 'checked_in' },
          after: {
            status: 'checked_out',
            checkedOutAt: now.toISOString(),
          },
        },
      });

      return updated;
    });
  }

  /**
   * Get today's arrivals: reservations with checkIn = today and status confirmed.
   */
  async getTodayArrivals(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.reservation.findMany({
      where: {
        tenantId,
        status: 'confirmed',
        checkIn: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        reservationRooms: {
          include: {
            roomType: { select: { id: true, name: true } },
            room: { select: { id: true, number: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get today's departures: reservations with checkOut = today and status checked_in.
   */
  async getTodayDepartures(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.reservation.findMany({
      where: {
        tenantId,
        status: 'checked_in',
        checkOut: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        reservationRooms: {
          include: {
            roomType: { select: { id: true, name: true } },
            room: { select: { id: true, number: true } },
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
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
