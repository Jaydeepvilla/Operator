import { db } from "@/server/db";
import { coupons, discounts } from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";

export interface CouponValidationResult {
  valid: boolean;
  code?: string;
  type?: string;
  value?: number; // e.g. 30 for 30%
  discountPercent?: number;
  durationBillingCycles?: number;
  remainingRedemptions?: number;
  message?: string;
  error?: string;
}

export class CouponService {
  /**
   * Ensures the launch promotion coupon LAUNCH30 exists in the database.
   */
  async ensureLaunchCoupon(): Promise<void> {
    const existing = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, "LAUNCH30"))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(coupons).values({
        code: "LAUNCH30",
        type: "percent",
        value: "30",
        usageLimit: 5,
        redemptionsCount: 0,
        isActive: true,
      });
    }
  }

  /**
   * Validates a coupon code server-side against database limits.
   */
  async validateCoupon(inputCode?: string | null): Promise<CouponValidationResult> {
    if (!inputCode) {
      return { valid: false, error: "Coupon code is required" };
    }

    const cleanCode = inputCode.toUpperCase().trim();
    await this.ensureLaunchCoupon();

    const [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, cleanCode))
      .limit(1);

    if (!coupon) {
      return { valid: false, error: "Invalid coupon code" };
    }

    if (!coupon.isActive) {
      return { valid: false, error: "This coupon is no longer active" };
    }

    if (coupon.expirationDate && new Date() > new Date(coupon.expirationDate)) {
      return { valid: false, error: "This coupon has expired" };
    }

    const usageLimit = coupon.usageLimit ?? Infinity;
    const currentRedemptions = coupon.redemptionsCount ?? 0;
    const remaining = Math.max(0, usageLimit - currentRedemptions);

    if (currentRedemptions >= usageLimit) {
      return {
        valid: false,
        error: "This offer has reached its maximum redemptions (5/5 redeemed)",
      };
    }

    const discountPercent = parseFloat(coupon.value) || 30;

    return {
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: discountPercent,
      discountPercent,
      durationBillingCycles: 3, // P8: 30% off first 3 cycles
      remainingRedemptions: remaining,
      message: `30% off your first 3 billing cycles applied (${remaining} spots remaining)`,
    };
  }

  /**
   * Applies and increments redemption count atomically.
   */
  async redeemCoupon(params: {
    code: string;
    billingAccountId: string;
    subscriptionId?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const cleanCode = params.code.toUpperCase().trim();
    const validation = await this.validateCoupon(cleanCode);

    if (!validation.valid || !validation.code) {
      return { success: false, error: validation.error || "Invalid coupon" };
    }

    // Atomically increment redemptions only if under usage limit
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, cleanCode))
      .limit(1);

    if (!coupon || (coupon.usageLimit && coupon.redemptionsCount >= coupon.usageLimit)) {
      return { success: false, error: "Coupon redemption limit reached" };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(coupons)
        .set({
          redemptionsCount: sql`${coupons.redemptionsCount} + 1`,
        })
        .where(
          and(
            eq(coupons.id, coupon.id),
            sql`${coupons.redemptionsCount} < ${coupon.usageLimit || 9999}`
          )
        );

      await tx.insert(discounts).values({
        billingAccountId: params.billingAccountId,
        subscriptionId: params.subscriptionId || null,
        couponId: coupon.id,
      });
    });

    return { success: true };
  }

  /**
   * Helper to calculate discounted integer minor units.
   */
  calculateDiscountedAmount(amountMinor: number, discountPercent: number): number {
    if (!discountPercent || discountPercent <= 0) return amountMinor;
    const factor = (100 - discountPercent) / 100;
    return Math.round(amountMinor * factor);
  }
}

export const couponService = new CouponService();

