import { db } from "../../db";
import { knowledgeDocuments } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { chunkingService } from "../chunking";
import { llmRegistry } from "../llm";

export interface IngestionAnalysisReport {
  title: string;
  summary: string;
  suggestedCategoryId: string | null;
  categoryConfidence: number;
  tags: string[];
  language: string;
  priority: "high" | "medium" | "low";
  visibility: "public" | "internal" | "ai_only";
  aiWeight: "normal" | "high";
  
  // Quality & Retrieval
  aiRetrievalQuality: "Excellent" | "Good" | "Poor";
  qualityChecks: string[];
  
  // Chunk & Text Stats
  stats: {
    words: number;
    characters: number;
    tokens: number;
    chunks: number;
  };
  
  // Duplicates
  duplicateWarning?: {
    isPossibleDuplicate: boolean;
    similarityScore: number;
    matchingDocName: string;
  };
}

// 1. Chunk Estimator Service
export const ChunkEstimatorService = {
  estimate(text: string) {
    const cleanedText = text.trim();
    const words = cleanedText ? cleanedText.split(/\s+/).filter(Boolean).length : 0;
    const characters = cleanedText.length;
    const tokens = Math.ceil(characters / 4); // standard approximation
    const chunks = chunkingService.splitText(cleanedText).length;

    return { words, characters, tokens, chunks };
  }
};

// 2. Language Detection Service
export const LanguageDetectionService = {
  detect(text: string): string {
    const spanishWords = /\b(hola|servicio|precio|cancelar|cita|peluqueria|estilista|bono|promocion|gracias|horario|reservar)\b/i;
    if (spanishWords.test(text)) {
      return "es";
    }
    return "en";
  }
};

// 3. Duplicate Detection Service
export const DuplicateDetectionService = {
  async detect(organizationId: string, title: string, content: string) {
    try {
      const docs = await db
        .select({ id: knowledgeDocuments.id, name: knowledgeDocuments.name })
        .from(knowledgeDocuments)
        .where(
          and(
            eq(knowledgeDocuments.organizationId, organizationId),
            eq(knowledgeDocuments.isArchived, false)
          )
        );

      if (docs.length === 0) return undefined;

      const cleanTitle = title.toLowerCase().trim();
      
      // Calculate basic string similarity (Jaccard on words) for the title
      let maxScore = 0;
      let matchingDocName = "";

      const titleWords = new Set(cleanTitle.split(/\s+/).filter(w => w.length > 2));

      for (const doc of docs) {
        const docTitleWords = new Set(doc.name.toLowerCase().split(/\s+/).filter(w => w.length > 2));
        if (titleWords.size === 0 || docTitleWords.size === 0) continue;

        const intersection = new Set([...titleWords].filter(x => docTitleWords.has(x)));
        const union = new Set([...titleWords, ...docTitleWords]);
        const score = intersection.size / union.size;

        if (score > maxScore) {
          maxScore = score;
          matchingDocName = doc.name;
        }
      }

      if (maxScore > 0.6) {
        return {
          isPossibleDuplicate: true,
          similarityScore: Math.round(maxScore * 100) / 100,
          matchingDocName,
        };
      }
    } catch (e) {
      console.error("[DuplicateDetectionService] failed", e);
    }
    return undefined;
  }
};

// 4. Quality Analysis Service
export const QualityAnalysisService = {
  analyze(text: string) {
    const checks: string[] = [];
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    
    if (words < 30) {
      checks.push("Document is very short (under 30 words), which might limit its semantic search relevance.");
    }
    
    if (!text.includes("#") && !text.includes("##") && !text.includes("**")) {
      checks.push("Missing headings or structured sections. RAG works best when documents use clear formatting.");
    }

    // Check formatting (long blocks without breaks)
    const longParagraphs = text.split("\n\n").filter(p => p.trim().split(/\s+/).length > 150);
    if (longParagraphs.length > 0) {
      checks.push("Contains dense text blocks (over 150 words without paragraph breaks). Recommend splitting into shorter paragraphs.");
    }

    // Determine Retrieval Quality
    let quality: "Excellent" | "Good" | "Poor" = "Excellent";
    if (checks.length >= 2 || words < 20) {
      quality = "Poor";
    } else if (checks.length === 1) {
      quality = "Good";
    }

    return {
      aiRetrievalQuality: quality,
      qualityChecks: checks,
    };
  }
};

