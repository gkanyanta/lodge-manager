import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ManageBookingDto } from './dto/manage-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { Public } from '../../common/decorators/public.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Public()
  @ApiOperation({
    summary: 'Create a new booking (public)',
    description:
      'Public endpoint for guests to create a booking. No authentication required.',
  })
  async createBooking(
    @Body() dto: CreateBookingDto,
    @TenantId() tenantId: string,
  ) {
    return this.bookingsService.createBooking(tenantId, dto);
  }

  @Post('manage')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Look up booking by reference and last name (public)',
    description:
      'Public endpoint for guests to view their booking details using the booking reference and last name.',
  })
  async getBooking(
    @Body() dto: ManageBookingDto,
    @TenantId() tenantId: string,
  ) {
    return this.bookingsService.getBookingByReference(
      tenantId,
      dto.bookingReference,
      dto.lastName,
      dto.verificationToken,
    );
  }

  @Post(':ref/cancel')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a booking (public)',
    description:
      'Public endpoint for guests to cancel their booking using the booking reference and last name.',
  })
  @ApiParam({
    name: 'ref',
    description: 'Booking reference (e.g., LDG-A1B2C3)',
    example: 'LDG-A1B2C3',
  })
  async cancelBooking(
    @Param('ref') ref: string,
    @Body() dto: CancelBookingDto,
    @TenantId() tenantId: string,
  ) {
    return this.bookingsService.cancelBooking(
      tenantId,
      ref,
      dto.lastName,
      dto.reason,
    );
  }
}
