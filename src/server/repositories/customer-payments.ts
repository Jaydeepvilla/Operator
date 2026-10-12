import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { customerPayments, appointments } from "../db/schema";

export interface NewCustomerPayment {
  organizationId: string;
  appointmentId?: string | null;
  leadProfileId?: string | null;
  serviceId?: string | null;
  amount: string;
  currency?: string;
  type?: "deposit" | "full_payment" | "balance" | "cancellation_fee";
  status?: "pending" | "authorized" | "captured" | "failed" | "refunded";
  provider?: "stripe" | "razorpay" | "manual";
  providerPaymentId?: string | null;
  providerOrderId?: string | null;
  paymentLink?: string | null;
  idempotencyKey?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  metadata?: Record<string, any>;
  failureReason?: string | null;
}

export const customerPaymentsRepository = {
  async create(data: NewCustomerPayment) {
    const [record] = await db
      .insert(customerPayments)
      .values({
        organizationId: data.organizationId,
        appointmentId: data.appointmentId || null,
        leadProfileId: data.leadProfileId || null,
        serviceId: data.serviceId || null,
        amount: data.amount,
        currency: data.currency || "USD",
        type: data.type || "deposit",
        status: data.status || "pending",
        provider: data.provider || "stripe",
        providerPaymentId: data.providerPaymentId || null,
        providerOrderId: data.providerOrderId || null,
        paymentLink: data.paymentLink || null,
        idempotencyKey: data.idempotencyKey || null,
        customerEmail: data.customerEmail || null,
        customerPhone: data.customerPhone || null,
        metadata: data.metadata || {},
        failureReason: data.failureReason || null,
      })
      .returning();
    return record;
  },

  async findById(id: string) {
    const [record] = await db
      .select()
      .from(customerPayments)
      .where(eq(customerPayments.id, id));
    return record || null;
  },

  async findByAppointmentId(appointmentId: string) {
    return db
      .select()
      .from(customerPayments)
      .where(eq(customerPayments.appointmentId, appointmentId))
      .orderBy(desc(customerPayments.createdAt));
  },

  async findByProviderOrderId(providerOrderId: string) {
    const [record] = await db
      .select()
      .from(customerPayments)
      .where(eq(customerPayments.providerOrderId, providerOrderId));
    return record || null;
  },

  async findByProviderPaymentId(providerPaymentId: string) {
    const [record] = await db
      .select()
      .from(customerPayments)
      .where(eq(customerPayments.providerPaymentId, providerPaymentId));
    return record || null;
  },

  async updateStatus(
    id: string,
    status: "pending" | "authorized" | "captured" | "failed" | "refunded",
    updates?: {
      providerPaymentId?: string;
      failureReason?: string;
      metadata?: Record<string, any>;
    }
  ) {
    const [updated] = await db
      .update(customerPayments)
      .set({
        status,
        providerPaymentId: updates?.providerPaymentId,
        failureReason: updates?.failureReason,
        metadata: updates?.metadata,
        updatedAt: new Date(),
      })
      .where(eq(customerPayments.id, id))
      .returning();
    return updated;
  },

  async listByOrganization(organizationId: string, limit = 50) {
    return db
      .select()
      .from(customerPayments)
      .where(eq(customerPayments.organizationId, organizationId))
      .orderBy(desc(customerPayments.createdAt))
      .limit(limit);
  },
};
