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
import { HousekeepingService } from './housekeeping.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateHousekeepingTaskDto } from './dto/create-housekeeping-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

@ApiTags('Housekeeping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('housekeeping')
export class HousekeepingController {
  constructor(private readonly housekeepingService: HousekeepingService) {}

  @Post('tasks')
  @RequirePermissions('housekeeping:create')
  @ApiOperation({ summary: 'Create a housekeeping task' })
  async createTask(
    @TenantId() tenantId: string,
    @Body() dto: CreateHousekeepingTaskDto,
  ) {
    return this.housekeepingService.createTask(tenantId, dto);
  }

  @Get('tasks')
  @RequirePermissions('housekeeping:read')
  @ApiOperation({ summary: 'List housekeeping tasks with filters' })
  @ApiQuery({ name: 'status', required: false, type: String, enum: ['pending', 'in_progress', 'done'] })
  @ApiQuery({ name: 'roomId', required: false, type: String })
  @ApiQuery({ name: 'assignedTo', required: false, type: String })
  @ApiQuery({ name: 'priority', required: false, type: String, enum: ['low', 'normal', 'high', 'urgent'] })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async listTasks(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('roomId') roomId?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('priority') priority?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.housekeepingService.listTasks(tenantId, {
      status,
      roomId,
      assignedTo,
      priority,
      dateFrom,
      dateTo,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('tasks/:id')
  @RequirePermissions('housekeeping:read')
  @ApiOperation({ summary: 'Get a housekeeping task by ID' })
  async getTask(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.housekeepingService.getTask(tenantId, id);
  }

  @Patch('tasks/:id/status')
  @RequirePermissions('housekeeping:update')
  @ApiOperation({ summary: 'Update the status of a housekeeping task' })
  async updateTaskStatus(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.housekeepingService.updateTaskStatus(
      tenantId,
      id,
      dto.status,
      userId,
    );
  }

  @Patch('tasks/:id/assign')
  @RequirePermissions('housekeeping:update')
  @ApiOperation({ summary: 'Assign a housekeeping task to a staff member' })
  async assignTask(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('assignedTo') assignedTo: string,
  ) {
    return this.housekeepingService.assignTask(tenantId, id, assignedTo);
  }

  @Get('rooms/:roomId/tasks')
  @RequirePermissions('housekeeping:read')
  @ApiOperation({ summary: 'Get all housekeeping tasks for a specific room' })
  async getTasksByRoom(
    @TenantId() tenantId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    return this.housekeepingService.getTasksByRoom(tenantId, roomId);
  }

  @Get('staff/:staffId/tasks')
  @RequirePermissions('housekeeping:read')
  @ApiOperation({ summary: 'Get all housekeeping tasks for a specific staff member' })
  async getTasksByStaff(
    @TenantId() tenantId: string,
    @Param('staffId') staffId: string,
  ) {
    return this.housekeepingService.getTasksByStaff(tenantId, staffId);
  }
}
