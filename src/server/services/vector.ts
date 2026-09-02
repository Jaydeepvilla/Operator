import { db } from "../db";
import { knowledgeChunks, knowledgeDocuments } from "../db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const DEFAULT_EMBEDDING_DIMENSIONS = 1536;
export const MIN_VECTOR_SIMILARITY_THRESHOLD = 0.50;
export const MIN_LEXICAL_MATCH_THRESHOLD = 0.25;

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
  model?: string;
  dimension?: number;
}

export interface SearchMatch {
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
  retrievalMode: "vector" | "lexical";
}

export type RetrievalStatus =
  | "RETRIEVAL_SUCCESS"
  | "RETRIEVAL_NO_RESULTS"
  | "EMBEDDING_UNAVAILABLE"
  | "LEXICAL_FALLBACK"
  | "RETRIEVAL_ERROR";

export interface RetrievalResult {
  status: RetrievalStatus;
  matches: SearchMatch[];
  query: string;
  organizationId: string;
}

/**
 * Validates whether a vector is synthetic, zero-filled, or has near-zero magnitude.
 * Synthetic/zero vectors must NEVER be used for production vector search.
 */
export function isSyntheticOrZeroVector(vec: number[] | null | undefined): boolean {
  if (!vec || !Array.isArray(vec) || vec.length === 0) return true;
  
  // Check if every element is zero
  let allZero = true;
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    const val = vec[i];
    if (val !== 0) {
      allZero = false;
    }
    sumSq += val * val;
  }
  
  if (allZero) return true;
  if (isNaN(sumSq) || sumSq < 1e-6) return true;
  
  return false;
}

// 1. Embedding Service Interface
export interface EmbeddingService {
  generateEmbedding(text: string): Promise<EmbeddingResult>;
  generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]>;
}

// 2. Vector Store Interface
export interface VectorStore {
  saveEmbedding(organizationId: string, chunkId: string, embedding: number[], metadata?: Record<string, any>): Promise<void>;
  deleteEmbeddings(chunkIds: string[]): Promise<void>;
  invalidateSyntheticEmbeddings(organizationId?: string): Promise<number>;
}

// 3. Retrieval Interface & Similarity Search Interface
export interface RetrievalService {
  retrieveRelevantChunks(
    organizationId: string,
    query: string,
    limit?: number,
    minSimilarity?: number
  ): Promise<SearchMatch[]>;
}

export class OpenAIEmbeddingService implements EmbeddingService {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || "";
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const cleanText = text.trim();
    if (!cleanText) {
      throw new Error("[OpenAI Embedding Service] Cannot generate embedding for empty text.");
    }

    if (!this.apiKey) {
      throw new Error(
        "[OpenAI Embedding Service] Missing OPENAI_API_KEY. Real embeddings cannot be generated. Fallback to lexical retrieval required."
      );
    }

    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: cleanText.replace(/\n/g, " "),
          model: DEFAULT_EMBEDDING_MODEL,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI Embeddings returned HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const embedding = data.data?.[0]?.embedding;
      if (!embedding || !Array.isArray(embedding) || isSyntheticOrZeroVector(embedding)) {
        throw new Error("Invalid or empty embedding returned from OpenAI");
      }

      const tokenCount = data.usage?.prompt_tokens || Math.ceil(cleanText.length / 4);

