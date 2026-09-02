import { 
  BillingProvider, 
  InvoiceProvider, 
  PaymentProvider, 
  SubscriptionProvider,
  CheckoutSessionParams,
  CheckoutSessionResult
} from "./types";
import { ProviderRegistry } from "./registry";
import { 
  requirePaymentProviderConfiguration, 
  PaymentProviderError, 
  PaymentConfigurationError,
  generateCorrelationId 
} from "../config";
import Stripe from "stripe";

const stripeClients = new Map<string, Stripe>();

async function getStripeClient(organizationId?: string): Promise<Stripe> {
  const config = await requirePaymentProviderConfiguration("stripe", organizationId);
  const cacheKey = `${organizationId || "global"}_${config.secretKey?.slice(-8)}`;

  if (stripeClients.has(cacheKey)) {
    return stripeClients.get(cacheKey)!;
  }

  const client = new Stripe(config.secretKey!, {
    apiVersion: "2023-10-16" as any,
  });

  stripeClients.set(cacheKey, client);
  return client;
}

export class StripeProvider implements PaymentProvider, SubscriptionProvider, BillingProvider, InvoiceProvider {

  // --- CheckoutSession ---
  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    const correlationId = generateCorrelationId();
    try {
      const stripe = await getStripeClient(params.organizationId);

      const sessionPayload: Stripe.Checkout.SessionCreateParams = {
        mode: params.mode || (params.priceId ? "subscription" : "payment"),
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          ...params.metadata,
          correlationId,
          organizationId: params.organizationId || "",
        },
      };

      if (params.customerId) {
        sessionPayload.customer = params.customerId;
      } else if (params.customerEmail) {
        sessionPayload.customer_email = params.customerEmail;
      }

      if (params.priceId) {
        sessionPayload.line_items = [
          {
            price: params.priceId,
            quantity: 1,
          },
        ];
        if (params.mode === "subscription" && params.trialDays && params.trialDays > 0) {
          sessionPayload.subscription_data = {
            trial_period_days: params.trialDays,
            metadata: { organizationId: params.organizationId || "" },
          };
        }
      } else if (params.amount) {
        sessionPayload.line_items = [
          {
            price_data: {
              currency: params.currency || "usd",
              product_data: {
                name: "Platform Booking / Payment",
              },
              unit_amount: Math.round(params.amount * 100),
            },
            quantity: 1,
          },
        ];
      }

      const session = await stripe.checkout.sessions.create(sessionPayload);

