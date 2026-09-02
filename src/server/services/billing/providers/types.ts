export interface PaymentMethodData {
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  token?: string;
}

export interface CheckoutSessionParams {
  customerId?: string;
  customerEmail?: string;
  priceId?: string;
  amount?: number;
  currency?: string;
  mode?: "subscription" | "payment";
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  trialDays?: number;
  organizationId?: string;
}

export interface CheckoutSessionResult {
  id: string;
  url: string | null;
  status: string;
}

export interface PaymentProvider {
  createPaymentIntent(amount: number, currency: string, customerId: string, organizationId?: string): Promise<{
    id: string;
    clientSecret: string;
    status: string;
  }>;
  capturePayment(paymentIntentId: string, organizationId?: string): Promise<{
    id: string;
    status: "succeeded" | "failed" | "pending";
    amount: number;
  }>;
  refundPayment(paymentId: string, amount?: number, reason?: string, organizationId?: string): Promise<{
    id: string;
    status: "succeeded" | "failed" | "pending";
  }>;
  createCheckoutSession?(params: CheckoutSessionParams): Promise<CheckoutSessionResult>;
}

export interface SubscriptionProvider {
  createSubscription(
    customerId: string,
    priceId: string,
    trialDays?: number,
    couponCode?: string,
    organizationId?: string
  ): Promise<{
    id: string;
    status: string;
    clientSecret?: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  }>;
  updateSubscription(
    subscriptionId: string,
    priceId: string,
    prorate?: boolean,
    organizationId?: string
  ): Promise<{
    id: string;
    status: string;
  }>;
  cancelSubscription(subscriptionId: string, immediately?: boolean, organizationId?: string): Promise<{
    id: string;
    status: string;
  }>;
  pauseSubscription(subscriptionId: string, organizationId?: string): Promise<{
    id: string;
    status: string;
  }>;
  resumeSubscription(subscriptionId: string, organizationId?: string): Promise<{
    id: string;
    status: string;
  }>;
  createCheckoutSession?(params: CheckoutSessionParams): Promise<CheckoutSessionResult>;
}

export interface BillingProvider {
  createCustomer(email: string, name?: string, metadata?: Record<string, string>, organizationId?: string): Promise<{
    id: string;
  }>;
  updateCustomer(customerId: string, email: string, name?: string, organizationId?: string): Promise<void>;
  deleteCustomer(customerId: string, organizationId?: string): Promise<void>;
  getPaymentMethods(customerId: string, organizationId?: string): Promise<Array<{
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    isDefault: boolean;
  }>>;
  setDefaultPaymentMethod(customerId: string, paymentMethodId: string, organizationId?: string): Promise<void>;
}

export interface InvoiceProvider {
  createInvoice(
    customerId: string,
    items: Array<{ description: string; amount: number; quantity: number }>,
    dueDate?: Date,
    organizationId?: string
  ): Promise<{
    id: string;
    number: string;
    status: string;
    pdfUrl?: string;
  }>;
  voidInvoice(invoiceId: string, organizationId?: string): Promise<void>;
  createCreditNote(invoiceId: string, amount: number, reason?: string, organizationId?: string): Promise<{
    id: string;
  }>;
}
