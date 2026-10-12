import { notFound } from "next/navigation";
import { getPublicBusinessDetailsAction } from "@/server/actions/public-booking";
import { HostedBookingClient } from "./booking-client";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

interface BookingPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BookingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicBusinessDetailsAction(slug);
  if (!data.success || !data.business) {
    return {
      title: "Book an Appointment",
      description: "Schedule your appointment online.",
    };
  }

  return {
    title: `Book an Appointment | ${data.business.name}`,
    description: `Book your appointment with ${data.business.name} online. Choose your service, preferred time, and receive instant confirmation.`,
  };
}

export default async function PublicBookingPage({ params }: BookingPageProps) {
  const { slug } = await params;
  const result = await getPublicBusinessDetailsAction(slug);

  if (!result.success || !result.business) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* Subtle modern backdrop */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute top-[-10%] right-[-5%] w-[45vw] h-[45vh] rounded-full blur-[130px] opacity-30"
          style={{ background: "hsl(var(--primary) / 0.15)" }}
        />
        <div
          className="absolute bottom-[-10%] left-[-5%] w-[45vw] h-[45vh] rounded-full blur-[130px] opacity-20"
          style={{ background: "hsl(var(--accent) / 0.12)" }}
        />
      </div>

      <main className="relative z-10 flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        <HostedBookingClient
          business={result.business}
          services={result.services || []}
          staff={result.staff || []}
        />
      </main>

      <footer className="relative z-10 py-6 border-t border-border/40 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-1.5">
          <span>Powered by</span>
          <span className="font-semibold text-foreground tracking-tight">Operator</span>
          <span>— Autonomous Business Operations</span>
        </div>
      </footer>
    </div>
  );
}
