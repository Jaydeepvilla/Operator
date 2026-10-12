"use server";

import { auth } from "@/lib/auth/server";
import { checkUserOrganization } from "./onboarding";
import { exceptionsRepository } from "../repositories/exceptions";
import { sharedBusinessActions } from "../services/actions/shared-business-actions";
import { appointmentsRepository } from "../repositories/appointments";
import { revalidatePath } from "next/cache";

export async function getOperationalExceptionsAction(filters?: { status?: string; category?: string }) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const { hasOrg, org } = await checkUserOrganization();
    if (!hasOrg || !org) return { success: false, error: "No organization found" };

    const list = await exceptionsRepository.list(org.id, filters?.status, filters?.category);
    return { success: true, data: list };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load operational exceptions" };
  }
}

export async function resolveOperationalExceptionAction(exceptionId: string, notes: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const { hasOrg, org } = await checkUserOrganization();
    if (!hasOrg || !org) return { success: false, error: "No organization found" };

    const existing = await exceptionsRepository.findById(exceptionId);
    if (!existing || existing.organizationId !== org.id) {
      return { success: false, error: "Exception record not found or access denied" };
    }

    const updated = await exceptionsRepository.updateStatus(exceptionId, "resolved", notes, userId);
    revalidatePath("/escalations");
    revalidatePath("/dashboard");
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to resolve exception" };
  }
}

export async function retryOperationalExceptionAction(exceptionId: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const { hasOrg, org } = await checkUserOrganization();
    if (!hasOrg || !org) return { success: false, error: "No organization found" };

    const existing = await exceptionsRepository.findById(exceptionId);
    if (!existing || existing.organizationId !== org.id) {
      return { success: false, error: "Exception record not found" };
    }

    // Determine safe retry action based on category
    let retryResult: { success: boolean; error?: string } = { success: false, error: "No automated retry available for this category" };

    if (existing.category === "booking_failure" && existing.relatedRecordId) {
      // Re-verify if appointment is in pending state or re-check
      const apt = await appointmentsRepository.findById(existing.relatedRecordId);
      if (apt && apt.appointment.status === "pending_payment") {
        retryResult = { success: true };
      } else {
        retryResult = { success: false, error: "Appointment slot cannot be auto-recovered without customer input" };
      }
    } else if (existing.category === "payment_reconciliation" && existing.relatedRecordId) {
      // Attempt idempotent payment confirmation
      const res = await sharedBusinessActions.confirmPaidBooking({ paymentId: existing.relatedRecordId });
      retryResult = { success: res.success, error: res.error || undefined };
    } else {
      retryResult = { success: true };
    }

    const updated = await exceptionsRepository.recordRetry(exceptionId, retryResult);
    revalidatePath("/escalations");
    revalidatePath("/dashboard");
    return { success: true, data: updated, retryResult };
  } catch (err: any) {
    return { success: false, error: err?.message || "Retry failed" };
  }
}
