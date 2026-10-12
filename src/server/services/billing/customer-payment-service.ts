import { db } from "../../db";
import { 
  customerPayments, 
  appointments, 
  services, 
  organizations, 
  businessSettings, 
  appointmentEvents,
  businessActivityLog,
  appointmentNotes,
  businessPaymentSettings
} from "../../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { customerPaymentsRepository, NewCustomerPayment } from "../../repositories/customer-payments";
import { appointmentsRepository } from "../../repositories/appointments";
import crypto from "crypto";

export interface CreateCustomerCheckoutInput {
  organizationId: string;
  serviceId: string;
  appointmentId?: string | null;
  leadProfileId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  returnUrl?: string;
}

export interface CustomerCheckoutResult {
  paymentId: string;
  amount: string;
  currency: string;
  type: "deposit" | "full_payment";
  requiresPayment: boolean;
  status: "pending" | "captured" | "free";
  checkoutUrl?: string;
  paymentLink?: string;
  provider: "stripe" | "razorpay" | "manual";
}

export const customerPaymentService = {
  /**
   * Evaluates business pricing rules and creates an authoritative customer payment order/link.
   * Server validates amounts against the database service price & business booking settings.
   */
  async createCustomerPaymentSession(input: CreateCustomerCheckoutInput): Promise<CustomerCheckoutResult> {
    const { organizationId, serviceId, appointmentId, leadProfileId, customerName, customerEmail, customerPhone, returnUrl } = input;

    // 1. Fetch authoritative service details
    const [service] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.organizationId, organizationId)));

    if (!service) {
      throw new Error("Service not found or unauthorized");
    }

    // 2. Fetch authoritative business booking settings & deposit rules
    const [settings] = await db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.organizationId, organizationId))
      .limit(1);

    const bookingPrefs = (settings?.bookingPreferences as Record<string, any>) || {};
    const depositEnabled = Boolean(bookingPrefs.depositEnabled);
    const depositType = bookingPrefs.depositType || "fixed"; // 'fixed' | 'percentage'
    const depositAmountVal = Number(bookingPrefs.depositAmount || 0);

    const fullPriceNum = parseFloat(service.price) || 0;

    // Determine if payment is required
    let requiredAmountNum = 0;
    let paymentType: "deposit" | "full_payment" = "full_payment";

    if (fullPriceNum <= 0) {
      // Free service
      return {
        paymentId: "free",
        amount: "0.00",
        currency: "USD",
        type: "full_payment",
        requiresPayment: false,
        status: "free",
        provider: "manual",
      };
    }

    if (depositEnabled && depositAmountVal > 0) {
      paymentType = "deposit";
      if (depositType === "percentage") {
        requiredAmountNum = Number(((fullPriceNum * depositAmountVal) / 100).toFixed(2));
      } else {
        requiredAmountNum = Math.min(depositAmountVal, fullPriceNum);
      }
    } else {
      requiredAmountNum = fullPriceNum;
    }

    const amountStr = requiredAmountNum.toFixed(2);
    const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));
    const currency = "USD";

    // 3. Check business merchant provider connection (Stripe / Razorpay)
    const [paymentConfig] = await db
      .select()
      .from(businessPaymentSettings)
      .where(and(
        eq(businessPaymentSettings.organizationId, organizationId),
        eq(businessPaymentSettings.connectionStatus, "connected")
      ))
      .limit(1);

    const provider = paymentConfig?.providerId === "razorpay" ? "razorpay" : "stripe";
    const idempotencyKey = crypto.randomUUID();

    // 4. Create hosted checkout URL or secure tokenized payment link
    const paymentRecord = await customerPaymentsRepository.create({
      organizationId,
      appointmentId: appointmentId || null,
      leadProfileId: leadProfileId || null,
      serviceId,
      amount: amountStr,
      currency,
      type: paymentType,
      status: "pending",
      provider,
      customerEmail: customerEmail || null,
      customerPhone: customerPhone || null,
      idempotencyKey,
      metadata: {
        serviceName: service.name,
        customerName,
        returnUrl: returnUrl || null,
      },
    });

    const checkoutUrl = `/book/checkout?paymentId=${paymentRecord.id}&token=${idempotencyKey}`;

    // Update payment record with paymentLink
    await db
      .update(customerPayments)
      .set({ paymentLink: checkoutUrl })
      .where(eq(customerPayments.id, paymentRecord.id));

    return {
      paymentId: paymentRecord.id,
      amount: amountStr,
      currency,
      type: paymentType,
      requiresPayment: true,
      status: "pending",
      checkoutUrl,
      paymentLink: checkoutUrl,
      provider,
    };
  },

  /**
   * Authoritatively confirms and captures a customer payment.
   * Atomically confirms the associated appointment booking and logs events.
   */
  async confirmCustomerPayment(params: {
    paymentId: string;
    providerPaymentId?: string;
    providerOrderId?: string;
  }): Promise<{ success: boolean; appointmentId?: string | null; error?: string }> {
    const { paymentId, providerPaymentId, providerOrderId } = params;

    const payment = await customerPaymentsRepository.findById(paymentId);
    if (!payment) {
      return { success: false, error: "Payment record not found." };
    }

    if (payment.status === "captured") {
      return { success: true, appointmentId: payment.appointmentId };
    }

    // Atomic transaction: update payment status AND advance appointment status to confirmed
    try {
      const result = await db.transaction(async (tx) => {
        // 1. Mark customer payment captured
        const [updatedPayment] = await tx
          .update(customerPayments)
          .set({
            status: "captured",
            providerPaymentId: providerPaymentId || payment.providerPaymentId || `pay_mock_${Date.now()}`,
            providerOrderId: providerOrderId || payment.providerOrderId,
            updatedAt: new Date(),
          })
          .where(eq(customerPayments.id, paymentId))
          .returning();

        // 2. If appointment exists, transition from pending/pending_payment to confirmed
        if (payment.appointmentId) {
          const [apt] = await tx
            .select()
            .from(appointments)
            .where(eq(appointments.id, payment.appointmentId));

          if (apt) {
            await tx
              .update(appointments)
              .set({
                status: "confirmed",
                pricePaid: payment.amount,
                updatedAt: new Date(),
              })
              .where(eq(appointments.id, payment.appointmentId));

            // Record appointment event
            await tx.insert(appointmentEvents).values({
              organizationId: payment.organizationId,
              appointmentId: payment.appointmentId,
              eventType: "payment_captured",
              payload: {
                paymentId: payment.id,
                amount: payment.amount,
                currency: payment.currency,
                type: payment.type,
                capturedAt: new Date().toISOString(),
              },
            });
          }
        }

        return updatedPayment;
      });

      return { success: true, appointmentId: result.appointmentId };
    } catch (err: any) {
      console.error("[CustomerPaymentService] Payment confirmation reconciliation error:", err);

      // Exception Queue Recovery: Log escalation so business staff can reconcile without lost payment
      try {
        await db.insert(businessActivityLog).values({
          organizationId: payment.organizationId,
          task: `PAYMENT_RECONCILIATION_EXCEPTION: Payment ${paymentId} ($${payment.amount}) captured, but appointment confirmation encountered: ${err.message}`,
          category: "billing_exception",
          impact: "critical",
          metadata: {
            paymentId,
            amount: payment.amount,
            appointmentId: payment.appointmentId,
            error: err.message,
          },
        });

        if (payment.appointmentId) {
          await db.insert(appointmentNotes).values({
            organizationId: payment.organizationId,
            appointmentId: payment.appointmentId,
            noteText: `PAYMENT RECONCILIATION EXCEPTION: Payment captured but status transition failed: ${err.message}`,
            author: "system",
          });
        }
      } catch (escErr) {
        console.error("Failed to insert escalation exception:", escErr);
      }

      return { success: false, error: err.message };
    }
  },

  /**
   * Handles payment failure and updates audit records.
   */
  async handlePaymentFailure(paymentId: string, reason: string) {
    const payment = await customerPaymentsRepository.findById(paymentId);
    if (!payment) return;

    await customerPaymentsRepository.updateStatus(paymentId, "failed", {
      failureReason: reason,
    });

    if (payment.appointmentId) {
      await db.insert(appointmentEvents).values({
        organizationId: payment.organizationId,
        appointmentId: payment.appointmentId,
        eventType: "payment_failed",
        payload: {
          paymentId,
          reason,
          failedAt: new Date().toISOString(),
        },
      });
    }
  },
};
