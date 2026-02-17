import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Expense Categories ─────────────────────────────────────

  /**
   * Create a new expense category for the tenant.
   * Category names must be unique within a tenant.
   */
  async createCategory(tenantId: string, dto: CreateExpenseCategoryDto) {
    const existing = await this.prisma.expenseCategory.findFirst({
      where: { tenantId, name: dto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Expense category "${dto.name}" already exists`,
      );
    }

    return this.prisma.expenseCategory.create({
      data: {
        tenantId,
        name: dto.name,
      },
    });
  }

  /**
   * List all expense categories for the tenant.
   */
  async listCategories(tenantId: string) {
    return this.prisma.expenseCategory.findMany({
      where: { tenantId, active: true },
      orderBy: { name: 'asc' },
    });
  }

  // ─── Expenses ───────────────────────────────────────────────

  /**
   * Create an expense entry and its corresponding append-only LedgerEntry (DEBIT).
   */
  async create(tenantId: string, dto: CreateExpenseDto, userId: string) {
    // Verify that the category exists and belongs to this tenant
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id: dto.categoryId, tenantId },
    });

    if (!category) {
      throw new NotFoundException(
        `Expense category with ID "${dto.categoryId}" not found`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          tenantId,
          categoryId: dto.categoryId,
          amount: new Prisma.Decimal(dto.amount),
          description: dto.description,
          method: dto.method,
          date: new Date(dto.date),
          vendor: dto.vendor,
          receipt: dto.receipt,
          notes: dto.notes,
          createdBy: userId,
        },
        include: {
          category: true,
        },
      });

      // Append-only ledger entry -- NEVER update or delete
      await tx.ledgerEntry.create({
        data: {
          tenantId,
          type: 'DEBIT',
          amount: new Prisma.Decimal(dto.amount),
          category: 'EXPENSE',
          referenceType: 'EXPENSE',
          referenceId: expense.id,
          description: dto.description,
          createdBy: userId,
        },
      });

      return expense;
    });
  }

  /**
   * List expenses with optional filters: date range, category, and pagination.
   */
  async list(
    tenantId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      categoryId?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const { startDate, endDate, categoryId, skip = 0, take = 50 } =
      filters || {};

    const where: Prisma.ExpenseWhereInput = { tenantId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
        include: {
          category: true,
        },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  /**
   * Get a single expense by ID, scoped to the tenant.
   */
  async getById(tenantId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId },
      include: {
        category: true,
      },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID "${id}" not found`);
    }

    return expense;
  }
}