      return {
        embedding,
        tokenCount,
        model: DEFAULT_EMBEDDING_MODEL,
        dimension: embedding.length,
      };
    } catch (e: any) {
      console.error("[OpenAI Embedding Service] Failed to generate embedding:", e?.message || e);
      throw e;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (texts.length === 0) return [];

    if (!this.apiKey) {
      throw new Error(
        "[OpenAI Embedding Service] Missing OPENAI_API_KEY. Bulk embeddings cannot be generated."
      );
    }

    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: texts.map((t) => t.trim().replace(/\n/g, " ")),
          model: DEFAULT_EMBEDDING_MODEL,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI Embeddings returned HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const results = data.data;
      if (!results || results.length !== texts.length) {
        throw new Error("Invalid count of embeddings returned from OpenAI");
      }

      const sortedResults = [...results].sort((a, b) => a.index - b.index);

      return sortedResults.map((r, idx) => {
        if (isSyntheticOrZeroVector(r.embedding)) {
          throw new Error(`Synthetic or zero vector returned for item ${idx}`);
        }
        return {
          embedding: r.embedding,
          tokenCount: Math.ceil(texts[idx].length / 4),
          model: DEFAULT_EMBEDDING_MODEL,
          dimension: r.embedding.length,
        };
      });
    } catch (e: any) {
      console.error("[OpenAI Embedding Service] Failed to generate bulk embeddings:", e?.message || e);
      throw e;
    }
  }
}

export class PostgresVectorStore implements VectorStore {
  async saveEmbedding(
    organizationId: string,
    chunkId: string,
    embedding: number[],
    metadata?: Record<string, any>
  ): Promise<void> {
    // Never store zero or synthetic vectors
    if (isSyntheticOrZeroVector(embedding)) {
      throw new Error(`[Postgres Vector Store] Refusing to persist synthetic/zero embedding for chunk ${chunkId}`);
    }

    try {
      await db
        .update(knowledgeChunks)
        .set({
          embedding,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(knowledgeChunks.id, chunkId),
            eq(knowledgeChunks.organizationId, organizationId)
          )
        );
    } catch (e: any) {
      console.error(`[Postgres Vector Store] Failed to save embedding for chunk ${chunkId}:`, e);
      throw e;
    }
  }

  async deleteEmbeddings(chunkIds: string[]): Promise<void> {
    if (chunkIds.length === 0) return;
    try {
      await db
        .update(knowledgeChunks)
        .set({
          embedding: null,
          updatedAt: new Date(),
        })
        .where(inArray(knowledgeChunks.id, chunkIds));
    } catch (e: any) {
      console.error(`[Postgres Vector Store] Failed to clear embeddings for chunks:`, e);
      throw e;
    }
  }

  async invalidateSyntheticEmbeddings(organizationId?: string): Promise<number> {
    try {
      // Find chunks where embedding is all zeros and clear them
      const whereCondition = organizationId
        ? and(
            eq(knowledgeChunks.organizationId, organizationId),
            sql`${knowledgeChunks.embedding} IS NOT NULL`
          )
        : sql`${knowledgeChunks.embedding} IS NOT NULL`;

      // Clear zero vectors using pgvector magnitude check
      const result = await db
        .update(knowledgeChunks)
        .set({
          embedding: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            whereCondition,
            sql`(${knowledgeChunks.embedding} <-> array_fill(0, ARRAY[1536])::vector) = 0`
          )
        );

      return 0;
    } catch (e) {
      console.warn("[Postgres Vector Store] Invalidation check skipped or table uninitialized:", e);
      return 0;
    }
  }
}

export class PostgresRetrievalService implements RetrievalService {
  constructor(private embeddingService: EmbeddingService) {}

  async retrieveRelevantChunks(
    organizationId: string,
    query: string,
    limit = 5,
    minSimilarity = MIN_VECTOR_SIMILARITY_THRESHOLD
  ): Promise<SearchMatch[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || !organizationId) return [];

    let vectorMatches: SearchMatch[] = [];

