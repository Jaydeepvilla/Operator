import { Suspense } from "react";
import { Metadata } from "next";
import { SearchClient } from "./search-client";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Global Search | Operator AI",
  description: "Cross-resource global search across contacts, bookings, documents, FAQs, and calls.",
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-72 w-full items-center justify-center">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
      }
    >
      <SearchClient />
    </Suspense>
  );
}
