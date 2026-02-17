import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-cash-up')
  @ApiOperation({ summary: 'Get daily cash-up report grouped by payment method' })
  @ApiQuery({ name: 'date', required: true, type: String, description: 'YYYY-MM-DD' })
  async getDailyCashUp(
    @TenantId() tenantId: string,
    @Query('date') date: string,
  ) {
    if (!date) {
      throw new BadRequestException('date query parameter is required');
    }
    return this.reportsService.getDailyCashUp(tenantId, date);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue report for a date range' })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'YYYY-MM-DD' })
  async getRevenueReport(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    this.validateDateRange(startDate, endDate);
    return this.reportsService.getRevenueReport(tenantId, startDate, endDate);
  }

  @Get('expenses')
  @ApiOperation({ summary: 'Get expense report for a date range' })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'YYYY-MM-DD' })
  async getExpenseReport(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    this.validateDateRange(startDate, endDate);
    return this.reportsService.getExpenseReport(tenantId, startDate, endDate);
  }

  @Get('profit')
  @ApiOperation({ summary: 'Get profit summary for a date range' })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'YYYY-MM-DD' })
  async getProfitSummary(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    this.validateDateRange(startDate, endDate);
    return this.reportsService.getProfitSummary(tenantId, startDate, endDate);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export a report as CSV' })
  @ApiProduces('text/csv')
  @ApiQuery({ name: 'type', required: true, type: String, description: 'Report type: revenue, expenses, profit, daily-cash-up' })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'YYYY-MM-DD (used as date for daily-cash-up)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'YYYY-MM-DD (not required for daily-cash-up)' })
  async exportCsv(
    @TenantId() tenantId: string,
    @Query('type') type: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    if (!type) {
      throw new BadRequestException('type query parameter is required');
    }
    if (!startDate) {
      throw new BadRequestException('startDate query parameter is required');
    }
    // endDate not required for daily-cash-up
    if (type !== 'daily-cash-up' && !endDate) {
      throw new BadRequestException(
        'endDate query parameter is required for this report type',
      );
    }

    const csv = await this.reportsService.exportCsv(
      tenantId,
      type,
      startDate,
      endDate,
    );

    const filename = `${type}-report-${startDate}${endDate ? '-to-' + endDate : ''}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // ─── Helpers ────────────────────────────────────────────────

  private validateDateRange(startDate: string, endDate: string): void {
    if (!startDate) {
      throw new BadRequestException('startDate query parameter is required');
    }
    if (!endDate) {
      throw new BadRequestException('endDate query parameter is required');
    }
    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('startDate must be before or equal to endDate');
    }
  }
}
