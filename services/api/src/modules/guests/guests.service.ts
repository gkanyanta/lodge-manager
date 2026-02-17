import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GuestsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find an existing guest by phone or email within a tenant, or create a new one.
   * Matching priority: email first (if provided), then phone (if provided).
   */
  async findOrCreate(
    tenantId: string,
    data: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      idNumber?: string;
      country?: string;
      notes?: string;
    },
  ) {
    // Try to find by email first
    if (data.email) {
      const byEmail = await this.prisma.guest.findFirst({
        where: { tenantId, email: data.email },
      });

      if (byEmail) {
        // Update guest details on subsequent encounters
        return this.prisma.guest.update({
          where: { id: byEmail.id },
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone ?? byEmail.phone,
            idNumber: data.idNumber ?? byEmail.idNumber,
            country: data.country ?? byEmail.country,
          },
        });
      }
    }

    // Try to find by phone
    if (data.phone) {
      const byPhone = await this.prisma.guest.findFirst({
        where: { tenantId, phone: data.phone },
      });

      if (byPhone) {
        return this.prisma.guest.update({
          where: { id: byPhone.id },
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email ?? byPhone.email,
            idNumber: data.idNumber ?? byPhone.idNumber,
            country: data.country ?? byPhone.country,
          },
        });
      }
    }

    // No match found -- create a new guest
    return this.prisma.guest.create({
      data: {
        tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        idNumber: data.idNumber,
        country: data.country,
        notes: data.notes,
      },
    });
  }

  async findAll(
    tenantId: string,
    params: {
      skip?: number;
      take?: number;
      search?: string;
    },
  ) {
    const { skip = 0, take = 50, search } = params;

    const where: Prisma.GuestWhereInput = { tenantId };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { idNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.guest.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { reservations: true },
          },
        },
      }),
      this.prisma.guest.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async findOne(tenantId: string, id: string) {
    const guest = await this.prisma.guest.findFirst({
      where: { id, tenantId },
      include: {
        reservations: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { reservations: true },
        },
      },
    });

    if (!guest) {
      throw new NotFoundException(`Guest with ID "${id}" not found`);
    }

    return guest;
  }

  async update(
    tenantId: string,
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      idNumber?: string;
      country?: string;
      notes?: string;
      verified?: boolean;
    },
  ) {
    await this.findOne(tenantId, id);

    return this.prisma.guest.update({
      where: { id },
      data,
    });
  }

  async delete(tenantId: string, id: string) {
    const guest = await this.findOne(tenantId, id);

    // Prevent deletion if the guest has reservations
    if (guest._count.reservations > 0) {
      throw new NotFoundException(
        `Cannot delete guest with ${guest._count.reservations} reservation(s). Consider anonymising instead.`,
      );
    }

    return this.prisma.guest.delete({ where: { id } });
  }
}
