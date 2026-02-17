import { Module, forwardRef } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { ReservationsModule } from '../reservations/reservations.module';
import { GuestsModule } from '../guests/guests.module';
import { AvailabilityModule } from '../availability/availability.module';
import { PaymentsModule } from '../payments/payments.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    forwardRef(() => ReservationsModule),
    GuestsModule,
    AvailabilityModule,
    PaymentsModule,
    AuditModule,
  ],
  providers: [BookingsService],
  controllers: [BookingsController],
  exports: [BookingsService],
})
export class BookingsModule {}
