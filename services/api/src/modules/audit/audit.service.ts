import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an append-only audit log entry.
   *
   * @param tenantId  - Tenant scope
   * @param userId    - User who performed the action (null for system actions)
   * @param action    - Action performed (create, update, delete, status_change, login, logout, etc.)
   * @param entityType - Type of entity affected (reservation, payment, room, user, guest, etc.)
   * @param entityId  - ID of the affected entity
   * @param before    - Entity state before the change (null for create actions)
   * @param after     - Entity state after the change (null for delete actions)
   * @param ipAddress - Request IP address
   * @param userAgent - Request User-Agent header
   */
  async log(
    tenantId: string,
    userId: string | null,
    action: string,
    entityType: string,
    entityId: string | null,
    before: Record<string, any> | null,
    after: Record<string, any> | null,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        entityType,
        entityId,
        before: before ?? Prisma.JsonNull,
        after: after ?? Prisma.JsonNull,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });
  }

  async findAll(
    tenantId: string,
    params: {
      skip?: number;
      take?: number;
      entityType?: string;
      entityId?: string;
      userId?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const {
      skip = 0,
      take = 50,
      entityType,
      entityId,
      userId,
      action,
      startDate,
      endDate,
    } = params;

    const where: Prisma.AuditLogWhereInput = { tenantId };

    if (entityType) {
      where.entityType = entityType;
    }

    if (entityId) {
      where.entityId = entityId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async findOne(tenantId: string, id: string) {
    const entry = await this.prisma.auditLog.findFirst({
      where: { id, tenantId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!entry) {
      return null;
    }

    return entry;
  }

  /**
   * Get all audit entries for a specific entity, useful for showing
   * a timeline of changes on a detail page.
   */
  async findByEntity(
    tenantId: string,
    entityType: string,
    entityId: string,
    params: { skip?: number; take?: number } = {},
  ) {
    const { skip = 0, take = 100 } = params;

    const where: Prisma.AuditLogWhereInput = {
      tenantId,
      entityType,
      entityId,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, skip, take };
  }
}
