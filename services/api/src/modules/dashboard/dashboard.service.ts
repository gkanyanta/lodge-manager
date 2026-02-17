import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(tenantId: string) {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      todayArrivals,
      todayDepartures,
      totalRooms,
      occupiedRooms,
      revenueToday,
      revenueMonth,
      pendingReservations,
    ] = await this.prisma.$transaction([
      // Today's arrivals: checkIn = today AND status = 'confirmed'
      this.prisma.reservation.count({
        where: {
          tenantId,
          checkIn: { gte: todayStart, lte: todayEnd },
          status: 'confirmed',
        },
      }),

      // Today's departures: checkOut = today AND status = 'checked_in'
      this.prisma.reservation.count({
        where: {
          tenantId,
          checkOut: { gte: todayStart, lte: todayEnd },
          status: 'checked_in',
        },
      }),

      // Total active rooms
      this.prisma.room.count({
        where: { tenantId, active: true },
      }),

      // Occupied rooms
      this.prisma.room.count({
        where: { tenantId, active: true, status: 'occupied' },
      }),

      // Revenue today: sum of CREDIT ledger entries with category PAYMENT, created today
      this.prisma.ledgerEntry.aggregate({
        where: {
          tenantId,
          type: 'CREDIT',
          category: 'PAYMENT',
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        _sum: { amount: true },
      }),

      // Revenue this month
      this.prisma.ledgerEntry.aggregate({
        where: {
          tenantId,
          type: 'CREDIT',
          category: 'PAYMENT',
          createdAt: { gte: monthStart, lte: todayEnd },
        },
        _sum: { amount: true },
      }),

      // Pending reservations
      this.prisma.reservation.count({
        where: { tenantId, status: 'pending' },
      }),
    ]);

    const occupancyPercent =
      totalRooms > 0
        ? Math.round((occupiedRooms / totalRooms) * 10000) / 100
        : 0;

    return {
      todayArrivals,
      todayDepartures,
      occupancyPercent,
      totalRooms,
      occupiedRooms,
      revenueToday: revenueToday._sum.amount?.toNumber() ?? 0,
      revenueMonth: revenueMonth._sum.amount?.toNumber() ?? 0,
      pendingReservations,
    };
  }
}
