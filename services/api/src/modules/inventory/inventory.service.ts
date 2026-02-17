import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
} from './dto/create-inventory-item.dto';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/create-supplier.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────
  // CATEGORIES
  // ──────────────────────────────────────────────────────────

  async createCategory(tenantId: string, name: string) {
    return this.prisma.inventoryCategory.create({
      data: { tenantId, name },
    });
  }

  async listCategories(tenantId: string) {
    return this.prisma.inventoryCategory.findMany({
      where: { tenantId, active: true },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { items: true } },
      },
    });
  }

  // ──────────────────────────────────────────────────────────
  // SUPPLIERS
  // ──────────────────────────────────────────────────────────

  async createSupplier(tenantId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: { tenantId, ...dto },
    });
  }

  async listSuppliers(tenantId: string) {
    return this.prisma.supplier.findMany({
      where: { tenantId, active: true },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { items: true } },
      },
    });
  }

  async updateSupplier(
    tenantId: string,
    id: string,
    dto: UpdateSupplierDto,
  ) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID "${id}" not found`);
    }

    return this.prisma.supplier.update({
      where: { id },
      data: dto,
    });
  }

  // ──────────────────────────────────────────────────────────
  // INVENTORY ITEMS
  // ──────────────────────────────────────────────────────────

  async createItem(tenantId: string, dto: CreateInventoryItemDto) {
    // Verify that the category exists within the tenant
    const category = await this.prisma.inventoryCategory.findFirst({
      where: { id: dto.categoryId, tenantId },
    });

    if (!category) {
      throw new NotFoundException(
        `Inventory category with ID "${dto.categoryId}" not found`,
      );
    }

    // Verify supplier exists within the tenant if provided
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, tenantId },
      });

      if (!supplier) {
        throw new NotFoundException(
          `Supplier with ID "${dto.supplierId}" not found`,
        );
      }
    }

    return this.prisma.inventoryItem.create({
      data: {
        tenantId,
        categoryId: dto.categoryId,
        supplierId: dto.supplierId,
        name: dto.name,
        sku: dto.sku,
        unit: dto.unit,
        reorderLevel: dto.reorderLevel,
        costPrice: dto.costPrice,
      },
      include: {
        category: true,
        supplier: true,
      },
    });
  }

  async listItems(
    tenantId: string,
    filters?: {
      categoryId?: string;
      supplierId?: string;
      search?: string;
      lowStock?: boolean;
      active?: boolean;
      skip?: number;
      take?: number;
    },
  ) {
    const {
      categoryId,
      supplierId,
      search,
      lowStock,
      active = true,
      skip = 0,
      take = 50,
    } = filters || {};

    const where: Prisma.InventoryItemWhereInput = { tenantId, active };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventoryItem.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          category: true,
          supplier: true,
        },
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    // Filter low-stock items in application layer if requested
    // (Prisma does not natively support column-to-column comparison in where clauses)
    const filteredData = lowStock
      ? data.filter((item) => item.currentStock <= item.reorderLevel)
      : data;

    return {
      data: filteredData,
      total: lowStock ? filteredData.length : total,
      skip,
      take,
    };
  }

  async getItem(tenantId: string, id: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, tenantId },
      include: {
        category: true,
        supplier: true,
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with ID "${id}" not found`);
    }

    return item;
  }

  async updateItem(
    tenantId: string,
    id: string,
    dto: UpdateInventoryItemDto,
  ) {
    await this.getItem(tenantId, id);

    // Verify category if being updated
    if (dto.categoryId) {
      const category = await this.prisma.inventoryCategory.findFirst({
        where: { id: dto.categoryId, tenantId },
      });

      if (!category) {
        throw new NotFoundException(
          `Inventory category with ID "${dto.categoryId}" not found`,
        );
      }
    }

    // Verify supplier if being updated
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, tenantId },
      });

      if (!supplier) {
        throw new NotFoundException(
          `Supplier with ID "${dto.supplierId}" not found`,
        );
      }
    }

    return this.prisma.inventoryItem.update({
      where: { id },
      data: dto,
      include: {
        category: true,
        supplier: true,
      },
    });
  }

  // ──────────────────────────────────────────────────────────
  // STOCK OPERATIONS (Transactional)
  // ──────────────────────────────────────────────────────────

  /**
   * Stock In: Add stock to an inventory item.
   * Creates an append-only StockMovement record and updates the item's currentStock.
   */
  async stockIn(
    tenantId: string,
    itemId: string,
    quantity: number,
    reason?: string,
    reference?: string,
    userId?: string,
  ) {
    // Validate item exists and belongs to the tenant
    await this.getItem(tenantId, itemId);

    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          tenantId,
          itemId,
          type: 'stock_in',
          quantity, // positive for stock-in
          reason,
          reference,
          createdBy: userId,
        },
      });

      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          currentStock: { increment: quantity },
        },
        include: {
          category: true,
          supplier: true,
        },
      });

      return { item: updatedItem, movement };
    });
  }

  /**
   * Stock Out: Remove stock from an inventory item.
   * Validates sufficient stock, creates an append-only StockMovement, and decrements currentStock.
   */
  async stockOut(
    tenantId: string,
    itemId: string,
    quantity: number,
    reason?: string,
    userId?: string,
  ) {
    const item = await this.getItem(tenantId, itemId);

    if (item.currentStock < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Current stock: ${item.currentStock}, requested: ${quantity}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          tenantId,
          itemId,
          type: 'stock_out',
          quantity: -quantity, // negative for stock-out
          reason,
          createdBy: userId,
        },
      });

      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          currentStock: { decrement: quantity },
        },
        include: {
          category: true,
          supplier: true,
        },
      });

      return { item: updatedItem, movement };
    });
  }

  /**
   * Adjust Stock: Set an item's stock to a specific quantity.
   * Calculates the difference, creates an append-only StockMovement, and sets the new stock level.
   */
  async adjustStock(
    tenantId: string,
    itemId: string,
    newQuantity: number,
    reason?: string,
    userId?: string,
  ) {
    const item = await this.getItem(tenantId, itemId);
    const difference = newQuantity - item.currentStock;

    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          tenantId,
          itemId,
          type: 'adjustment',
          quantity: difference,
          reason:
            reason ||
            `Adjusted from ${item.currentStock} to ${newQuantity}`,
          createdBy: userId,
        },
      });

      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          currentStock: newQuantity,
        },
        include: {
          category: true,
          supplier: true,
        },
      });

      return { item: updatedItem, movement, previousStock: item.currentStock };
    });
  }

  /**
   * Get Low Stock Items: Returns items where currentStock <= reorderLevel.
   * Uses raw SQL for efficient column-to-column comparison, then enriches
   * the results with related category and supplier data.
   */
  async getLowStockItems(tenantId: string) {
    // Prisma does not natively support column-to-column comparisons in where
    // clauses, so we fetch active items and filter in the application layer.
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        tenantId,
        active: true,
      },
      orderBy: { currentStock: 'asc' },
      include: {
        category: true,
        supplier: true,
      },
    });

    return items.filter((item) => item.currentStock <= item.reorderLevel);
  }

  /**
   * Get stock movement history for an item.
   */
  async getStockMovements(
    tenantId: string,
    itemId: string,
    params?: { skip?: number; take?: number },
  ) {
    const { skip = 0, take = 50 } = params || {};

    await this.getItem(tenantId, itemId);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where: { tenantId, itemId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockMovement.count({ where: { tenantId, itemId } }),
    ]);

    return { data, total, skip, take };
  }
}