      return {
        id: session.id,
        url: session.url,
        status: session.status || "open",
      };
    } catch (err) {
      if (err instanceof PaymentConfigurationError) throw err;
      console.error(`[Stripe Checkout Error] [${correlationId}]:`, err);
      throw new PaymentProviderError("Failed to initialize Stripe checkout session.", {
        correlationId,
      });
    }
  }

  // --- BillingProvider ---
  async createCustomer(email: string, name?: string, metadata?: Record<string, string>, organizationId?: string): Promise<{ id: string }> {
    const correlationId = generateCorrelationId();
    try {
      const stripe = await getStripeClient(organizationId);
      const customer = await stripe.customers.create({
        email,
        name,
        metadata,
      });
      return { id: customer.id };
    } catch (err) {
      if (err instanceof PaymentConfigurationError) throw err;
      console.error(`[Stripe CreateCustomer Error] [${correlationId}]:`, err);
      throw new PaymentProviderError("Failed to create customer profile with payment provider.", { correlationId });
    }
  }

  async updateCustomer(customerId: string, email: string, name?: string, organizationId?: string): Promise<void> {
    const stripe = await getStripeClient(organizationId);
    await stripe.customers.update(customerId, { email, name });
  }

  async deleteCustomer(customerId: string, organizationId?: string): Promise<void> {
    const stripe = await getStripeClient(organizationId);
    await stripe.customers.del(customerId);
  }

  async getPaymentMethods(customerId: string, organizationId?: string) {
    const stripe = await getStripeClient(organizationId);
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    const customer = await stripe.customers.retrieve(customerId);
    const defaultPmId = (customer as Stripe.Customer).invoice_settings?.default_payment_method;

    return paymentMethods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand || "Card",
      last4: pm.card?.last4 || "0000",
      expMonth: pm.card?.exp_month || 12,
      expYear: pm.card?.exp_year || new Date().getFullYear() + 5,
      isDefault: pm.id === defaultPmId,
    }));
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string, organizationId?: string): Promise<void> {
    const stripe = await getStripeClient(organizationId);
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  // --- PaymentProvider ---
  async createPaymentIntent(amount: number, currency: string, customerId: string, organizationId?: string) {
    const correlationId = generateCorrelationId();
    try {
      const stripe = await getStripeClient(organizationId);
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency,
        customer: customerId,
      });

      return {
        id: intent.id,
        clientSecret: intent.client_secret || "",
        status: intent.status,
      };
    } catch (err) {
      if (err instanceof PaymentConfigurationError) throw err;
      throw new PaymentProviderError("Failed to create payment intent.", { correlationId });
    }
  }

  async capturePayment(paymentIntentId: string, organizationId?: string) {
    const stripe = await getStripeClient(organizationId);
    const intent = await stripe.paymentIntents.capture(paymentIntentId);
    return {
      id: intent.id,
      status: intent.status === "succeeded" ? ("succeeded" as const) : ("failed" as const),
      amount: intent.amount_received / 100,
    };
  }

  async refundPayment(paymentId: string, amount?: number, reason?: string, organizationId?: string) {
    const stripe = await getStripeClient(organizationId);
    const refund = await stripe.refunds.create({
      payment_intent: paymentId,
      amount: amount ? Math.round(amount * 100) : undefined,
      reason: reason as any,
    });

    return {
      id: refund.id,
      status: refund.status === "succeeded" ? ("succeeded" as const) : ("failed" as const),
    };
  }

  // --- SubscriptionProvider ---
  async createSubscription(
    customerId: string,
    priceId: string,
    trialDays = 14,
    couponCode?: string,
    organizationId?: string
  ) {
    const correlationId = generateCorrelationId();
    try {
      const stripe = await getStripeClient(organizationId);
      const subscription = (await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        trial_period_days: trialDays > 0 ? trialDays : undefined,
        coupon: couponCode,
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent"],
      } as any)) as any;

      const latestInvoice = subscription.latest_invoice;
      const paymentIntent = latestInvoice?.payment_intent;

      return {
        id: subscription.id,
        status: subscription.status,
        clientSecret: paymentIntent?.client_secret || undefined,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      };
    } catch (err) {
      if (err instanceof PaymentConfigurationError) throw err;
      console.error(`[Stripe CreateSubscription Error] [${correlationId}]:`, err);
      throw new PaymentProviderError("Failed to initiate subscription with payment provider.", { correlationId });
    }
  }

  async updateSubscription(subscriptionId: string, priceId: string, prorate = true, organizationId?: string) {
    const stripe = await getStripeClient(organizationId);
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior: prorate ? "create_prorations" : "none",
    });

    return {
      id: updated.id,
      status: updated.status,
    };
  }

  async cancelSubscription(subscriptionId: string, immediately = false, organizationId?: string) {
    const stripe = await getStripeClient(organizationId);
    let sub;
    if (immediately) {
      sub = await stripe.subscriptions.cancel(subscriptionId);
    } else {
      sub = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }

    return {
      id: sub.id,
      status: sub.status,
    };
  }

  async pauseSubscription(subscriptionId: string, organizationId?: string) {
    const stripe = await getStripeClient(organizationId);
    const sub = await stripe.subscriptions.update(subscriptionId, {
      pause_collection: {
        behavior: "void",
      },
    });

    return {
      id: sub.id,
      status: "paused",
    };
  }

  async resumeSubscription(subscriptionId: string, organizationId?: string) {
    const stripe = await getStripeClient(organizationId);
    const sub = await stripe.subscriptions.update(subscriptionId, {
      pause_collection: null,
    });

    return {
      id: sub.id,
      status: sub.status,
    };
  }

  // --- InvoiceProvider ---
  async createInvoice(
    customerId: string,
    items: Array<{ description: string; amount: number; quantity: number }>,
    dueDate?: Date,
    organizationId?: string
  ) {
    const stripe = await getStripeClient(organizationId);
    for (const item of items) {
      await stripe.invoiceItems.create({
        customer: customerId,
        amount: Math.round(item.amount * 100),
        currency: "usd",
        description: item.description,
      });
    }

    const invoice = await stripe.invoices.create({
      customer: customerId,
      due_date: dueDate ? Math.floor(dueDate.getTime() / 1000) : undefined,
      collection_method: dueDate ? "send_invoice" : "charge_automatically",
    });

    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);

    return {
      id: finalized.id,
      number: finalized.number || `INV-${finalized.id}`,
      status: finalized.status || "draft",
      pdfUrl: finalized.invoice_pdf || undefined,
    };
  }

  async voidInvoice(invoiceId: string, organizationId?: string): Promise<void> {
    const stripe = await getStripeClient(organizationId);
    await stripe.invoices.voidInvoice(invoiceId);
  }

  async createCreditNote(invoiceId: string, amount: number, reason?: string, organizationId?: string) {
    const stripe = await getStripeClient(organizationId);
    const creditNote = await stripe.creditNotes.create({
      invoice: invoiceId,
      amount: Math.round(amount * 100),
      reason: reason as any,
    });

    return {
      id: creditNote.id,
    };
  }
}

// Automatically register on load (safe lazy instance)
const stripe = new StripeProvider();
ProviderRegistry.registerPaymentProvider("stripe", stripe);
ProviderRegistry.registerSubscriptionProvider("stripe", stripe);
ProviderRegistry.registerBillingProvider("stripe", stripe);
ProviderRegistry.registerInvoiceProvider("stripe", stripe);
