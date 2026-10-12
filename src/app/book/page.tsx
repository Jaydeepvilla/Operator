import Link from "next/link";
import { Button } from "@/components/shared/button";
import { Calendar, Search, ArrowRight } from "lucide-react";

export default function BookIndexPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-5">
        <div className="h-14 w-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto border border-primary/20">
          <Calendar className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Operator Online Booking
        </h1>
        <p className="text-sm text-muted-foreground">
          To book an appointment, please use the specific booking link provided by your business (e.g. <code>/book/your-business-slug</code>).
        </p>
        <div className="pt-2">
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <span>Return to Operator Home</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