// Heuristic Fallback Analysis (If LLM fails)
export const HeuristicFallbackService = {
  analyze(content: string, filename: string, categories: { id: string; name: string }[]): IngestionAnalysisReport {
    const stats = ChunkEstimatorService.estimate(content);
    const language = LanguageDetectionService.detect(content);
    const quality = QualityAnalysisService.analyze(content);
    
    // Fallback title from filename or content first line
    let title = filename ? filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") : "";
    if (!title) {
      const firstLine = content.split("\n")[0]?.trim();
      title = firstLine && firstLine.length < 80 ? firstLine : "Untitled Knowledge Document";
    }

    // Predict category based on tag matches
    let suggestedCategoryId: string | null = null;
    let categoryConfidence = 0.0;
    
    for (const cat of categories) {
      const catKeywords = cat.name.toLowerCase().split(/\s+/);
      const contentLower = content.toLowerCase();
      let matchCount = 0;
      for (const kw of catKeywords) {
        if (contentLower.includes(kw)) matchCount++;
      }
      if (matchCount > 0) {
        suggestedCategoryId = cat.id;
        categoryConfidence = 0.5; // low confidence fallback
        break;
      }
    }

    // Simple priority heuristic
    let priority: "high" | "medium" | "low" = "medium";
    const contentLower = content.toLowerCase();
    if (contentLower.includes("cancellation") || contentLower.includes("policy") || contentLower.includes("emergency")) {
      priority = "high";
    } else if (contentLower.includes("notice") || contentLower.includes("announcement")) {
      priority = "low";
    }

    // Simple visibility suggestion
    let visibility: "public" | "internal" | "ai_only" = "public";
    if (contentLower.includes("staff only") || contentLower.includes("internal") || contentLower.includes("confidential")) {
      visibility = "internal";
    } else if (contentLower.includes("instructions for ai") || contentLower.includes("prompt")) {
      visibility = "ai_only";
    }

    // Extract tags from common words
    const defaultTags = ["manual", "knowledge"];
    if (contentLower.includes("price") || contentLower.includes("fee")) defaultTags.push("pricing");
    if (contentLower.includes("cancel") || contentLower.includes("booking")) defaultTags.push("booking");
    if (contentLower.includes("stylist") || contentLower.includes("team")) defaultTags.push("staff");

    return {
      title: title.slice(0, 80),
      summary: content.slice(0, 150) + "...",
      suggestedCategoryId,
      categoryConfidence,
      tags: defaultTags,
      language,
      priority,
      visibility,
      aiWeight: "normal",
      aiRetrievalQuality: quality.aiRetrievalQuality,
      qualityChecks: quality.qualityChecks,
      stats,
    };
  }
};

// 5. Metadata Extraction Service & AI Orchestrator
export const KnowledgeAnalysisService = {
  async analyze(
    organizationId: string,
    content: string,
    filename: string,
    categories: { id: string; name: string }[]
  ): Promise<IngestionAnalysisReport> {
    const fallback = HeuristicFallbackService.analyze(content, filename, categories);
    const duplicate = await DuplicateDetectionService.detect(organizationId, fallback.title, content);
    
    try {
      const llm = llmRegistry.getProvider();


      const categoriesListText = categories.map(c => `ID: "${c.id}", Name: "${c.name}"`).join("\n");

      const prompt = `Analyze this raw document content intended for an Operator AI knowledge base.
You must extract metadata and predict retrieval properties. Return a JSON object matching this schema:
{
  "title": "Concise, production-quality title under 80 characters",
  "summary": "2-3 sentence summary of the purpose of the document",
  "suggestedCategoryId": "The ID of the best matching category from the list, or null if confidence is low",
  "categoryConfidence": 0.0 to 1.0 confidence score of category match,
  "tags": ["3 to 8 relevant search tag strings"],
  "language": "en" or "es" (auto-detected),
  "priority": "high" or "medium" or "low" (high for critical policies/cancellations, low for staff/internal bulletins),
  "visibility": "public" or "internal" or "ai_only" (ai_only if contains prompt rules or RAG optimization guidelines),
  "aiWeight": "normal" or "high" (high if this is a core revenue/cancellation document)
}

List of categories:
${categoriesListText}

Document Content:
"""
${content}
"""`;

      const response = await llm.generateCompletion([
        { role: "system", content: "You are an enterprise AI knowledge architect. You analyze content and return structured JSON metadata." },
        { role: "user", content: prompt }
      ], { jsonMode: true });

      const result = JSON.parse(response.content);
      
      const stats = ChunkEstimatorService.estimate(content);
      const quality = QualityAnalysisService.analyze(content);

      return {
        title: (result.title || fallback.title).slice(0, 80),
        summary: result.summary || fallback.summary,
        suggestedCategoryId: result.suggestedCategoryId || null,
        categoryConfidence: result.categoryConfidence ?? 0.0,
        tags: Array.isArray(result.tags) ? result.tags.slice(0, 8) : fallback.tags,
        language: result.language || fallback.language,
        priority: ["high", "medium", "low"].includes(result.priority) ? result.priority : fallback.priority,
        visibility: ["public", "internal", "ai_only"].includes(result.visibility) ? result.visibility : fallback.visibility,
        aiWeight: result.aiWeight === "high" ? "high" : "normal",
        aiRetrievalQuality: quality.aiRetrievalQuality,
        qualityChecks: quality.qualityChecks,
        stats,
        duplicateWarning: duplicate,
      };

    } catch (error) {
      console.error("[KnowledgeAnalysisService] failed, using heuristic fallback:", error);
      return { ...fallback, duplicateWarning: duplicate };
    }
  }
};
