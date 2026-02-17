import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { GuestsService } from './guests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Guests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('guests')
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Post()
  @RequirePermissions('guest:create')
  @ApiOperation({ summary: 'Find or create a guest by phone/email' })
  async findOrCreate(
    @TenantId() tenantId: string,
    @Body()
    body: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      idNumber?: string;
      country?: string;
      notes?: string;
    },
  ) {
    return this.guestsService.findOrCreate(tenantId, body);
  }

  @Get()
  @RequirePermissions('guest:read')
  @ApiOperation({ summary: 'List and search guests in the tenant' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @TenantId() tenantId: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('search') search?: string,
  ) {
    return this.guestsService.findAll(tenantId, { skip, take, search });
  }

  @Get(':id')
  @RequirePermissions('guest:read')
  @ApiOperation({ summary: 'Get a guest by ID with recent reservations' })
  async findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.guestsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('guest:update')
  @ApiOperation({ summary: 'Update guest details' })
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      idNumber?: string;
      country?: string;
      notes?: string;
      verified?: boolean;
    },
  ) {
    return this.guestsService.update(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('guest:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a guest (only if they have no reservations)' })
  async delete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.guestsService.delete(tenantId, id);
    return { message: 'Guest deleted successfully' };
  }
}
