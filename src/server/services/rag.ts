import { eq, and, like } from "drizzle-orm";
import { db } from "../db";
import { retrievalService } from "./vector";
import {
  businessProfiles,
  services,
  faqItems,
  knowledgeChunks,
  knowledgeDocuments,
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
}

export const ragService = {
  async retrieveContext(organizationId: string, query: string): Promise<RAGContext> {
    const citations: Citation[] = [];
    const contextParts: string[] = [];

    const lowercaseQuery = query.toLowerCase();

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

    if (profile && profile.description) {
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

    if (allServices.length === 0) {
      allServices = [
        {
          id: "svc_default",
          name: "General Consultation",
          description: "Standard service consultation and business appointment",
          duration: 30,
          price: "75.00",
          isActive: true,
          isArchived: false,
        },
      ];
    }

    // Filter services that match the query keyword or if query is general, include top 3
    const matchedServices = allServices.filter(
      (s) =>
        lowercaseQuery.includes(s.name.toLowerCase()) ||
        (s.description && lowercaseQuery.includes(s.description.toLowerCase()))
    );

    const servicesToInclude = matchedServices.length > 0 ? matchedServices : allServices.slice(0, 3);

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

    const faqsToInclude = matchedFaqs.length > 0 ? matchedFaqs : allFaqs.slice(0, 3);

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

    // 4. Fetch Knowledge Chunks (pgvector similarity search)
    try {
      const matches = await retrievalService.retrieveRelevantChunks(organizationId, query, 5);

      if (matches.length > 0) {
        const chunksText = matches
          .map((m) => {
            const docName = m.metadata?.documentName || "Reference Document";
            
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
      contextText: contextParts.join("\n\n---\n\n"),
      citations,
    };
  },
};
