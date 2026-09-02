import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { retrievalService, SearchMatch } from "./vector";
import {
  businessProfiles,
  services,
  faqItems,
} from "../db/schema";

export interface Citation {
  type: "profile" | "service" | "faq" | "document";
  id: string;
  name: string;
  content: string;
}

export interface RAGContext {
  contextText: string;
  citations: Citation[];
  matches?: SearchMatch[];
}

function isOverviewOrBookingQuery(query: string): boolean {
  const q = query.toLowerCase().trim();
  if (q.length === 0) return true;
  return (
    /^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening)|help|start|menu)\b/i.test(q) ||
    /(services?|offer|pricing|cost|prices?|appointment|book|schedule|consultation|hours|location|about|contact)/i.test(q)
  );
}

export const ragService = {
  async retrieveContext(organizationId: string, query: string): Promise<RAGContext> {
    const citations: Citation[] = [];
    const contextParts: string[] = [];

    const lowercaseQuery = query.toLowerCase();
    const isGeneral = isOverviewOrBookingQuery(query);

    let profile: any = null;
    let allServices: any[] = [];
    let allFaqs: any[] = [];

    // 1. Fetch Business Profile
    try {
      const profiles = await db
        .select()
        .from(businessProfiles)
        .where(eq(businessProfiles.organizationId, organizationId));
      profile = profiles[0];
    } catch (e: any) {
      console.warn("[RAGService] DB fallback for business profile:", e.message);
    }

    if (profile && profile.description && isGeneral) {
      citations.push({
        type: "profile",
        id: profile.id,
        name: "Business Profile",
        content: profile.description,
      });
      contextParts.push(`Business Profile:\n${profile.description}`);
    }

    // 2. Fetch Relevant Services
    try {
      allServices = await db
        .select()
        .from(services)
        .where(
          and(
            eq(services.organizationId, organizationId),
            eq(services.isActive, true),
            eq(services.isArchived, false)
          )
        );
    } catch (e: any) {
      console.warn("[RAGService] DB fallback for services:", e.message);
    }

    // Match services against query
    const matchedServices = allServices.filter(
      (s) =>
        lowercaseQuery.includes(s.name.toLowerCase()) ||
        (s.description && lowercaseQuery.includes(s.description.toLowerCase()))
    );

    // Only include fallback services if query is a general overview/booking inquiry
    const servicesToInclude =
      matchedServices.length > 0
        ? matchedServices
        : isGeneral
        ? allServices.slice(0, 3)
        : [];

    if (servicesToInclude.length > 0) {
      const servicesText = servicesToInclude
        .map((s) => `- ${s.name}: ${s.description ?? "No description"}. Duration: ${s.duration} min. Price: $${s.price}`)
        .join("\n");

      servicesToInclude.forEach((s) => {
        citations.push({
          type: "service",
          id: s.id,
          name: s.name,
          content: `${s.name} service costs $${s.price} and takes ${s.duration} minutes.`,
        });
      });

      contextParts.push(`Available Services:\n${servicesText}`);
    }

    // 3. Fetch Relevant FAQ Items
    try {
      allFaqs = await db
        .select()
        .from(faqItems)
        .where(and(eq(faqItems.organizationId, organizationId), eq(faqItems.isActive, true)));
    } catch (e: any) {
      console.warn("[RAGService] DB fallback for FAQs:", e.message);
    }

    const matchedFaqs = allFaqs.filter(
      (f) =>
        lowercaseQuery.includes(f.question.toLowerCase()) ||
        lowercaseQuery.includes(f.answer.toLowerCase())
    );

    // Only include fallback FAQs if query is a general overview inquiry
    const faqsToInclude =
      matchedFaqs.length > 0
        ? matchedFaqs
        : isGeneral
        ? allFaqs.slice(0, 3)
        : [];

    if (faqsToInclude.length > 0) {
      const faqsText = faqsToInclude.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");

      faqsToInclude.forEach((f) => {
        citations.push({
          type: "faq",
          id: f.id,
          name: `FAQ: ${f.question}`,
          content: f.answer,
        });
      });

      contextParts.push(`Frequently Asked Questions (FAQs):\n${faqsText}`);
    }

    // 4. Fetch Knowledge Chunks (Real vector search + relevance gating + deterministic lexical fallback)
    let retrievedMatches: SearchMatch[] = [];
    try {
      retrievedMatches = await retrievalService.retrieveRelevantChunks(organizationId, query, 5);

      if (retrievedMatches.length > 0) {
        const chunksText = retrievedMatches
          .map((m) => {
            const docName = m.metadata?.documentName || m.metadata?.title || "Reference Document";
            
            citations.push({
              type: "document",
              id: m.chunkId,
              name: docName,
              content: m.content,
            });

            return `Source [${docName}]:\n${m.content}`;
          })
          .join("\n\n");

        contextParts.push(`Additional Reference Knowledge:\n${chunksText}`);
      }
    } catch (err) {
      console.error("[RAGService] Error fetching knowledge chunks:", err);
    }

    return {
      contextText: contextParts.length > 0 ? contextParts.join("\n\n---\n\n") : "No relevant knowledge-base context found.",
      citations,
      matches: retrievedMatches,
    };
  },
};
