import { db } from "../db";
import { knowledgeChunks, knowledgeDocuments } from "../db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
}

export interface SearchMatch {
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
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
}

// 3. Retrieval Interface & Similarity Search Interface
export interface RetrievalService {
  retrieveRelevantChunks(organizationId: string, query: string, limit?: number): Promise<SearchMatch[]>;
}

export class OpenAIEmbeddingService implements EmbeddingService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.apiKey) {
      // Fallback mock embedding for local/test execution without API key
      return {
        embedding: new Array(1536).fill(0),
        tokenCount: Math.ceil(text.length / 4),
      };
    }
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: text.replace(/\n/g, " "),
          model: "text-embedding-3-small",
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI Embeddings returned HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const embedding = data.data?.[0]?.embedding;
      if (!embedding) {
        throw new Error("No embedding returned from OpenAI");
      }

      const tokenCount = data.usage?.prompt_tokens || Math.ceil(text.length / 4);

      return {
        embedding,
        tokenCount,
      };
    } catch (e: any) {
      console.error("[OpenAI Embedding Service] Failed to generate embedding:", e);
      throw e;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (texts.length === 0) return [];
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: texts.map((t) => t.replace(/\n/g, " ")),
          model: "text-embedding-3-small",
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

      return sortedResults.map((r, idx) => ({
        embedding: r.embedding,
        tokenCount: Math.ceil(texts[idx].length / 4),
      }));
    } catch (e: any) {
      console.error("[OpenAI Embedding Service] Failed to generate bulk embeddings:", e);
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
}

export class PostgresRetrievalService implements RetrievalService {
  constructor(private embeddingService: EmbeddingService) {}

  async retrieveRelevantChunks(
    organizationId: string,
    query: string,
    limit = 3
  ): Promise<SearchMatch[]> {
    try {
      const { embedding } = await this.embeddingService.generateEmbedding(query);
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
        .limit(limit);

      return results.map((r) => ({
        chunkId: r.id,
        documentId: r.documentId,
        content: r.content,
        score: Number(r.score || 0),
        metadata: r.metadata as Record<string, any>,
      }));
    } catch (e: any) {
      console.error(`[Postgres Retrieval Service] Failed to retrieve chunks for query "${query}":`, e);
      return [];
    }
  }
}

// Instances
export const embeddingService = new OpenAIEmbeddingService();
export const vectorStore = new PostgresVectorStore();
export const retrievalService = new PostgresRetrievalService(embeddingService);
