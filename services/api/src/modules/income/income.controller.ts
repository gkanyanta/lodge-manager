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
import { IncomeService } from './income.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Income')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/income')
export class IncomeController {
  constructor(private readonly incomeService: IncomeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new income entry' })
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateIncomeDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.incomeService.create(tenantId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List income entries with optional filters' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'source', required: false, type: String, description: 'Income source filter' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async list(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('source') source?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.incomeService.list(tenantId, {
      startDate,
      endDate,
      source,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an income entry by ID' })
  async getById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.incomeService.getById(tenantId, id);
  }
}
