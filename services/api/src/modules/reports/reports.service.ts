import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface DateRange {
  startDate: string;
  endDate: string;
}

export interface DailyBreakdownItem {
  date: string;
  total: number;
  items: Record<string, number>;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Daily Cash-Up ──────────────────────────────────────────

  /**
   * Group all CREDIT ledger entries by payment method for the given date.
   * Returns totals per method and a grand total.
   *
   * Joins ledger entries back to Income (via referenceType/referenceId) and
   * Payment records to resolve the payment method.
   */
  async getDailyCashUp(tenantId: string, date: string) {
    const dayStart = new Date(date);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setUTCHours(23, 59, 59, 999);

    // Fetch all CREDIT ledger entries for the day
    const creditEntries = await this.prisma.ledgerEntry.findMany({
      where: {
        tenantId,
        type: 'CREDIT',
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Resolve payment method for each entry
    const methodTotals: Record<string, number> = {};
    let grandTotal = 0;

    for (const entry of creditEntries) {
      let method = 'unknown';

      if (entry.referenceType === 'INCOME') {
        const income = await this.prisma.income.findUnique({
          where: { id: entry.referenceId },
          select: { method: true },
        });
        if (income) method = income.method;
      } else if (entry.referenceType === 'PAYMENT' && entry.paymentId) {
        const payment = await this.prisma.payment.findUnique({
          where: { id: entry.paymentId },
          select: { method: true },
        });
        if (payment) method = payment.method;
      }

      const amount = Number(entry.amount);
      methodTotals[method] = (methodTotals[method] || 0) + amount;
      grandTotal += amount;
    }

    return {
      date,
      methodTotals,
      grandTotal: Math.round(grandTotal * 100) / 100,
      entryCount: creditEntries.length,
    };
  }

  // ─── Revenue Report ─────────────────────────────────────────

  /**
   * Sum CREDIT entries grouped by category for a date range.
   * Returns daily breakdown and category totals.
   */
  async getRevenueReport(tenantId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    const creditEntries = await this.prisma.ledgerEntry.findMany({
      where: {
        tenantId,
        type: 'CREDIT',
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'asc' },
    });

    const categoryTotals: Record<string, number> = {};
    const dailyMap = new Map<string, Record<string, number>>();
    let grandTotal = 0;

    for (const entry of creditEntries) {
      const dateKey = entry.createdAt.toISOString().split('T')[0];
      const amount = Number(entry.amount);

      // Category totals
      categoryTotals[entry.category] =
        (categoryTotals[entry.category] || 0) + amount;

      // Daily breakdown
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {});
      }
      const dayCategories = dailyMap.get(dateKey)!;
      dayCategories[entry.category] =
        (dayCategories[entry.category] || 0) + amount;

      grandTotal += amount;
    }

    const dailyBreakdown: DailyBreakdownItem[] = Array.from(
      dailyMap.entries(),
    ).map(([date, items]) => ({
      date,
      total: Math.round(Object.values(items).reduce((s, v) => s + v, 0) * 100) / 100,
      items,
    }));

    // Sort daily breakdown by date ascending
    dailyBreakdown.sort((a, b) => a.date.localeCompare(b.date));

    return {
      startDate,
      endDate,
      categoryTotals,
      grandTotal: Math.round(grandTotal * 100) / 100,
      dailyBreakdown,
    };
  }

  // ─── Expense Report ─────────────────────────────────────────

  /**
   * Sum DEBIT entries where category = EXPENSE grouped by expense category
   * for a date range. Returns daily breakdown and totals.
   */
  async getExpenseReport(tenantId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    // Fetch DEBIT entries that represent expenses
    const debitEntries = await this.prisma.ledgerEntry.findMany({
      where: {
        tenantId,
        type: 'DEBIT',
        category: 'EXPENSE',
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Resolve expense category names by looking up the referenced Expense record
    const expenseCategoryTotals: Record<string, number> = {};
    const dailyMap = new Map<string, Record<string, number>>();
    let grandTotal = 0;

    // Batch-fetch all referenced expenses for efficiency
    const expenseIds = debitEntries
      .filter((e) => e.referenceType === 'EXPENSE')
      .map((e) => e.referenceId);

    const expenses = await this.prisma.expense.findMany({
      where: { id: { in: expenseIds }, tenantId },
      include: { category: true },
    });

    const expenseMap = new Map(expenses.map((e) => [e.id, e]));

    for (const entry of debitEntries) {
      const dateKey = entry.createdAt.toISOString().split('T')[0];
      const amount = Number(entry.amount);

      // Resolve expense category name
      const expense = expenseMap.get(entry.referenceId);
      const categoryName = expense?.category?.name || 'Uncategorized';

      // Category totals
      expenseCategoryTotals[categoryName] =
        (expenseCategoryTotals[categoryName] || 0) + amount;

      // Daily breakdown
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {});
      }
      const dayCategories = dailyMap.get(dateKey)!;
      dayCategories[categoryName] =
        (dayCategories[categoryName] || 0) + amount;

      grandTotal += amount;
    }

    const dailyBreakdown: DailyBreakdownItem[] = Array.from(
      dailyMap.entries(),
    ).map(([date, items]) => ({
      date,
      total: Math.round(Object.values(items).reduce((s, v) => s + v, 0) * 100) / 100,
      items,
    }));

    dailyBreakdown.sort((a, b) => a.date.localeCompare(b.date));

    return {
      startDate,
      endDate,
      expenseCategoryTotals,
      grandTotal: Math.round(grandTotal * 100) / 100,
      dailyBreakdown,
    };
  }

  // ─── Profit Summary ─────────────────────────────────────────

  /**
   * Calculate total revenue (CREDIT entries), total expenses (DEBIT entries
   * where category = EXPENSE), and net profit for a date range.
   */
  async getProfitSummary(tenantId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    // Total revenue: sum of all CREDIT entries
    const revenueResult = await this.prisma.ledgerEntry.aggregate({
      where: {
        tenantId,
        type: 'CREDIT',
        createdAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: true,
    });

    // Total expenses: sum of DEBIT entries where category = EXPENSE
    const expenseResult = await this.prisma.ledgerEntry.aggregate({
      where: {
        tenantId,
        type: 'DEBIT',
        category: 'EXPENSE',
        createdAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: true,
    });

    const totalRevenue = Number(revenueResult._sum.amount || 0);
    const totalExpenses = Number(expenseResult._sum.amount || 0);
    const netProfit = totalRevenue - totalExpenses;

    return {
      startDate,
      endDate,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      revenueEntryCount: revenueResult._count,
      expenseEntryCount: expenseResult._count,
    };
  }

  // ─── CSV Export ─────────────────────────────────────────────

  /**
   * Generate a CSV string for a given report type.
   */
  async exportCsv(
    tenantId: string,
    reportType: string,
    startDate: string,
    endDate: string,
  ): Promise<string> {
    switch (reportType) {
      case 'revenue':
        return this.buildRevenueCsv(tenantId, startDate, endDate);
      case 'expenses':
        return this.buildExpenseCsv(tenantId, startDate, endDate);
      case 'profit':
        return this.buildProfitCsv(tenantId, startDate, endDate);
      case 'daily-cash-up':
        return this.buildDailyCashUpCsv(tenantId, startDate);
      default:
        throw new BadRequestException(
          `Unknown report type "${reportType}". Valid types: revenue, expenses, profit, daily-cash-up`,
        );
    }
  }

  // ─── Private CSV Builders ───────────────────────────────────

  private async buildRevenueCsv(
    tenantId: string,
    startDate: string,
    endDate: string,
  ): Promise<string> {
    const report = await this.getRevenueReport(tenantId, startDate, endDate);

    const rows: string[] = [];
    rows.push('Date,Category,Amount');

    for (const day of report.dailyBreakdown) {
      for (const [category, amount] of Object.entries(day.items)) {
        rows.push(
          `${this.escapeCsv(day.date)},${this.escapeCsv(category)},${(amount as number).toFixed(2)}`,
        );
      }
    }

    rows.push('');
    rows.push('Category Totals');
    rows.push('Category,Total');
    for (const [category, total] of Object.entries(report.categoryTotals)) {
      rows.push(`${this.escapeCsv(category)},${(total as number).toFixed(2)}`);
    }

    rows.push('');
    rows.push(`Grand Total,${report.grandTotal.toFixed(2)}`);

    return rows.join('\n');
  }

  private async buildExpenseCsv(
    tenantId: string,
    startDate: string,
    endDate: string,
  ): Promise<string> {
    const report = await this.getExpenseReport(tenantId, startDate, endDate);

    const rows: string[] = [];
    rows.push('Date,Category,Amount');

    for (const day of report.dailyBreakdown) {
      for (const [category, amount] of Object.entries(day.items)) {
        rows.push(
          `${this.escapeCsv(day.date)},${this.escapeCsv(category)},${(amount as number).toFixed(2)}`,
        );
      }
    }

    rows.push('');
    rows.push('Category Totals');
    rows.push('Category,Total');
    for (const [category, total] of Object.entries(
      report.expenseCategoryTotals,
    )) {
      rows.push(`${this.escapeCsv(category)},${(total as number).toFixed(2)}`);
    }

    rows.push('');
    rows.push(`Grand Total,${report.grandTotal.toFixed(2)}`);

    return rows.join('\n');
  }

  private async buildProfitCsv(
    tenantId: string,
    startDate: string,
    endDate: string,
  ): Promise<string> {
    const report = await this.getProfitSummary(tenantId, startDate, endDate);

    const rows: string[] = [];
    rows.push('Metric,Amount');
    rows.push(`Total Revenue,${report.totalRevenue.toFixed(2)}`);
    rows.push(`Total Expenses,${report.totalExpenses.toFixed(2)}`);
    rows.push(`Net Profit,${report.netProfit.toFixed(2)}`);
    rows.push(`Period,${report.startDate} to ${report.endDate}`);

    return rows.join('\n');
  }

  private async buildDailyCashUpCsv(
    tenantId: string,
    date: string,
  ): Promise<string> {
    const report = await this.getDailyCashUp(tenantId, date);

    const rows: string[] = [];
    rows.push('Payment Method,Amount');

    for (const [method, amount] of Object.entries(report.methodTotals)) {
      rows.push(`${this.escapeCsv(method)},${(amount as number).toFixed(2)}`);
    }

    rows.push('');
    rows.push(`Grand Total,${report.grandTotal.toFixed(2)}`);
    rows.push(`Date,${report.date}`);
    rows.push(`Entry Count,${report.entryCount}`);

    return rows.join('\n');
  }

  /**
   * Escape a value for safe CSV inclusion.
   */
  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
