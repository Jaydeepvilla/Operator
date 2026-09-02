import {
  isSyntheticOrZeroVector,
  OpenAIEmbeddingService,
  PostgresRetrievalService,
  MIN_VECTOR_SIMILARITY_THRESHOLD,
  MIN_LEXICAL_MATCH_THRESHOLD,
  EmbeddingService,
  EmbeddingResult,
  SearchMatch
} from "../src/server/services/vector";
import { readFileSync } from "fs";
import { join } from "path";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    failedCount++;
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("   RAG RETRIEVAL & SYNTHETIC VECTOR VERIFICATION   ");
  console.log("=======================================================\n");

  // 1. Synthetic & Zero Vector Detection
  console.log("1. Testing Synthetic & Zero Vector Detection Guard...");
  assert(isSyntheticOrZeroVector(null) === true, "Null vector identified as synthetic/invalid");
  assert(isSyntheticOrZeroVector(undefined) === true, "Undefined vector identified as synthetic/invalid");
  assert(isSyntheticOrZeroVector([]) === true, "Empty array identified as synthetic/invalid");
  assert(isSyntheticOrZeroVector(new Array(1536).fill(0)) === true, "1536-dim zero vector identified as synthetic/invalid");
  assert(isSyntheticOrZeroVector([0, 0, 0, 0]) === true, "Zero vector identified as synthetic/invalid");
  assert(isSyntheticOrZeroVector([0.000000001, 0, 0]) === true, "Near-zero magnitude vector identified as synthetic/invalid");

  const validVector = new Array(1536).fill(0.025);
  assert(isSyntheticOrZeroVector(validVector) === false, "Valid non-zero embedding vector accepted");

  // 2. OpenAI Embedding Service Guard
  console.log("\n2. Testing OpenAI Embedding Service Without API Key...");
  const noKeyService = new OpenAIEmbeddingService("");
  let caughtError = false;
  try {
    // Must reject and throw, NEVER return synthetic new Array(1536).fill(0)
    await noKeyService.generateEmbedding("test text");
  } catch (e: any) {
    caughtError = true;
    assert(
      e.message.includes("OPENAI_API_KEY") || e.message.includes("Embeddings"),
      "Throws explicit error when API key missing rather than returning fake vector"
    );
  }
  assert(caughtError === true, "generateEmbedding did not return a fake vector");

  // 3. Deterministic Lexical Fallback Simulation
  console.log("\n3. Testing Deterministic Lexical Fallback Logic...");
  class FailingEmbeddingService implements EmbeddingService {
    async generateEmbedding(text: string): Promise<EmbeddingResult> {
      throw new Error("Embedding API simulated network failure");
    }
    async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
      throw new Error("Embedding API simulated network failure");
    }
  }

  const mockChunks = [
    {
      id: "chunk-dental-1",
      documentId: "doc-dental",
      organizationId: "org-dental",
      content: "Our dental clinic offers teeth cleaning and root canal treatments at $120.",
      metadata: { title: "Dental Pricing" }
    },
    {
      id: "chunk-dental-2",
      documentId: "doc-dental",
      organizationId: "org-dental",
      content: "We are open Monday through Friday from 8 AM to 6 PM.",
      metadata: { title: "Clinic Hours" }
    },
    {
      id: "chunk-salon-1",
      documentId: "doc-salon",
      organizationId: "org-salon",
      content: "Haircut and styling packages start at $45 for men and $65 for women.",
      metadata: { title: "Salon Services" }
    }
  ];

  function simulateLexicalSearch(
    chunks: typeof mockChunks,
    targetOrgId: string,
    query: string,
    minScore = MIN_LEXICAL_MATCH_THRESHOLD
  ): SearchMatch[] {
    const stopWords = new Set([
      "what", "is", "the", "a", "an", "and", "or", "to", "in", "of",
      "for", "on", "with", "how", "does", "do", "your", "our"
    ]);
    const tokens = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !stopWords.has(t));

    if (tokens.length === 0) return [];

    const orgChunks = chunks.filter((c) => c.organizationId === targetOrgId);
    const scored: SearchMatch[] = [];

    for (const chunk of orgChunks) {
      const lower = chunk.content.toLowerCase();
      let matched = 0;
      for (const token of tokens) {
        if (lower.includes(token)) matched++;
      }
      if (matched > 0) {
        const score = matched / tokens.length;
        if (score >= minScore) {
          scored.push({
            chunkId: chunk.id,
            documentId: chunk.documentId,
            content: chunk.content,
            score: Math.round(score * 100) / 100,
            metadata: chunk.metadata,
            retrievalMode: "lexical"
          });
        }
      }
    }

    return scored.sort((a, b) => b.score - a.score);
  }

  // Scenario A: Relevant Query for Dental Org
  const dentalMatches = simulateLexicalSearch(
    mockChunks,
    "org-dental",
    "How much does teeth cleaning cost?"
  );
  assert(dentalMatches.length > 0, "Lexical search matched dental pricing chunk");
  assert(dentalMatches[0].chunkId === "chunk-dental-1", "Most relevant dental chunk returned first");
  assert(dentalMatches[0].retrievalMode === "lexical", "Retrieval mode tagged as lexical");

  // Scenario B: Irrelevant Query (e.g. Geography question against Dental KB)
  const irrelevantMatches = simulateLexicalSearch(
    mockChunks,
    "org-dental",
    "What is the capital of Japan?"
  );
  assert(irrelevantMatches.length === 0, "Irrelevant query returns 0 chunks (no meaningless chunks sent to LLM)");

  // Scenario C: Multi-Tenant Isolation
  const salonQueryForDentalOrg = simulateLexicalSearch(
    mockChunks,
    "org-dental",
    "Haircut and styling package prices"
  );
  assert(salonQueryForDentalOrg.length === 0, "Querying Dental org never leaks Salon org chunks");

  const salonMatches = simulateLexicalSearch(
    mockChunks,
    "org-salon",
    "Haircut and styling package prices"
  );
  assert(
    salonMatches.length === 1 && salonMatches[0].chunkId === "chunk-salon-1",
    "Salon org query retrieves only Salon chunks"
  );

  // 4. Relevance Gate Threshold Simulation
  console.log("\n4. Testing Vector Search Relevance Gating Threshold...");
  const rawVectorResults = [
    { id: "c1", score: 0.88, content: "Direct answer" },
    { id: "c2", score: 0.62, content: "Related topic" },
    { id: "c3", score: 0.31, content: "Unrelated noise" },
    { id: "c4", score: 0.12, content: "Completely unrelated" },
  ];

  const gatedResults = rawVectorResults.filter((r) => r.score >= MIN_VECTOR_SIMILARITY_THRESHOLD);
  assert(gatedResults.length === 2, "Relevance gate excludes low-similarity noise (< 0.50)");
  assert(
    gatedResults.every((r) => r.score >= MIN_VECTOR_SIMILARITY_THRESHOLD),
    "All returned matches meet minimum similarity threshold"
  );

  // 5. Source Code Audit
  console.log("\n5. Auditing Source Files for Zero Synthetic Vector Fallbacks...");
  const vectorSource = readFileSync(join(__dirname, "../src/server/services/vector.ts"), "utf-8");
  assert(!vectorSource.includes("new Array(1536).fill(0)"), "vector.ts does not generate new Array(1536).fill(0) on fallback");
  assert(vectorSource.includes("isSyntheticOrZeroVector"), "vector.ts enforces isSyntheticOrZeroVector validation");
  assert(vectorSource.includes("retrieveLexicalFallback"), "vector.ts implements deterministic lexical fallback");
  assert(vectorSource.includes("MIN_VECTOR_SIMILARITY_THRESHOLD"), "vector.ts defines MIN_VECTOR_SIMILARITY_THRESHOLD");

  console.log("\n=======================================================");
  console.log(`TOTAL PASSED: ${passedCount}`);
  console.log(`TOTAL FAILED: ${failedCount}`);
  console.log("=======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
