import { Injectable } from '@nestjs/common';
import { PaymentProvider } from './payment-provider.interface';

@Injectable()
export class PaymentProviderRegistry {
  private providers = new Map<string, PaymentProvider>();

  register(name: string, provider: PaymentProvider): void {
    this.providers.set(name, provider);
  }

  get(name: string): PaymentProvider | undefined {
    return this.providers.get(name);
  }

  getDefault(): PaymentProvider | undefined {
    return this.providers.get('mock');
  }
}
