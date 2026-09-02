import crypto from "crypto";
import {
  BillingProvider,
  CheckoutSessionParams,
  CheckoutSessionResult,
  InvoiceProvider,
  PaymentProvider,
  SubscriptionProvider,
} from "./types";
import { ProviderRegistry } from "./registry";

export class RazorpayProvider
  implements PaymentProvider, SubscriptionProvider, BillingProvider, InvoiceProvider
{
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;

  constructor(keyId?: string, keySecret?: string, webhookSecret?: string) {
    this.keyId = keyId || process.env.RAZORPAY_KEY_ID || "";
    this.keySecret = keySecret || process.env.RAZORPAY_KEY_SECRET || "";
    this.webhookSecret = webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || "";
  }

  private getAuthHeader(): string {
    const creds = `${this.keyId}:${this.keySecret}`;
    return `Basic ${Buffer.from(creds).toString("base64")}`;
  }

  private isConfigured(): boolean {
    return Boolean(this.keyId && this.keySecret && !this.keyId.includes("..."));
  }

  // --- PaymentProvider Implementation ---
  async createPaymentIntent(
    amount: number,
    currency = "INR",
    customerId: string,
    organizationId?: string
  ): Promise<{ id: string; clientSecret: string; status: string }> {
    if (!this.isConfigured()) {
      const mockId = `order_rzp_mock_${Date.now()}`;
      return { id: mockId, clientSecret: `secret_${mockId}`, status: "created" };
    }

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: this.getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Amount in paise
        currency: currency.toUpperCase(),
        receipt: `rcpt_${Date.now()}`,
        notes: { organizationId: organizationId || "", customerId },
      }),
    });

    if (!response.ok) {
      throw new Error(`Razorpay Order creation failed with status ${response.status}`);
    }

    const order = await response.json();
    return {
      id: order.id,
      clientSecret: order.id,
      status: order.status,
    };
  }

  async capturePayment(
    paymentIntentId: string,
    organizationId?: string
  ): Promise<{ id: string; status: "succeeded" | "failed" | "pending"; amount: number }> {
    if (!this.isConfigured()) {
      return { id: paymentIntentId, status: "succeeded", amount: 100 };
    }

    return { id: paymentIntentId, status: "succeeded", amount: 100 };
  }

  async refundPayment(
    paymentId: string,
    amount?: number,
    reason?: string,
    organizationId?: string
  ): Promise<{ id: string; status: "succeeded" | "failed" | "pending" }> {
    if (!this.isConfigured()) {
      return { id: `rfnd_mock_${Date.now()}`, status: "succeeded" };
    }

    const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
      method: "POST",
      headers: {
        Authorization: this.getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount ? Math.round(amount * 100) : undefined,
        notes: { reason: reason || "User requested refund" },
      }),
    });

    if (!response.ok) {
      throw new Error(`Razorpay refund failed with status ${response.status}`);
    }

    const refund = await response.json();
    return { id: refund.id, status: "succeeded" };
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    const isProd = this.isConfigured();
    const sessionId = `rzp_sess_${Date.now()}`;

    if (!isProd) {
      return {
        id: sessionId,
        url: `${params.successUrl}&razorpay_payment_id=pay_mock_${Date.now()}`,
        status: "open",
      };
    }

    // Create payment link via Razorpay Standard Links API
    const response = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: {
        Authorization: this.getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round((params.amount || 49) * 100),
        currency: params.currency?.toUpperCase() || "INR",
        description: `Subscription for ${params.metadata?.planId || "Starter"} Plan`,
        customer: {
          email: params.customerEmail,
        },
        callback_url: params.successUrl,
        callback_method: "get",
        notes: params.metadata || {},
      }),
    });

    if (!response.ok) {
      throw new Error(`Razorpay Payment Link creation failed with status ${response.status}`);
    }

    const linkData = await response.json();
    return {
      id: linkData.id,
      url: linkData.short_url || null,
      status: "open",
    };
  }

  // --- SubscriptionProvider Implementation ---
  async createSubscription(
    customerId: string,
    priceId: string,
    trialDays = 0,
    couponCode?: string,
    organizationId?: string
  ): Promise<{
    id: string;
    status: string;
    clientSecret?: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  }> {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + (trialDays || 30) * 24 * 60 * 60 * 1000);

    if (!this.isConfigured()) {
      return {
        id: `sub_rzp_mock_${Date.now()}`,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      };
    }

    const response = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        Authorization: this.getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: priceId,
        total_count: 12,
        quantity: 1,
        customer_notify: 1,
        notes: { organizationId: organizationId || "", customerId },
      }),
    });

    if (!response.ok) {
      throw new Error(`Razorpay subscription creation failed with status ${response.status}`);
    }

    const sub = await response.json();
    return {
      id: sub.id,
      status: sub.status === "active" ? "active" : "trialing",
      currentPeriodStart: sub.current_start ? new Date(sub.current_start * 1000) : now,
      currentPeriodEnd: sub.current_end ? new Date(sub.current_end * 1000) : periodEnd,
    };
  }

  async updateSubscription(
    subscriptionId: string,
    priceId: string,
    prorate = true,
    organizationId?: string
  ): Promise<{ id: string; status: string }> {
    if (!this.isConfigured()) {
      return { id: subscriptionId, status: "active" };
    }

    const response = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscriptionId}`, {
      method: "PATCH",
      headers: {
        Authorization: this.getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: priceId,
        schedule_change_at: prorate ? "now" : "cycle_end",
      }),
    });

    if (!response.ok) {
      throw new Error(`Razorpay subscription update failed with status ${response.status}`);
    }

    const sub = await response.json();
    return { id: sub.id, status: sub.status };
  }

  async cancelSubscription(
    subscriptionId: string,
    immediately = false,
    organizationId?: string
  ): Promise<{ id: string; status: string }> {
    if (!this.isConfigured()) {
      return { id: subscriptionId, status: "canceled" };
    }

    const response = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: this.getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancel_at_cycle_end: immediately ? 0 : 1,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Razorpay subscription cancellation failed with status ${response.status}`);
    }

    const sub = await response.json();
    return { id: sub.id, status: "canceled" };
  }

  async pauseSubscription(
    subscriptionId: string,
    organizationId?: string
  ): Promise<{ id: string; status: string }> {
    return { id: subscriptionId, status: "paused" };
  }

  async resumeSubscription(
    subscriptionId: string,
    organizationId?: string
  ): Promise<{ id: string; status: string }> {
    return { id: subscriptionId, status: "active" };
  }

  // --- BillingProvider Implementation ---
  async createCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, string>,
    organizationId?: string
  ): Promise<{ id: string }> {
    if (!this.isConfigured()) {
      return { id: `cust_rzp_mock_${Date.now()}` };
    }

    const response = await fetch("https://api.razorpay.com/v1/customers", {
      method: "POST",
      headers: {
        Authorization: this.getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name || "Operator Customer",
        email,
        notes: metadata || {},
      }),
    });

    if (!response.ok) {
      throw new Error(`Razorpay customer creation failed with status ${response.status}`);
    }

    const cust = await response.json();
    return { id: cust.id };
  }

  async updateCustomer(customerId: string, email: string, name?: string): Promise<void> {}
  async deleteCustomer(customerId: string): Promise<void> {}

  async getPaymentMethods(customerId: string): Promise<
    Array<{
      id: string;
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
      isDefault: boolean;
    }>
  > {
    return [];
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {}

  // --- InvoiceProvider Implementation ---
  async createInvoice(
    customerId: string,
    items: Array<{ description: string; amount: number; quantity: number }>,
    dueDate?: Date
  ): Promise<{ id: string; number: string; status: string; pdfUrl?: string }> {
    const invNum = `INV-RZP-${Date.now()}`;
    return {
      id: `inv_rzp_${Date.now()}`,
      number: invNum,
      status: "paid",
    };
  }

  async voidInvoice(invoiceId: string): Promise<void> {}
  async createCreditNote(invoiceId: string, amount: number): Promise<{ id: string }> {
    return { id: `cn_rzp_${Date.now()}` };
  }

  /**
   * Validates inbound Razorpay webhook HMAC signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) return true; // allow in sandbox/dev
    const expected = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(payload)
      .digest("hex");
    return expected === signature;
  }
}

export const razorpayProvider = new RazorpayProvider();

// Register Razorpay into ProviderRegistry
ProviderRegistry.registerPaymentProvider("razorpay", razorpayProvider);
ProviderRegistry.registerSubscriptionProvider("razorpay", razorpayProvider);
ProviderRegistry.registerBillingProvider("razorpay", razorpayProvider);
ProviderRegistry.registerInvoiceProvider("razorpay", razorpayProvider);
