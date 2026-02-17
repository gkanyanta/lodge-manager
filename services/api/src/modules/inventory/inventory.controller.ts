import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
} from './dto/create-inventory-item.dto';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/create-supplier.dto';
import { StockInDto, StockOutDto, StockAdjustmentDto } from './dto/stock-movement.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ──────────────────────────────────────────────────────────
  // CATEGORIES
  // ──────────────────────────────────────────────────────────

  @Post('categories')
  @RequirePermissions('inventory:create')
  @ApiOperation({ summary: 'Create an inventory category' })
  async createCategory(
    @TenantId() tenantId: string,
    @Body('name') name: string,
  ) {
    return this.inventoryService.createCategory(tenantId, name);
  }

  @Get('categories')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'List all inventory categories' })
  async listCategories(@TenantId() tenantId: string) {
    return this.inventoryService.listCategories(tenantId);
  }

  // ──────────────────────────────────────────────────────────
  // SUPPLIERS
  // ──────────────────────────────────────────────────────────

  @Post('suppliers')
  @RequirePermissions('inventory:create')
  @ApiOperation({ summary: 'Create a supplier' })
  async createSupplier(
    @TenantId() tenantId: string,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.inventoryService.createSupplier(tenantId, dto);
  }

  @Get('suppliers')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'List all suppliers' })
  async listSuppliers(@TenantId() tenantId: string) {
    return this.inventoryService.listSuppliers(tenantId);
  }

  @Patch('suppliers/:id')
  @RequirePermissions('inventory:update')
  @ApiOperation({ summary: 'Update a supplier' })
  async updateSupplier(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.inventoryService.updateSupplier(tenantId, id, dto);
  }

  // ──────────────────────────────────────────────────────────
  // INVENTORY ITEMS
  // ──────────────────────────────────────────────────────────

  @Post('items')
  @RequirePermissions('inventory:create')
  @ApiOperation({ summary: 'Create an inventory item' })
  async createItem(
    @TenantId() tenantId: string,
    @Body() dto: CreateInventoryItemDto,
  ) {
    return this.inventoryService.createItem(tenantId, dto);
  }

  @Get('items')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'List inventory items with optional filters' })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'supplierId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'lowStock', required: false, type: Boolean })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async listItems(
    @TenantId() tenantId: string,
    @Query('categoryId') categoryId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('search') search?: string,
    @Query('lowStock') lowStock?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.inventoryService.listItems(tenantId, {
      categoryId,
      supplierId,
      search,
      lowStock: lowStock === 'true',
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('items/low-stock')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get items where current stock is at or below reorder level' })
  async getLowStockItems(@TenantId() tenantId: string) {
    return this.inventoryService.getLowStockItems(tenantId);
  }

  @Get('items/:id')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get an inventory item by ID with recent stock movements' })
  async getItem(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventoryService.getItem(tenantId, id);
  }

  @Patch('items/:id')
  @RequirePermissions('inventory:update')
  @ApiOperation({ summary: 'Update an inventory item' })
  async updateItem(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.inventoryService.updateItem(tenantId, id, dto);
  }

  // ──────────────────────────────────────────────────────────
  // STOCK OPERATIONS
  // ──────────────────────────────────────────────────────────

  @Post('stock-in')
  @RequirePermissions('inventory:update')
  @ApiOperation({ summary: 'Add stock to an inventory item' })
  async stockIn(
    @TenantId() tenantId: string,
    @Body() dto: StockInDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.stockIn(
      tenantId,
      dto.itemId,
      dto.quantity,
      dto.reason,
      dto.reference,
      userId,
    );
  }

  @Post('stock-out')
  @RequirePermissions('inventory:update')
  @ApiOperation({ summary: 'Remove stock from an inventory item' })
  async stockOut(
    @TenantId() tenantId: string,
    @Body() dto: StockOutDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.stockOut(
      tenantId,
      dto.itemId,
      dto.quantity,
      dto.reason,
      userId,
    );
  }

  @Post('stock-adjust')
  @RequirePermissions('inventory:update')
  @ApiOperation({ summary: 'Adjust stock to a specific quantity' })
  async adjustStock(
    @TenantId() tenantId: string,
    @Body() dto: StockAdjustmentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.adjustStock(
      tenantId,
      dto.itemId,
      dto.newQuantity,
      dto.reason,
      userId,
    );
  }

  @Get('items/:id/movements')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get stock movement history for an item' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async getStockMovements(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.inventoryService.getStockMovements(tenantId, id, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }
}
