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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import {
  UpdateReservationDto,
  UpdateReservationStatusDto,
} from './dto/update-reservation.dto';
import { CheckInDto } from './dto/check-in.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  @ApiOperation({ summary: 'List reservations with optional filters' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({ name: 'guestName', required: false, type: String })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async list(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('guestName') guestName?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.reservationsService.list(tenantId, {
      status,
      fromDate,
      toDate,
      guestName,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get('today/arrivals')
  @ApiOperation({ summary: 'Get today\'s expected arrivals' })
  async getTodayArrivals(@TenantId() tenantId: string) {
    return this.reservationsService.getTodayArrivals(tenantId);
  }

  @Get('today/departures')
  @ApiOperation({ summary: 'Get today\'s expected departures' })
  async getTodayDepartures(@TenantId() tenantId: string) {
    return this.reservationsService.getTodayDepartures(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reservation details by ID' })
  @ApiParam({ name: 'id', description: 'Reservation UUID' })
  async getById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reservationsService.getById(tenantId, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a reservation (admin / walk-in)',
    description:
      'Admin-created reservation for walk-in guests, phone bookings, or agent bookings.',
  })
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateReservationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.reservationsService.create(tenantId, dto, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update reservation details' })
  @ApiParam({ name: 'id', description: 'Reservation UUID' })
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReservationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.reservationsService.update(tenantId, id, dto, userId);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update reservation status' })
  @ApiParam({ name: 'id', description: 'Reservation UUID' })
  async updateStatus(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReservationStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.reservationsService.updateStatus(
      tenantId,
      id,
      dto.status,
      userId,
    );
  }

  @Post(':id/check-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check in a reservation',
    description:
      'Assign physical rooms and check in the guest. Updates room statuses and creates Stay records.',
  })
  @ApiParam({ name: 'id', description: 'Reservation UUID' })
  async checkIn(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CheckInDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.reservationsService.checkIn(
      tenantId,
      id,
      dto.roomAssignments,
      userId,
    );
  }

  @Post(':id/check-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check out a reservation',
    description:
      'Check out the guest. Updates room statuses to dirty and closes Stay records.',
  })
  @ApiParam({ name: 'id', description: 'Reservation UUID' })
  async checkOut(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reservationsService.checkOut(tenantId, id, userId);
  }
}
