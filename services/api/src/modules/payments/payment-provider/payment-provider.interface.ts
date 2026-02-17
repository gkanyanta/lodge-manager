export interface InitiatePaymentParams {
  amount: number;
  currency: string;
  reference: string;
  customerPhone?: string;
  customerEmail?: string;
  description: string;
  callbackUrl: string;
}

export interface PaymentInitResult {
  success: boolean;
  transactionRef: string;
  redirectUrl?: string;
  status: string;
}

export interface PaymentVerifyResult {
  success: boolean;
  transactionRef: string;
  amount: number;
  status: string;
}

export interface RefundResult {
  success: boolean;
  transactionRef: string;
  refundedAmount: number;
  status: string;
}

export interface PaymentProvider {
  initiatePayment(params: InitiatePaymentParams): Promise<PaymentInitResult>;
  verifyPayment(transactionRef: string): Promise<PaymentVerifyResult>;
  refundPayment(transactionRef: string, amount?: number): Promise<RefundResult>;
}
