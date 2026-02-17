import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  PaymentProvider,
  InitiatePaymentParams,
  PaymentInitResult,
  PaymentVerifyResult,
  RefundResult,
} from './payment-provider.interface';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  async initiatePayment(
    params: InitiatePaymentParams,
  ): Promise<PaymentInitResult> {
    const transactionRef = randomUUID();
    const success = Math.random() < 0.9;

    return {
      success,
      transactionRef,
      redirectUrl: success
        ? `https://mock-payment.example.com/pay/${transactionRef}`
        : undefined,
      status: success ? 'initiated' : 'failed',
    };
  }

  async verifyPayment(transactionRef: string): Promise<PaymentVerifyResult> {
    return {
      success: true,
      transactionRef,
      amount: 0, // Caller should supply the expected amount for real providers
      status: 'paid',
    };
  }

  async refundPayment(
    transactionRef: string,
    amount?: number,
  ): Promise<RefundResult> {
    return {
      success: true,
      transactionRef,
      refundedAmount: amount ?? 0,
      status: 'refunded',
    };
  }
}