    // 1. Attempt Real Semantic Vector Search
    try {
      const { embedding } = await this.embeddingService.generateEmbedding(trimmedQuery);

      if (embedding && Array.isArray(embedding) && !isSyntheticOrZeroVector(embedding)) {
        const embeddingSql = JSON.stringify(embedding);
        const similaritySql = sql`1 - (${knowledgeChunks.embedding} <=> ${embeddingSql}::vector)`;

        const results = await db
          .select({
            id: knowledgeChunks.id,
            documentId: knowledgeChunks.documentId,
            content: knowledgeChunks.content,
            metadata: knowledgeChunks.metadata,
            score: sql<number>`${similaritySql}`,
          })
          .from(knowledgeChunks)
          .innerJoin(
            knowledgeDocuments,
            eq(knowledgeChunks.documentId, knowledgeDocuments.id)
          )
          .where(
            and(
              eq(knowledgeChunks.organizationId, organizationId),
              eq(knowledgeDocuments.status, "completed"),
              eq(knowledgeDocuments.isArchived, false),
              sql`${knowledgeChunks.embedding} IS NOT NULL`
            )
          )
          .orderBy(sql`${knowledgeChunks.embedding} <=> ${embeddingSql}::vector`)
          .limit(limit * 2);

        vectorMatches = results
          .map((r) => ({
            chunkId: r.id,
            documentId: r.documentId,
            content: r.content,
            score: Number(r.score || 0),
            metadata: (r.metadata || {}) as Record<string, any>,
            retrievalMode: "vector" as const,
          }))
          // Relevance gate: filter out weak/irrelevant matches
          .filter((m) => m.score >= minSimilarity)
          .slice(0, limit);
      }
    } catch (e: any) {
      console.warn(
        `[Postgres Retrieval Service] Vector search unavailable for query "${trimmedQuery}", engaging deterministic lexical fallback:`,
        e?.message || e
      );
    }

    // If vector search returned high-confidence matches meeting the threshold, return them
    if (vectorMatches.length > 0) {
      return vectorMatches;
    }

    // 2. Deterministic Lexical / Keyword Fallback
    return this.retrieveLexicalFallback(organizationId, trimmedQuery, limit);
  }

  async retrieveLexicalFallback(
    organizationId: string,
    query: string,
    limit = 5
  ): Promise<SearchMatch[]> {
    try {
      const stopWords = new Set([
        "what", "is", "the", "a", "an", "and", "or", "to", "in", "of",
        "for", "on", "with", "how", "does", "do", "can", "you", "tell",
        "me", "about", "are", "your", "where", "when", "why", "who", "which",
        "i", "my", "our", "we", "at", "it", "this", "that"
      ]);

      const tokens = query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 2 && !stopWords.has(t));

      if (tokens.length === 0) {
        return [];
      }

      // Fetch chunks for the organization
      const chunks = await db
        .select({
          id: knowledgeChunks.id,
          documentId: knowledgeChunks.documentId,
          content: knowledgeChunks.content,
          metadata: knowledgeChunks.metadata,
        })
        .from(knowledgeChunks)
        .innerJoin(
          knowledgeDocuments,
          eq(knowledgeChunks.documentId, knowledgeDocuments.id)
        )
        .where(
          and(
            eq(knowledgeChunks.organizationId, organizationId),
            eq(knowledgeDocuments.status, "completed"),
            eq(knowledgeDocuments.isArchived, false)
          )
        )
        .limit(100);

      const scoredChunks: SearchMatch[] = [];

      for (const chunk of chunks) {
        const lowerContent = chunk.content.toLowerCase();
        let matchedCount = 0;

        for (const token of tokens) {
          if (lowerContent.includes(token)) {
            matchedCount++;
          }
        }

        if (matchedCount > 0) {
          const score = matchedCount / tokens.length;
          if (score >= MIN_LEXICAL_MATCH_THRESHOLD) {
            scoredChunks.push({
              chunkId: chunk.id,
              documentId: chunk.documentId,
              content: chunk.content,
              score: Math.round(score * 100) / 100,
              metadata: (chunk.metadata || {}) as Record<string, any>,
              retrievalMode: "lexical",
            });
          }
        }
      }

      // Rank by match score descending
      scoredChunks.sort((a, b) => b.score - a.score);
      return scoredChunks.slice(0, limit);
    } catch (e) {
      console.error("[Postgres Retrieval Service] Lexical fallback failed:", e);
      return [];
    }
  }
}

// Default production instances
export const embeddingService = new OpenAIEmbeddingService();
export const vectorStore = new PostgresVectorStore();
export const retrievalService = new PostgresRetrievalService(embeddingService);
