import { Module, OnModuleInit } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentProviderRegistry } from './payment-provider/payment-provider.registry';
import { MockPaymentProvider } from './payment-provider/mock-payment.provider';

@Module({
  providers: [
    PaymentsService,
    PaymentProviderRegistry,
    MockPaymentProvider,
  ],
  controllers: [PaymentsController],
  exports: [PaymentsService, PaymentProviderRegistry],
})
export class PaymentsModule implements OnModuleInit {
  constructor(
    private readonly registry: PaymentProviderRegistry,
    private readonly mockProvider: MockPaymentProvider,
  ) {}

  onModuleInit() {
    this.registry.register('mock', this.mockProvider);
  }
}
