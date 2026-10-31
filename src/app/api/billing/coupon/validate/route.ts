import { NextRequest, NextResponse } from "next/server";
import { couponService } from "@/server/services/billing/coupon-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;

    const result = await couponService.validateCoupon(code);

    if (!result.valid) {
      return NextResponse.json({ valid: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, error: error.message || "Failed to validate coupon" },
      { status: 500 }
    );
  }
}

