import { notFound } from "next/navigation";
import { getCustomerPaymentDetailsAction } from "@/server/actions/public-booking";
import { CustomerCheckoutClient } from "./checkout-client";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Secure Customer Payment | Operator",
  description: "Complete your appointment deposit or service payment securely.",
};

interface CheckoutPageProps {
  searchParams: Promise<{ paymentId?: string; token?: string }>;
}

export default async function CustomerCheckoutPage({ searchParams }: CheckoutPageProps) {
  const { paymentId, token } = await searchParams;

  if (!paymentId) {
    notFound();
  }

  const result = await getCustomerPaymentDetailsAction(paymentId);
  if (!result.success || !result.payment) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      <main className="flex-1 max-w-xl mx-auto w-full px-4 sm:px-6 py-12">
        <CustomerCheckoutClient payment={result.payment} token={token || ""} />
      </main>

      <footer className="py-6 border-t border-border/40 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-1.5">
          <span>Encrypted 256-bit SSL Checkout</span>
          <span>&bull;</span>
          <span>Powered by Operator</span>
        </div>
      </footer>
    </div>
  );
}
