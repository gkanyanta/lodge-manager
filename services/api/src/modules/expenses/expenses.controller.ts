import {
  Controller,
  Get,
  Post,
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
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // ─── Categories ─────────────────────────────────────────────

  @Post('categories')
  @ApiOperation({ summary: 'Create a new expense category' })
  async createCategory(
    @TenantId() tenantId: string,
    @Body() dto: CreateExpenseCategoryDto,
  ) {
    return this.expensesService.createCategory(tenantId, dto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List all expense categories' })
  async listCategories(@TenantId() tenantId: string) {
    return this.expensesService.listCategories(tenantId);
  }

  // ─── Expenses ───────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new expense entry' })
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateExpenseDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.expensesService.create(tenantId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List expenses with optional filters' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Filter by expense category ID' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async list(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('categoryId') categoryId?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.expensesService.list(tenantId, {
      startDate,
      endDate,
      categoryId,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an expense by ID' })
  async getById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expensesService.getById(tenantId, id);
  }
}
