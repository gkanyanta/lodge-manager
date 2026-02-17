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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @RequirePermissions('tenant:create')
  @ApiOperation({ summary: 'Create a new tenant (lodge)' })
  async create(
    @Body()
    body: {
      name: string;
      slug: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      country?: string;
      currency?: string;
      timezone?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.tenantsService.create(body);
  }

  @Get()
  @RequirePermissions('tenant:read')
  @ApiOperation({ summary: 'List all tenants' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  async findAll(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('search') search?: string,
    @Query('active') active?: boolean,
  ) {
    return this.tenantsService.findAll({ skip, take, search, active });
  }

  @Get('current')
  @ApiOperation({ summary: 'Get the current tenant details' })
  async getCurrent(@TenantId() tenantId: string) {
    return this.tenantsService.findOne(tenantId);
  }

  @Get(':id')
  @RequirePermissions('tenant:read')
  @ApiOperation({ summary: 'Get a tenant by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('tenant:update')
  @ApiOperation({ summary: 'Update a tenant' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      country?: string;
      currency?: string;
      timezone?: string;
      logoUrl?: string;
      settings?: Record<string, any>;
    },
  ) {
    return this.tenantsService.update(id, body);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('tenant:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a tenant' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.deactivate(id);
  }

  @Patch(':id/activate')
  @RequirePermissions('tenant:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a tenant' })
  async activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.activate(id);
  }
}
