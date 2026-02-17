import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @RequirePermissions('payment:create')
  @ApiOperation({ summary: 'Record a new payment' })
  async recordPayment(
    @TenantId() tenantId: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.recordPayment(tenantId, dto, userId);
  }

  @Get()
  @RequirePermissions('payment:read')
  @ApiOperation({ summary: 'List payments with pagination and filters' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'method', required: false, type: String })
  @ApiQuery({ name: 'reservationId', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async listPayments(
    @TenantId() tenantId: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('status') status?: string,
    @Query('method') method?: string,
    @Query('reservationId') reservationId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.paymentsService.listPayments(tenantId, {
      skip,
      take,
      status,
      method,
      reservationId,
      dateFrom,
      dateTo,
    });
  }

  @Get('reservation/:reservationId')
  @RequirePermissions('payment:read')
  @ApiOperation({ summary: 'Get all payments for a reservation' })
  async getPaymentsByReservation(
    @TenantId() tenantId: string,
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
  ) {
    return this.paymentsService.getPaymentsByReservation(
      tenantId,
      reservationId,
    );
  }

  @Get(':id')
  @RequirePermissions('payment:read')
  @ApiOperation({ summary: 'Get a single payment by ID' })
  async getPayment(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.getPayment(tenantId, id);
  }

  @Post(':id/refund')
  @RequirePermissions('payment:create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refund a payment (full or partial)' })
  async refundPayment(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RefundPaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.refundPayment(tenantId, id, dto, userId);
  }
}
