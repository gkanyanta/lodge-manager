import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import { SearchAvailabilityDto } from './dto/search-availability.dto';
import { Public } from '../../common/decorators/public.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';

@ApiTags('Availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('search')
  @Public()
  @ApiOperation({
    summary: 'Search available room types for given dates and guest count',
  })
  async searchAvailability(
    @TenantId() tenantId: string,
    @Query() dto: SearchAvailabilityDto,
  ) {
    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);

    return this.availabilityService.searchAvailability(
      tenantId,
      checkIn,
      checkOut,
      dto.guests,
    );
  }
}
