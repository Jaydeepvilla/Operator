import crypto from "crypto";
import Razorpay from "razorpay";

export function getRazorpayClient() {
  const keyId =
    process.env.RAZORPAY_KEY_ID || "rzp_test_TsrjKrqgpr3af8";
  const keySecret =
    process.env.RAZORPAY_KEY_SECRET || "6vwhav2pRm3Zs0qkkjrOuM5a";

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured in environment variables.");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * Validates the Razorpay payment signature using HMAC-SHA256
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 */
export function verifyRazorpaySignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const keySecret =
    process.env.RAZORPAY_KEY_SECRET || "6vwhav2pRm3Zs0qkkjrOuM5a";
  if (!keySecret) {
    throw new Error("RAZORPAY_KEY_SECRET is missing.");
  }

  const generatedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  try {
    const genBuf = Buffer.from(generatedSignature, "hex");
    const sigBuf = Buffer.from(signature, "hex");
    if (genBuf.length !== sigBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(genBuf, sigBuf);
  } catch {
    return false;
  }
}
