import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateIncomeDto } from './dto/create-income.dto';

@Injectable()
export class IncomeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an income entry and its corresponding append-only LedgerEntry (CREDIT).
   */
  async create(tenantId: string, dto: CreateIncomeDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const income = await tx.income.create({
        data: {
          tenantId,
          amount: new Prisma.Decimal(dto.amount),
          description: dto.description,
          source: dto.source,
          method: dto.method,
          date: new Date(dto.date),
          receivedBy: userId,
          notes: dto.notes,
        },
      });

      // Append-only ledger entry -- NEVER update or delete
      await tx.ledgerEntry.create({
        data: {
          tenantId,
          type: 'CREDIT',
          amount: new Prisma.Decimal(dto.amount),
          category: 'INCOME_OTHER',
          referenceType: 'INCOME',
          referenceId: income.id,
          description: dto.description,
          createdBy: userId,
        },
      });

      return income;
    });
  }

  /**
   * List income entries with optional filters: date range, source, and pagination.
   */
  async list(
    tenantId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      source?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const { startDate, endDate, source, skip = 0, take = 50 } = filters || {};

    const where: Prisma.IncomeWhereInput = { tenantId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    if (source) {
      where.source = source;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.income.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
      }),
      this.prisma.income.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  /**
   * Get a single income entry by ID, scoped to the tenant.
   */
  async getById(tenantId: string, id: string) {
    const income = await this.prisma.income.findFirst({
      where: { id, tenantId },
    });

    if (!income) {
      throw new NotFoundException(`Income entry with ID "${id}" not found`);
    }

    return income;
  }
}
