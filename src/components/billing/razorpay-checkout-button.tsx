"use client";

import React, { useState } from "react";
import { Button } from "@/components/shared/button";
import { Loader2, ShieldCheck } from "lucide-react";
import { PaymentSuccessModal, InvoiceData } from "@/components/billing/payment-success-modal";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayCheckoutButtonProps {
  amountInPaise: number; // e.g. 4900 for ₹49.00 (min 100 paise)
  currency?: string;
  planName?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  onSuccess?: (paymentData: {
    payment_id: string;
    order_id: string;
    signature: string;
  }) => void;
  onError?: (error: any) => void;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  children?: React.ReactNode;
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      // Poll fallback in case load event already fired
      let retries = 0;
      const interval = setInterval(() => {
        if (window.Razorpay) {
          clearInterval(interval);
          resolve(true);
        } else if (++retries > 20) {
          clearInterval(interval);
          resolve(false);
        }
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export function RazorpayCheckoutButton({
  amountInPaise,
  currency = "INR",
  planName = "Operator Subscription",
  description = "Secure Checkout via Razorpay",
  prefill = {},
  notes = {},
  onSuccess,
  onError,
  className,
  variant = "default",
  size = "default",
  children,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      setStatusMessage(null);
      setStatusType(null);

      // 1. Ensure Razorpay Checkout SDK is loaded
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error("Unable to load Razorpay checkout SDK. Please check your network connection.");
      }

      // 2. Call backend endpoint to create order
      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency,
          receipt: `rcpt_${Date.now()}`,
          notes: {
            planName,
            ...notes,
          },
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.order_id) {
        throw new Error(orderData.error || "Failed to create order on server.");
      }

      const keyId =
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_TVtKeJYufz4TgQ";

      // 3. Configure Razorpay Standard Checkout modal options
      const options = {
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency || currency,
        name: "Operator AI",
        description: description || `Payment for ${planName}`,
        order_id: orderData.order_id,
        prefill: {
          name: prefill.name || "Customer",
          email: prefill.email || "customer@example.com",
          contact: prefill.contact || "",
        },
        theme: {
          color: "#0A0E17",
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setStatusType("error");
            setStatusMessage("Payment cancelled by user.");
            if (onError) onError({ code: "MODAL_DISMISSED", message: "User cancelled checkout." });
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            setLoading(true);
            setStatusMessage("Verifying payment security signature...");

            // 4. Send signature to backend for HMAC-SHA256 verification
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amountInPaise,
                planName,
                description,
                currency,
                prefill,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || "Payment signature verification failed.");
            }

            setStatusType("success");
            setStatusMessage(`Payment Verified! Reference: ${response.razorpay_payment_id}`);

            if (verifyData.invoice) {
              setInvoiceData(verifyData.invoice);
              setShowSuccessModal(true);
            }

            if (onSuccess) {
              onSuccess({
                payment_id: response.razorpay_payment_id,
                order_id: response.razorpay_order_id,
                signature: response.razorpay_signature,
              });
            }
          } catch (err: any) {
            console.error("Verification error:", err);
            setStatusType("error");
            setStatusMessage(err.message || "Payment verification failed.");
            if (onError) onError(err);
          } finally {
            setLoading(false);
          }
        },
      };

      const razorpayInstance = new window.Razorpay(options);

      razorpayInstance.on("payment.failed", (response: any) => {
        setLoading(false);
        setStatusType("error");
        const errMsg =
          response.error?.description ||
          response.error?.reason ||
          "Payment processing failed.";
        setStatusMessage(errMsg);
        if (onError) onError(response.error);
      });

      razorpayInstance.open();
    } catch (err: any) {
      console.error("Checkout initiation error:", err);
      setStatusType("error");
      setStatusMessage(err.message || "Failed to initialize Razorpay checkout.");
      if (onError) onError(err);
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant={variant}
          size={size}
          className={className}
          disabled={loading}
          onClick={handleCheckout}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            children || (
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Pay ₹{(amountInPaise / 100).toFixed(2)} with Razorpay
              </span>
            )
          )}
        </Button>

        {statusMessage && (
          <p
            className={`text-xs ${
              statusType === "success"
                ? "text-emerald-600 dark:text-emerald-400 font-medium"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {statusMessage}
          </p>
        )}
      </div>

      <PaymentSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        invoice={invoiceData}
      />
    </>
  );
}
