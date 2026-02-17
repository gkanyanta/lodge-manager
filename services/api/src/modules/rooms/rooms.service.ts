import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomStatus } from './dto/update-room-status.dto';
import { CreateRatePlanDto } from './dto/create-rate-plan.dto';
import { UpdateRatePlanDto } from './dto/update-rate-plan.dto';
import { CreateSeasonalRateDto } from './dto/create-seasonal-rate.dto';
import { UpdateSeasonalRateDto } from './dto/update-seasonal-rate.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // ROOM TYPES
  // ============================================================

  async createRoomType(tenantId: string, dto: CreateRoomTypeDto) {
    const existing = await this.prisma.roomType.findUnique({
      where: { tenantId_name: { tenantId, name: dto.name } },
    });

    if (existing) {
      throw new ConflictException(
        `Room type "${dto.name}" already exists for this tenant`,
      );
    }

    return this.prisma.roomType.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        maxOccupancy: dto.maxOccupancy,
        basePrice: new Prisma.Decimal(dto.basePrice),
        amenities: dto.amenities ?? [],
        images: dto.images ?? [],
      },
    });
  }

  async updateRoomType(
    tenantId: string,
    id: string,
    dto: UpdateRoomTypeDto,
  ) {
    const roomType = await this.prisma.roomType.findFirst({
      where: { id, tenantId },
    });

    if (!roomType) {
      throw new NotFoundException(`Room type with ID "${id}" not found`);
    }

    // Check for name uniqueness if name is being updated
    if (dto.name && dto.name !== roomType.name) {
      const duplicate = await this.prisma.roomType.findUnique({
        where: { tenantId_name: { tenantId, name: dto.name } },
      });

      if (duplicate) {
        throw new ConflictException(
          `Room type "${dto.name}" already exists for this tenant`,
        );
      }
    }

    const data: Prisma.RoomTypeUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.maxOccupancy !== undefined) data.maxOccupancy = dto.maxOccupancy;
    if (dto.basePrice !== undefined)
      data.basePrice = new Prisma.Decimal(dto.basePrice);
    if (dto.amenities !== undefined) data.amenities = dto.amenities;
    if (dto.images !== undefined) data.images = dto.images;

    return this.prisma.roomType.update({
      where: { id },
      data,
    });
  }

  async listRoomTypes(tenantId: string) {
    return this.prisma.roomType.findMany({
      where: { tenantId, active: true },
      include: {
        _count: {
          select: { rooms: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getRoomType(tenantId: string, id: string) {
    const roomType = await this.prisma.roomType.findFirst({
      where: { id, tenantId },
      include: {
        rooms: {
          where: { active: true },
          orderBy: { number: 'asc' },
        },
        ratePlans: {
          where: { active: true },
          orderBy: { startDate: 'asc' },
        },
        seasonalRates: {
          where: { active: true },
          orderBy: { startDate: 'asc' },
        },
      },
    });

    if (!roomType) {
      throw new NotFoundException(`Room type with ID "${id}" not found`);
    }

    return roomType;
  }

  // ============================================================
  // ROOMS
  // ============================================================

  async createRoom(tenantId: string, dto: CreateRoomDto) {
    // Verify room type belongs to tenant
    const roomType = await this.prisma.roomType.findFirst({
      where: { id: dto.roomTypeId, tenantId },
    });

    if (!roomType) {
      throw new NotFoundException(
        `Room type with ID "${dto.roomTypeId}" not found`,
      );
    }

    // Check for duplicate room number within tenant
    const existing = await this.prisma.room.findUnique({
      where: { tenantId_number: { tenantId, number: dto.number } },
    });

    if (existing) {
      throw new ConflictException(
        `Room "${dto.number}" already exists for this tenant`,
      );
    }

    return this.prisma.room.create({
      data: {
        tenantId,
        roomTypeId: dto.roomTypeId,
        number: dto.number,
        floor: dto.floor,
        notes: dto.notes,
      },
      include: {
        roomType: true,
      },
    });
  }

  async updateRoom(tenantId: string, id: string, dto: UpdateRoomDto) {
    const room = await this.prisma.room.findFirst({
      where: { id, tenantId },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID "${id}" not found`);
    }

    // If changing room number, verify uniqueness
    if (dto.number && dto.number !== room.number) {
      const duplicate = await this.prisma.room.findUnique({
        where: { tenantId_number: { tenantId, number: dto.number } },
      });

      if (duplicate) {
        throw new ConflictException(
          `Room "${dto.number}" already exists for this tenant`,
        );
      }
    }

    // If changing room type, verify it belongs to tenant
    if (dto.roomTypeId && dto.roomTypeId !== room.roomTypeId) {
      const roomType = await this.prisma.roomType.findFirst({
        where: { id: dto.roomTypeId, tenantId },
      });

      if (!roomType) {
        throw new NotFoundException(
          `Room type with ID "${dto.roomTypeId}" not found`,
        );
      }
    }

    const data: Prisma.RoomUpdateInput = {};
    if (dto.roomTypeId !== undefined)
      data.roomType = { connect: { id: dto.roomTypeId } };
    if (dto.number !== undefined) data.number = dto.number;
    if (dto.floor !== undefined) data.floor = dto.floor;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.room.update({
      where: { id },
      data,
      include: {
        roomType: true,
      },
    });
  }

  async listRooms(
    tenantId: string,
    filters?: {
      roomTypeId?: string;
      status?: string;
      floor?: string;
      active?: boolean;
    },
  ) {
    const where: Prisma.RoomWhereInput = { tenantId };

    if (filters?.roomTypeId) where.roomTypeId = filters.roomTypeId;
    if (filters?.status) where.status = filters.status;
    if (filters?.floor) where.floor = filters.floor;
    if (filters?.active !== undefined) {
      where.active = filters.active;
    } else {
      where.active = true;
    }

    return this.prisma.room.findMany({
      where,
      include: {
        roomType: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            maxOccupancy: true,
          },
        },
      },
      orderBy: { number: 'asc' },
    });
  }

  async getRoom(tenantId: string, id: string) {
    const room = await this.prisma.room.findFirst({
      where: { id, tenantId },
      include: {
        roomType: true,
        housekeepingTasks: {
          where: { status: { not: 'done' } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID "${id}" not found`);
    }

    return room;
  }

  async updateRoomStatus(tenantId: string, roomId: string, status: RoomStatus) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, tenantId },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID "${roomId}" not found`);
    }

    return this.prisma.room.update({
      where: { id: roomId },
      data: { status },
      include: {
        roomType: true,
      },
    });
  }

  // ============================================================
  // RATE PLANS
  // ============================================================

  async createRatePlan(tenantId: string, dto: CreateRatePlanDto) {
    // Verify room type belongs to tenant
    const roomType = await this.prisma.roomType.findFirst({
      where: { id: dto.roomTypeId, tenantId },
    });

    if (!roomType) {
      throw new NotFoundException(
        `Room type with ID "${dto.roomTypeId}" not found`,
      );
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    return this.prisma.ratePlan.create({
      data: {
        tenantId,
        roomTypeId: dto.roomTypeId,
        name: dto.name,
        price: new Prisma.Decimal(dto.price),
        startDate,
        endDate,
        minNights: dto.minNights ?? 1,
      },
      include: {
        roomType: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async listRatePlans(tenantId: string, roomTypeId?: string) {
    const where: Prisma.RatePlanWhereInput = { tenantId, active: true };

    if (roomTypeId) {
      where.roomTypeId = roomTypeId;
    }

    return this.prisma.ratePlan.findMany({
      where,
      include: {
        roomType: {
          select: { id: true, name: true },
        },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async updateRatePlan(tenantId: string, id: string, dto: UpdateRatePlanDto) {
    const ratePlan = await this.prisma.ratePlan.findFirst({
      where: { id, tenantId },
    });

    if (!ratePlan) {
      throw new NotFoundException(`Rate plan with ID "${id}" not found`);
    }

    // If changing room type, verify ownership
    if (dto.roomTypeId && dto.roomTypeId !== ratePlan.roomTypeId) {
      const roomType = await this.prisma.roomType.findFirst({
        where: { id: dto.roomTypeId, tenantId },
      });

      if (!roomType) {
        throw new NotFoundException(
          `Room type with ID "${dto.roomTypeId}" not found`,
        );
      }
    }

    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : ratePlan.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : ratePlan.endDate;

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const data: Prisma.RatePlanUpdateInput = {};
    if (dto.roomTypeId !== undefined)
      data.roomType = { connect: { id: dto.roomTypeId } };
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
    if (dto.minNights !== undefined) data.minNights = dto.minNights;

    return this.prisma.ratePlan.update({
      where: { id },
      data,
      include: {
        roomType: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async deleteRatePlan(tenantId: string, id: string) {
    const ratePlan = await this.prisma.ratePlan.findFirst({
      where: { id, tenantId },
    });

    if (!ratePlan) {
      throw new NotFoundException(`Rate plan with ID "${id}" not found`);
    }

    // Soft delete by setting active to false
    return this.prisma.ratePlan.update({
      where: { id },
      data: { active: false },
    });
  }

  // ============================================================
  // SEASONAL RATES
  // ============================================================

  async createSeasonalRate(tenantId: string, dto: CreateSeasonalRateDto) {
    // Verify room type belongs to tenant
    const roomType = await this.prisma.roomType.findFirst({
      where: { id: dto.roomTypeId, tenantId },
    });

    if (!roomType) {
      throw new NotFoundException(
        `Room type with ID "${dto.roomTypeId}" not found`,
      );
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    return this.prisma.seasonalRate.create({
      data: {
        tenantId,
        roomTypeId: dto.roomTypeId,
        name: dto.name,
        multiplier: new Prisma.Decimal(dto.multiplier),
        startDate,
        endDate,
      },
      include: {
        roomType: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async listSeasonalRates(tenantId: string, roomTypeId?: string) {
    const where: Prisma.SeasonalRateWhereInput = { tenantId, active: true };

    if (roomTypeId) {
      where.roomTypeId = roomTypeId;
    }

    return this.prisma.seasonalRate.findMany({
      where,
      include: {
        roomType: {
          select: { id: true, name: true },
        },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async updateSeasonalRate(
    tenantId: string,
    id: string,
    dto: UpdateSeasonalRateDto,
  ) {
    const seasonalRate = await this.prisma.seasonalRate.findFirst({
      where: { id, tenantId },
    });

    if (!seasonalRate) {
      throw new NotFoundException(`Seasonal rate with ID "${id}" not found`);
    }

    // If changing room type, verify ownership
    if (dto.roomTypeId && dto.roomTypeId !== seasonalRate.roomTypeId) {
      const roomType = await this.prisma.roomType.findFirst({
        where: { id: dto.roomTypeId, tenantId },
      });

      if (!roomType) {
        throw new NotFoundException(
          `Room type with ID "${dto.roomTypeId}" not found`,
        );
      }
    }

    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : seasonalRate.startDate;
    const endDate = dto.endDate
      ? new Date(dto.endDate)
      : seasonalRate.endDate;

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const data: Prisma.SeasonalRateUpdateInput = {};
    if (dto.roomTypeId !== undefined)
      data.roomType = { connect: { id: dto.roomTypeId } };
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.multiplier !== undefined)
      data.multiplier = new Prisma.Decimal(dto.multiplier);
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);

    return this.prisma.seasonalRate.update({
      where: { id },
      data,
      include: {
        roomType: {
          select: { id: true, name: true },
        },
      },
    });
  }
}
