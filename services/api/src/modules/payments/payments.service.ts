import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------
  // Record a new payment
  // ------------------------------------------------------------------
  async recordPayment(
    tenantId: string,
    dto: RecordPaymentDto,
    userId: string,
  ) {
    // If linked to a reservation, validate it belongs to this tenant
    if (dto.reservationId) {
      const reservation = await this.prisma.reservation.findFirst({
        where: { id: dto.reservationId, tenantId },
      });

      if (!reservation) {
        throw new NotFoundException(
          `Reservation "${dto.reservationId}" not found`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Payment record
      const payment = await tx.payment.create({
        data: {
          tenantId,
          reservationId: dto.reservationId ?? null,
          amount: dto.amount,
          method: dto.method,
          status: 'paid',
          description: dto.description ?? null,
          paidAt: new Date(),
        },
      });

      // 2. Create LedgerEntry (CREDIT, category PAYMENT) -- append-only
      await tx.ledgerEntry.create({
        data: {
          tenantId,
          type: 'CREDIT',
          amount: dto.amount,
          category: 'PAYMENT',
          referenceType: 'PAYMENT',
          referenceId: payment.id,
          paymentId: payment.id,
          description:
            dto.description ?? `Payment of ${dto.amount} via ${dto.method}`,
          createdBy: userId,
        },
      });

      // 3 & 4. If linked to a reservation, update paidAmount and optionally confirm
      if (dto.reservationId) {
        const reservation = await tx.reservation.findUniqueOrThrow({
          where: { id: dto.reservationId },
        });

        const summed = reservation.paidAmount.add(
          new Prisma.Decimal(dto.amount),
        );
        // Clamp to totalAmount so we never overshoot
        const newPaidAmount = summed.greaterThan(reservation.totalAmount)
          ? reservation.totalAmount
          : summed;

        const updateData: Prisma.ReservationUpdateInput = {
          paidAmount: newPaidAmount,
        };

        // If fully paid and still pending, auto-confirm
        if (
          newPaidAmount.greaterThanOrEqualTo(reservation.totalAmount) &&
          reservation.status === 'pending'
        ) {
          updateData.status = 'confirmed';
        }

        await tx.reservation.update({
          where: { id: dto.reservationId },
          data: updateData,
        });
      }

      // 5. Audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'create',
          entityType: 'payment',
          entityId: payment.id,
          after: {
            id: payment.id,
            amount: payment.amount.toString(),
            method: payment.method,
            reservationId: payment.reservationId,
          },
        },
      });

      return payment;
    });
  }

  // ------------------------------------------------------------------
  // List payments with pagination & filters
  // ------------------------------------------------------------------
  async listPayments(
    tenantId: string,
    filters?: {
      skip?: number;
      take?: number;
      status?: string;
      method?: string;
      reservationId?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const {
      skip = 0,
      take = 50,
      status,
      method,
      reservationId,
      dateFrom,
      dateTo,
    } = filters ?? {};

    const where: Prisma.PaymentWhereInput = { tenantId };

    if (status) {
      where.status = status;
    }

    if (method) {
      where.method = method;
    }

    if (reservationId) {
      where.reservationId = reservationId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: { reservation: true },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  // ------------------------------------------------------------------
  // Get a single payment
  // ------------------------------------------------------------------
  async getPayment(tenantId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, tenantId },
      include: { reservation: true, ledgerEntries: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment "${id}" not found`);
    }

    return payment;
  }

  // ------------------------------------------------------------------
  // Refund a payment (full or partial)
  // ------------------------------------------------------------------
  async refundPayment(
    tenantId: string,
    paymentId: string,
    dto: RefundPaymentDto,
    userId: string,
  ) {
    const original = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
    });

    if (!original) {
      throw new NotFoundException(`Payment "${paymentId}" not found`);
    }

    if (original.status === 'refunded') {
      throw new BadRequestException('Payment has already been fully refunded');
    }

    const refundAmount = dto.amount
      ? new Prisma.Decimal(dto.amount)
      : original.amount;

    if (refundAmount.greaterThan(original.amount)) {
      throw new BadRequestException(
        'Refund amount cannot exceed the original payment amount',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create refund Payment record with negative amount
      const refund = await tx.payment.create({
        data: {
          tenantId,
          reservationId: original.reservationId,
          amount: refundAmount.negated(),
          method: original.method,
          status: 'refunded',
          description:
            dto.reason ?? `Refund of payment ${paymentId}`,
          refundedAt: new Date(),
        },
      });

      // Mark original payment as refunded if full refund
      if (refundAmount.equals(original.amount)) {
        await tx.payment.update({
          where: { id: paymentId },
          data: { status: 'refunded', refundedAt: new Date() },
        });
      }

      // 2. Create LedgerEntry (DEBIT, category REFUND) -- append-only
      await tx.ledgerEntry.create({
        data: {
          tenantId,
          type: 'DEBIT',
          amount: refundAmount.abs(),
          category: 'REFUND',
          referenceType: 'PAYMENT',
          referenceId: refund.id,
          paymentId: refund.id,
          description:
            dto.reason ??
            `Refund of ${refundAmount.abs()} for payment ${paymentId}`,
          createdBy: userId,
        },
      });

      // 3. Update reservation.paidAmount if linked
      if (original.reservationId) {
        const reservation = await tx.reservation.findUniqueOrThrow({
          where: { id: original.reservationId },
        });

        const newPaid = reservation.paidAmount.sub(refundAmount.abs());

        await tx.reservation.update({
          where: { id: original.reservationId },
          data: {
            paidAmount: newPaid.lessThan(0)
              ? new Prisma.Decimal(0)
              : newPaid,
          },
        });
      }

      // 4. Audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'create',
          entityType: 'payment',
          entityId: refund.id,
          before: {
            originalPaymentId: paymentId,
            originalAmount: original.amount.toString(),
          },
          after: {
            id: refund.id,
            refundedAmount: refundAmount.abs().toString(),
            reason: dto.reason ?? null,
          },
        },
      });

      return refund;
    });
  }

  // ------------------------------------------------------------------
  // Get all payments linked to a reservation
  // ------------------------------------------------------------------
  async getPaymentsByReservation(tenantId: string, reservationId: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, tenantId },
    });

    if (!reservation) {
      throw new NotFoundException(
        `Reservation "${reservationId}" not found`,
      );
    }

    return this.prisma.payment.findMany({
      where: { tenantId, reservationId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
