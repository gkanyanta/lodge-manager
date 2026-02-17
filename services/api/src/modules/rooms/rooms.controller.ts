import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { CreateRatePlanDto } from './dto/create-rate-plan.dto';
import { UpdateRatePlanDto } from './dto/update-rate-plan.dto';
import { CreateSeasonalRateDto } from './dto/create-seasonal-rate.dto';
import { UpdateSeasonalRateDto } from './dto/update-seasonal-rate.dto';

@ApiTags('Rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  // ============================================================
  // ROOM TYPES
  // ============================================================

  @Post('types')
  @ApiOperation({ summary: 'Create a new room type' })
  async createRoomType(
    @TenantId() tenantId: string,
    @Body() dto: CreateRoomTypeDto,
  ) {
    return this.roomsService.createRoomType(tenantId, dto);
  }

  @Get('types')
  @ApiOperation({ summary: 'List all room types' })
  async listRoomTypes(@TenantId() tenantId: string) {
    return this.roomsService.listRoomTypes(tenantId);
  }

  @Get('types/:id')
  @ApiOperation({ summary: 'Get a room type by ID' })
  async getRoomType(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.roomsService.getRoomType(tenantId, id);
  }

  @Put('types/:id')
  @ApiOperation({ summary: 'Update a room type' })
  async updateRoomType(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomTypeDto,
  ) {
    return this.roomsService.updateRoomType(tenantId, id, dto);
  }

  // ============================================================
  // ROOMS
  // ============================================================

  @Post()
  @ApiOperation({ summary: 'Create a new room' })
  async createRoom(
    @TenantId() tenantId: string,
    @Body() dto: CreateRoomDto,
  ) {
    return this.roomsService.createRoom(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all rooms with optional filters' })
  @ApiQuery({ name: 'roomTypeId', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['available', 'occupied', 'reserved', 'dirty', 'out_of_service'],
  })
  @ApiQuery({ name: 'floor', required: false, type: String })
  async listRooms(
    @TenantId() tenantId: string,
    @Query('roomTypeId') roomTypeId?: string,
    @Query('status') status?: string,
    @Query('floor') floor?: string,
  ) {
    return this.roomsService.listRooms(tenantId, {
      roomTypeId,
      status,
      floor,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a room by ID' })
  async getRoom(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.roomsService.getRoom(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a room' })
  async updateRoom(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.roomsService.updateRoom(tenantId, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update room status' })
  async updateRoomStatus(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomStatusDto,
  ) {
    return this.roomsService.updateRoomStatus(tenantId, id, dto.status);
  }

  // ============================================================
  // RATE PLANS
  // ============================================================

  @Post('rate-plans')
  @ApiOperation({ summary: 'Create a rate plan' })
  async createRatePlan(
    @TenantId() tenantId: string,
    @Body() dto: CreateRatePlanDto,
  ) {
    return this.roomsService.createRatePlan(tenantId, dto);
  }

  @Get('rate-plans')
  @ApiOperation({ summary: 'List rate plans' })
  @ApiQuery({ name: 'roomTypeId', required: false, type: String })
  async listRatePlans(
    @TenantId() tenantId: string,
    @Query('roomTypeId') roomTypeId?: string,
  ) {
    return this.roomsService.listRatePlans(tenantId, roomTypeId);
  }

  @Put('rate-plans/:id')
  @ApiOperation({ summary: 'Update a rate plan' })
  async updateRatePlan(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRatePlanDto,
  ) {
    return this.roomsService.updateRatePlan(tenantId, id, dto);
  }

  @Delete('rate-plans/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete (deactivate) a rate plan' })
  async deleteRatePlan(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.roomsService.deleteRatePlan(tenantId, id);
  }

  // ============================================================
  // SEASONAL RATES
  // ============================================================

  @Post('seasonal-rates')
  @ApiOperation({ summary: 'Create a seasonal rate' })
  async createSeasonalRate(
    @TenantId() tenantId: string,
    @Body() dto: CreateSeasonalRateDto,
  ) {
    return this.roomsService.createSeasonalRate(tenantId, dto);
  }

  @Get('seasonal-rates')
  @ApiOperation({ summary: 'List seasonal rates' })
  @ApiQuery({ name: 'roomTypeId', required: false, type: String })
  async listSeasonalRates(
    @TenantId() tenantId: string,
    @Query('roomTypeId') roomTypeId?: string,
  ) {
    return this.roomsService.listSeasonalRates(tenantId, roomTypeId);
  }

  @Put('seasonal-rates/:id')
  @ApiOperation({ summary: 'Update a seasonal rate' })
  async updateSeasonalRate(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSeasonalRateDto,
  ) {
    return this.roomsService.updateSeasonalRate(tenantId, id, dto);
  }
}
