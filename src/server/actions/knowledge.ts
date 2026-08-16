"use server";

import { auth } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { categoriesRepository } from "../repositories/categories";
import { KnowledgeAnalysisService } from "../services/ingestion/ingestion-services";
import { sourcesRepository } from "../repositories/sources";
import { documentsRepository } from "../repositories/documents";
import { chunksRepository } from "../repositories/chunks";
import { jobsRepository } from "../repositories/jobs";
import { importsRepository } from "../repositories/imports";
import { faqRepository } from "../repositories/faq";
import { servicesRepository } from "../repositories/services";
import { membershipRepository } from "../repositories/membership";
import { chunkingService } from "../services/chunking";
import { db } from "../db";
import { faqItems, services, knowledgeDocuments, knowledgeCategories, knowledgeChunks } from "../db/schema";
import { eq, and, ilike, or, like, inArray } from "drizzle-orm";

async function getVerifiedOrgId() {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  if (orgId) return orgId;
  const memberships = await membershipRepository.getByUser(userId);
  if (memberships.length === 0) throw new Error("No organization found");
  return memberships[0].organizationId;
}

/** IDOR guard: ensures a knowledge document belongs to the caller's org */
async function assertDocumentOwnership(orgId: string, documentId: string) {
  const [doc] = await db
    .select({ id: knowledgeDocuments.id, organizationId: knowledgeDocuments.organizationId })
    .from(knowledgeDocuments)
    .where(and(eq(knowledgeDocuments.id, documentId), eq(knowledgeDocuments.organizationId, orgId)))
    .limit(1);
  if (!doc) throw new Error("Document not found or access denied");
  return doc;
}

/** IDOR guard: ensures a knowledge category belongs to the caller's org */
async function assertCategoryOwnership(orgId: string, categoryId: string) {
  const [cat] = await db
    .select({ id: knowledgeCategories.id, organizationId: knowledgeCategories.organizationId })
    .from(knowledgeCategories)
    .where(and(eq(knowledgeCategories.id, categoryId), eq(knowledgeCategories.organizationId, orgId)))
    .limit(1);
  if (!cat) throw new Error("Category not found or access denied");
  return cat;
}

const ALLOWED_FILE_TYPES = ["pdf", "docx", "txt", "md", "csv", "website"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ==========================================
// 1. KNOWLEDGE CATEGORIES ACTIONS
// ==========================================

export async function getKnowledgeCategoriesAction() {
  try {
    const orgId = await getVerifiedOrgId();
    const categories = await categoriesRepository.list(orgId);
    return { success: true, categories };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load categories" };
  }
}

export async function createKnowledgeCategoryAction(data: {
  name: string;
  description?: string;
  icon?: string;
  priority?: string;
  color?: string;
  sortOrder?: number;
  status?: string;
  aiWeight?: string;
  parentId?: string | null;
  visibility?: "public" | "internal" | "ai_only";
  aiInstructions?: string;
}) {
  try {
    const orgId = await getVerifiedOrgId();
    const { userId } = await auth();

    const nameTrimmed = data.name.trim();
    if (!nameTrimmed) throw new Error("Category Name is required");
    if (nameTrimmed.length > 80) throw new Error("Category Name cannot exceed 80 characters");
    if (data.description && data.description.length > 500) throw new Error("Description cannot exceed 500 characters");
    if (data.aiInstructions && data.aiInstructions.length > 2000) throw new Error("AI Instructions cannot exceed 2000 characters");

    const sortOrderVal = data.sortOrder ?? 0;
    if (sortOrderVal < 0 || !Number.isInteger(sortOrderVal)) {
      throw new Error("Sort Order must be a positive integer");
    }

    const slug = nameTrimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const existing = await categoriesRepository.getBySlug(orgId, slug);
    if (existing) {
      throw new Error("A category with this name already exists");
    }

    await categoriesRepository.create({
      organizationId: orgId,
      name: nameTrimmed,
      slug,
      description: data.description?.trim() || null,
      icon: data.icon || "folder",
      priority: data.priority || "medium",
      color: data.color || "primary",
      sortOrder: sortOrderVal,
      status: data.status || "active",
      aiWeight: data.aiWeight || "normal",
      parentId: data.parentId || null,
      visibility: data.visibility || "public",
      aiInstructions: data.aiInstructions?.trim() || null,
      createdById: userId,
      updatedById: userId,
    });

    revalidatePath("/kb");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to create category" };
  }
}

export async function updateKnowledgeCategoryAction(
  id: string,
  data: {
    name: string;
    description?: string;
    icon?: string;
    priority?: string;
    color?: string;
    sortOrder?: number;
    status?: string;
    aiWeight?: string;
    parentId?: string | null;
    visibility?: "public" | "internal" | "ai_only";
    aiInstructions?: string;
    isArchived?: boolean;
  }
) {
  try {
    const orgId = await getVerifiedOrgId();
    const { userId } = await auth();
    // IDOR guard
    await assertCategoryOwnership(orgId, id);

    const nameTrimmed = data.name.trim();
    if (!nameTrimmed) throw new Error("Category Name is required");
    if (nameTrimmed.length > 80) throw new Error("Category Name cannot exceed 80 characters");
    if (data.description && data.description.length > 500) throw new Error("Description cannot exceed 500 characters");
    if (data.aiInstructions && data.aiInstructions.length > 2000) throw new Error("AI Instructions cannot exceed 2000 characters");

    const sortOrderVal = data.sortOrder ?? 0;
    if (sortOrderVal < 0 || !Number.isInteger(sortOrderVal)) {
      throw new Error("Sort Order must be a positive integer");
    }

    const slug = nameTrimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const existing = await categoriesRepository.getBySlug(orgId, slug);
    if (existing && existing.id !== id) {
      throw new Error("A category with this name already exists");
    }

    await categoriesRepository.update(id, {
      name: nameTrimmed,
      slug,
      description: data.description?.trim() || null,
      icon: data.icon || "folder",
      priority: data.priority || "medium",
      color: data.color || "primary",
      sortOrder: sortOrderVal,
      status: data.status || "active",
      aiWeight: data.aiWeight || "normal",
      parentId: data.parentId || null,
      visibility: data.visibility || "public",
      aiInstructions: data.aiInstructions?.trim() || null,
      isArchived: data.isArchived ?? false,
      updatedById: userId,
    });

    revalidatePath("/kb");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update category" };
  }
}

export async function deleteKnowledgeCategoryAction(id: string) {
  try {
    const orgId = await getVerifiedOrgId();
    // IDOR guard
    await assertCategoryOwnership(orgId, id);
    await categoriesRepository.delete(id);
    revalidatePath("/kb");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete category" };
  }
}

export async function archiveKnowledgeCategoryAction(id: string, isArchived: boolean) {
  try {
    const orgId = await getVerifiedOrgId();
    const { userId } = await auth();
    // IDOR guard
    await assertCategoryOwnership(orgId, id);
    await categoriesRepository.update(id, { 
      isArchived,
      updatedById: userId
    });
    revalidatePath("/kb");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to archive category" };
  }
}

// ==========================================
// 2. KNOWLEDGE DOCUMENTS ACTIONS
// ==========================================

export async function getKnowledgeDocumentsAction(isArchived = false) {
  try {
    const orgId = await getVerifiedOrgId();
    const docs = await documentsRepository.list(orgId, isArchived);
    return { success: true, documents: docs };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load documents" };
  }
}

export async function uploadKnowledgeDocumentAction(data: {
  name: string;
  fileType: string;
  fileSize: number;
  content: string;
  categoryId?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const orgId = await getVerifiedOrgId();

    // Validate file type
    const normalizedType = data.fileType.toLowerCase().replace("application/pdf", "pdf").replace("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx").replace("text/plain", "txt").replace("text/markdown", "md").replace("text/csv", "csv");
    if (!ALLOWED_FILE_TYPES.includes(normalizedType)) {
      throw new Error(`File type "${data.fileType}" is not allowed. Supported: PDF, DOCX, TXT, MD, CSV`);
    }

    // Validate file size
    if (data.fileSize > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File size exceeds the 10 MB limit`);
    }

    // Validate content is not suspiciously large
    if (data.content.length > 500_000) {
      throw new Error("Document content is too large to process");
    }

    // 1. Get or create a general manual source for user uploads
    let source = await sourcesRepository.getByType(orgId, "manual");
    if (!source) {
      source = await sourcesRepository.create({
        organizationId: orgId,
        name: "Manual Uploads",
        type: "manual",
        isActive: true,
      });
    }

    // 2. Insert Document record
    const document = await documentsRepository.create({
      organizationId: orgId,
      sourceId: source.id,
      categoryId: data.categoryId || null,
      name: data.name,
      fileType: data.fileType.toLowerCase(),
      fileSize: data.fileSize,
      status: "queued",
      metadata: data.metadata || {},
    });

    // 3. Create document processing job
    const job = await jobsRepository.create({
      organizationId: orgId,
      documentId: document.id,
      status: "queued",
      startedAt: new Date(),
    });

    // 4. Run document text chunking
    const startTime = Date.now();
    await jobsRepository.update(job.id, { status: "processing", logs: "Starting extraction..." });
    await jobsRepository.update(job.id, { status: "chunking", logs: "Segmenting document text into chunks..." });

    const chunks = chunkingService.splitText(data.content);
    const chunkPayload = chunks.map((chunk) => ({
      organizationId: orgId,
      documentId: document.id,
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      tokenCount: chunk.tokenCount,
    }));

    if (chunkPayload.length > 0) {
      await chunksRepository.createMany(chunkPayload);
    }

    // 5. Complete Job
    const duration = Date.now() - startTime;
    await jobsRepository.update(job.id, {
      status: "completed",
      logs: `Processing completed successfully. Created ${chunks.length} chunks.`,
      completedAt: new Date(),
      duration,
    });

    await documentsRepository.update(document.id, { status: "completed" });

    revalidatePath("/kb");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to process upload" };
  }
}

export async function updateKnowledgeDocumentContentAction(data: {
  documentId: string;
  name?: string;
  content: string;
  categoryId?: string | null;
}) {
  try {
    const orgId = await getVerifiedOrgId();
    await assertDocumentOwnership(orgId, data.documentId);

    const doc = await documentsRepository.getById(data.documentId);
    if (!doc) throw new Error("Document not found");

    if (data.content.length > 500_000) {
      throw new Error("Document content exceeds the maximum size of 500,000 characters");
    }

    const currentMetadata = (doc.metadata || {}) as Record<string, any>;
    const newVersion = ((currentMetadata.version as number) || 1) + 1;

    // 1. Update Document Record with new revision & metadata
    await documentsRepository.update(data.documentId, {
      name: data.name ? data.name.trim() : doc.name,
      fileSize: Buffer.byteLength(data.content, "utf8"),
      categoryId: data.categoryId !== undefined ? data.categoryId : doc.categoryId,
      status: "chunking",
      metadata: {
        ...currentMetadata,
        version: newVersion,
        lastEditedAt: new Date().toISOString(),
      },
    });

    // 2. Incremental re-chunking: clear existing chunks for this document
    await db
      .delete(knowledgeChunks)
      .where(and(eq(knowledgeChunks.organizationId, orgId), eq(knowledgeChunks.documentId, data.documentId)));

    // 3. Generate new chunks and persist
    const chunks = chunkingService.splitText(data.content);
    const chunkPayload = chunks.map((chunk) => ({
      organizationId: orgId,
      documentId: data.documentId,
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      tokenCount: chunk.tokenCount,
    }));

    if (chunkPayload.length > 0) {
      await chunksRepository.createMany(chunkPayload);
    }

    // 4. Mark completed
    await documentsRepository.update(data.documentId, { status: "completed" });

    revalidatePath("/kb");
    return { success: true, version: newVersion, chunksCount: chunks.length };
  } catch (error: any) {
    console.error("updateKnowledgeDocumentContentAction error:", error);
    return { success: false, error: error?.message || "Failed to update document content" };
  }
}

export async function renameKnowledgeDocumentAction(id: string, name: string) {
  try {
    const orgId = await getVerifiedOrgId();
    // IDOR guard
    await assertDocumentOwnership(orgId, id);
    if (!name?.trim() || name.length > 300) {
      throw new Error("Document name must be between 1 and 300 characters");
    }
    await documentsRepository.update(id, { name: name.trim() });
    revalidatePath("/kb");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to rename document" };
  }
}

export async function archiveKnowledgeDocumentAction(id: string, isArchived: boolean) {
  try {
    const orgId = await getVerifiedOrgId();
    // IDOR guard
    await assertDocumentOwnership(orgId, id);
    await documentsRepository.update(id, { isArchived });
    revalidatePath("/kb");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to archive document" };
  }
}

export async function deleteKnowledgeDocumentAction(id: string) {
  try {
    const orgId = await getVerifiedOrgId();
    // IDOR guard
    await assertDocumentOwnership(orgId, id);
    await documentsRepository.delete(id);
    revalidatePath("/kb");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete document" };
  }
}

// ==========================================
// 3. WEBSITE IMPORT ACTIONS
// ==========================================

export async function getWebsiteImportsAction() {
  try {
    const orgId = await getVerifiedOrgId();
    const list = await importsRepository.list(orgId);
    return { success: true, imports: list };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load website imports" };
  }
}

export async function getImportHistoryAction() {
  try {
    const orgId = await getVerifiedOrgId();
    const list = await importsRepository.list(orgId);
    return { success: true, history: list };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load website imports" };
  }
}

export async function discoverWebsitePagesAction(data: {
  url: string;
  config: {
    maxDepth: string;
    maxPages: number;
    includeSubdomains: boolean;
    followExternalLinks: boolean;
    ignoreQueryParams: boolean;
    includePaths: string[];
    excludePaths: string[];
    aiOptions: {
      aiExtract: boolean;
      autoCategory: boolean;
      generateTags: boolean;
      generateSummary: boolean;
      detectLanguage: boolean;
      estimateChunks: boolean;
    };
    duplicateHandling: string;
  };
}) {
  try {
    const orgId = await getVerifiedOrgId();

    // 1. Get or create website source
    let source = await sourcesRepository.getByType(orgId, "website");
    if (!source) {
      source = await sourcesRepository.create({
        organizationId: orgId,
        name: "Website Crawls",
        type: "website",
        isActive: true,
      });
    }

    // List of virtual pages available on a salon website
    const allDiscoveredPages = [
      { name: "Home Page", path: "/", wordCount: 180, category: "Services & Pricing" },
      { name: "Services & Pricing Menu", path: "/services", wordCount: 345, category: "Services & Pricing" },
      { name: "Cancellation & Booking Policies", path: "/policies", wordCount: 420, category: "Booking Policies" },
      { name: "Stylist Bios & Staff Team", path: "/stylists", wordCount: 280, category: "Stylists & Team" },
      { name: "Location, Hours & Parking", path: "/contact", wordCount: 190, category: "Salon Information & Hours" },
      { name: "Retail Products Catalog", path: "/products", wordCount: 310, category: "Retail & Products" },
      { name: "Memberships & Promos", path: "/memberships", wordCount: 250, category: "Promotions & Memberships" },
      { name: "Hair Care Styling Blog", path: "/blog/trends", wordCount: 550, category: "Services & Pricing" },
      { name: "Dynamic Booking Portal", path: "/booking/widget", wordCount: 15, category: "" },
      { name: "Customer Gallery & Portfolio", path: "/gallery", wordCount: 8, category: "" },
    ];

    // Filter pages based on include / exclude paths
    const finalDiscovered = allDiscoveredPages.map(page => {
      let isExcluded = false;

      // Exclude paths match check
      for (const exPath of data.config.excludePaths) {
        if (exPath && page.path.startsWith(exPath)) {
          isExcluded = true;
          break;
        }
      }

      // Include paths check (if set, page must match at least one)
      const activeIncludes = data.config.includePaths.filter(Boolean);
      if (activeIncludes.length > 0 && !isExcluded) {
        let matchesInclude = false;
        for (const incPath of activeIncludes) {
          if (page.path.startsWith(incPath)) {
            matchesInclude = true;
            break;
          }
        }
        if (!matchesInclude) {
          isExcluded = true;
        }
      }

      return {
        title: page.name,
        url: `${data.url.replace(/\/$/, "")}${page.path}`,
        path: page.path,
        wordCount: page.wordCount,
        estimatedChunks: Math.ceil(page.wordCount / 150),
        suggestedCategory: page.category || null,
        status: isExcluded ? "excluded" : "pending",
      };
    });

    // Create import record in database
    const importRun = await importsRepository.create({
      organizationId: orgId,
      sourceId: source.id,
      url: data.url,
      status: "discovery",
      pagesFound: finalDiscovered.length,
      pagesScraped: finalDiscovered.filter(p => p.status !== "excluded").length,
      metadata: {
        config: data.config,
        discoveredPages: finalDiscovered,
      },
    });

    revalidatePath("/kb");
    return { success: true, importId: importRun.id, discoveredPages: finalDiscovered };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to crawl page content" };
  }
}

export async function executeWebsiteIngestionAction(data: {
  importId: string;
  selectedPages: { title: string; url: string; path: string; wordCount: number; suggestedCategory: string }[];
  duplicateHandling: string;
}) {
  try {
    const orgId = await getVerifiedOrgId();
    const importRecord = await importsRepository.getById(data.importId);
    if (!importRecord) {
      throw new Error("Import run record not found");
    }

    // 1. Get or create website source
    let source = await sourcesRepository.getByType(orgId, "website");
    if (!source) {
      source = await sourcesRepository.create({
        organizationId: orgId,
        name: "Website Crawls",
        type: "website",
        isActive: true,
      });
    }

    // Update status to processing
    await importsRepository.update(data.importId, {
      status: "processing",
      metadata: {
        ...(importRecord.metadata as Record<string, any>),
        stage: "Discovering pages",
        progress: 10,
        startTime: Date.now(),
      }
    });

    // Run the background ingestion loop (asynchronously)
    setTimeout(async () => {
      const stages = [
        { name: "Cleaning Scraped HTML", progress: 30 },
        { name: "Removing Navigation Boilerplate", progress: 50 },
        { name: "Extracting Clean Content", progress: 70 },
        { name: "Generating AI Suggestions", progress: 85 },
        { name: "Chunking & RAG Indexing", progress: 95 }
      ];

      try {
        const categoriesList = await categoriesRepository.list(orgId);

        // Cycle through progress stages
        for (const stg of stages) {
          await new Promise(resolve => setTimeout(resolve, 800)); // premium speed simulation
          await importsRepository.update(data.importId, {
            metadata: {
              ...(importRecord.metadata as Record<string, any>),
              stage: stg.name,
              progress: stg.progress,
            }
          });
        }

        // Standard content generators for the document bodies
        const pageContentMap: Record<string, string> = {
          "/": "Glow & Grace Salon delivers luxury styling and premium coloring care. Meet our professional team and schedule your balayage or precision cut at our Center City location. We validation 3 hours garage parking.",
          "/services": "Signature Cuts starting at $75. Signature Blowouts start at $45. deep conditioning masks are $30 add-on. Keratin treatments start at $250.",
          "/policies": "Cancel or reschedule at least 24 hours prior to avoid a 50% late cancellation fee. No-shows are subject to 100% service fee.",
          "/stylists": "Elena Rostova specializes in French balayage and tape-in extensions. Sarah Jenkins is our certified curly hair specialist. Marcus Thorne specializes in men's precision grooming and fades.",
          "/contact": "Address: 123 Beauty Lane, Suite A. Open Tuesday to Friday 9AM-8PM, Sunday 10AM-4PM. Phone: (555) 123-4567.",
          "/products": "We carry luxury brands Oribe, Kerastase, and Olaplex. Items can be returned unopened within 14 days of purchase.",
          "/memberships": "Monthly Glow Signature Membership ($99) includes 2 blowouts, 15% discount on styling/color, 10% discount on retail products, and birthday perks.",
          "/blog/trends": "Dimensional blondes and textured curl shags are trending this summer. Talk to Sarah or Elena for a custom consultation.",
          "/booking/widget": "Dynamic booking panel container. Please fill out your details to select your stylist and preferred booking slot.",
          "/gallery": "Visual portfolio gallery. Includes photos of custom highlights, balayage blends, updo hairstyles, and precision bob haircuts.",
        };

        // Create the actual documents & chunks in DB
        let importedCount = 0;
        let skippedCount = 0;
        let failedCount = 0;
        const failedPagesList: string[] = [];

        for (const page of data.selectedPages) {
          const content = pageContentMap[page.path] || `Ingested page details for path ${page.path}. Content is extracted, parsed, and embedded for search.`;
          
          // Duplicate check
          if (data.duplicateHandling === "skip") {
            const existing = await documentsRepository.list(orgId);
            const isDuplicate = existing.some(d => d.name.includes(page.title) || (d.metadata as any)?.url?.includes(page.url));
            if (isDuplicate) {
              skippedCount++;
              continue;
            }
          }

          // Fetch category id from name
          const matchedCategory = categoriesList.find(c => c.name === page.suggestedCategory);
          const categoryId = matchedCategory?.id || null;

          const doc = await documentsRepository.create({
            organizationId: orgId,
            sourceId: source.id,
            categoryId,
            name: `${page.title} (Web)`,
            fileType: "website",
            status: "completed",
            metadata: {
              url: page.url,
              summary: content.slice(0, 100) + "...",
              tags: ["website", "ingested"],
              priority: "medium",
              visibility: "public"
            }
          });

          // Generate chunks
          const chunks = chunkingService.splitText(content);
          const chunkPayload = chunks.map((chunk) => ({
            organizationId: orgId,
            documentId: doc.id,
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            tokenCount: chunk.tokenCount,
            metadata: { url: page.url },
          }));

          if (chunkPayload.length > 0) {
            await chunksRepository.createMany(chunkPayload);
          }
          importedCount++;
        }

        // Finalize completed status
        const startTime = (importRecord.metadata as any)?.startTime || Date.now();
        const durationMs = Date.now() - startTime;

        await importsRepository.update(data.importId, {
          status: "completed",
          pagesScraped: importedCount,
          metadata: {
            ...(importRecord.metadata as Record<string, any>),
            stage: "Completed Ingestion",
            progress: 100,
            durationMs,
            stats: {
              imported: importedCount,
              skipped: skippedCount,
              failed: failedCount,
              failedPagesList,
            }
          }
        });

      } catch (err: any) {
        console.error("Execute Ingestion Background Job failed:", err);
        await importsRepository.update(data.importId, {
          status: "failed",
          errorMessage: err?.message || "Ingestion pipeline encountered a fatal error.",
        });
      }
    }, 1000);

    revalidatePath("/kb");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to trigger website import" };
  }
}

export async function getImportStatusAction(importId: string) {
  try {
    const importRecord = await importsRepository.getById(importId);
    if (!importRecord) {
      return { success: false, error: "Import record not found" };
    }
    return { success: true, import: importRecord };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load import status" };
  }
}

// ==========================================
// 4. DOCUMENT PROCESSING QUEUE ACTIONS
// ==========================================

export async function getProcessingJobsAction() {
  try {
    const orgId = await getVerifiedOrgId();
    const jobs = await jobsRepository.list(orgId);
    
    // Enrich jobs with document names
    const enrichedJobs = await Promise.all(
      jobs.map(async (job) => {
        const doc = await documentsRepository.getById(job.documentId);
        return {
          ...job,
          documentName: doc?.name || "Unknown Document",
        };
      })
    );

    return { success: true, jobs: enrichedJobs };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load processing jobs" };
  }
}

// ==========================================
// 5. INTERNAL FULL-TEXT SEARCH ACTION
// ==========================================

export async function searchKnowledgeAction(query: string) {
  try {
    const orgId = await getVerifiedOrgId();
    if (!query || query.trim().length === 0) {
      return { success: true, results: { documents: [], faqs: [], services: [] } };
    }

    const likeQuery = `%${query.trim()}%`;
    const cleanQuery = query.replace(/[^\w\s]/g, "").trim();
    const queryWords = cleanQuery
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .map((w) => w.toLowerCase());

    // 1. Search Knowledge Documents
    let docs: any[] = [];
    if (queryWords.length > 0) {
      // Find document IDs that match chunks
      const chunkDocIds = await db
        .select({ documentId: knowledgeChunks.documentId })
        .from(knowledgeChunks)
        .where(
          and(
            eq(knowledgeChunks.organizationId, orgId),
            or(...queryWords.map((word) => ilike(knowledgeChunks.content, `%${word}%`)))
          )
        )
        .limit(20);

      const matchedDocIds = Array.from(new Set(chunkDocIds.map((c) => c.documentId)));

      docs = await db
        .select()
        .from(knowledgeDocuments)
        .where(
          and(
            eq(knowledgeDocuments.organizationId, orgId),
            eq(knowledgeDocuments.isArchived, false),
            or(
              ilike(knowledgeDocuments.name, likeQuery),
              ...queryWords.map((word) => ilike(knowledgeDocuments.name, `%${word}%`)),
              matchedDocIds.length > 0 ? inArray(knowledgeDocuments.id, matchedDocIds) : undefined
            )
          )
        )
        .limit(10);
    } else {
      docs = await db
        .select()
        .from(knowledgeDocuments)
        .where(
          and(
            eq(knowledgeDocuments.organizationId, orgId),
            eq(knowledgeDocuments.isArchived, false),
            ilike(knowledgeDocuments.name, likeQuery)
          )
        )
        .limit(10);
    }

    // 2. Search FAQs
    let faqs: any[] = [];
    if (queryWords.length > 0) {
      faqs = await db
        .select()
        .from(faqItems)
        .where(
          and(
            eq(faqItems.organizationId, orgId),
            eq(faqItems.isActive, true),
            or(
              ilike(faqItems.question, likeQuery),
              ilike(faqItems.answer, likeQuery),
              ...queryWords.map((word) => ilike(faqItems.question, `%${word}%`)),
              ...queryWords.map((word) => ilike(faqItems.answer, `%${word}%`)),
              ...queryWords.map((word) => ilike(faqItems.category, `%${word}%`))
            )
          )
        )
        .limit(10);
    } else {
      faqs = await db
        .select()
        .from(faqItems)
        .where(
          and(
            eq(faqItems.organizationId, orgId),
            eq(faqItems.isActive, true),
            or(
              ilike(faqItems.question, likeQuery),
              ilike(faqItems.answer, likeQuery),
              ilike(faqItems.category, likeQuery)
            )
          )
        )
        .limit(10);
    }

    // 3. Search Services
    let svcs: any[] = [];
    if (queryWords.length > 0) {
      svcs = await db
        .select()
        .from(services)
        .where(
          and(
            eq(services.organizationId, orgId),
            eq(services.isActive, true),
            eq(services.isArchived, false),
            or(
              ilike(services.name, likeQuery),
              ilike(services.description, likeQuery),
              ...queryWords.map((word) => ilike(services.name, `%${word}%`)),
              ...queryWords.map((word) => ilike(services.description, `%${word}%`))
            )
          )
        )
        .limit(10);
    } else {
      svcs = await db
        .select()
        .from(services)
        .where(
          and(
            eq(services.organizationId, orgId),
            eq(services.isActive, true),
            eq(services.isArchived, false),
            or(
              ilike(services.name, likeQuery),
              ilike(services.description, likeQuery)
            )
          )
        )
        .limit(10);
    }

    return {
      success: true,
      results: {
        documents: docs,
        faqs,
        services: svcs,
      },
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Search execution failed" };
  }
}

// ==========================================
// 6. HEALTH SCORE & STATISTICS ACTIONS
// ==========================================

export async function getKnowledgeStatsAction() {
  try {
    const orgId = await getVerifiedOrgId();

    // Parallelize all initial fetches
    const [docs, categories, faqsList, servicesList] = await Promise.all([
      documentsRepository.list(orgId, false),
      categoriesRepository.list(orgId),
      faqRepository.list(orgId),
      servicesRepository.list(orgId),
    ]);

    // Count chunks in a single aggregated DB query (not N+1)
    let totalChunks = 0;
    if (docs.length > 0) {
      const { knowledgeChunks } = await import("../db/schema");
      const { sql, inArray } = await import("drizzle-orm");
      const docIds = docs.map((d) => d.id);
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(knowledgeChunks)
        .where(inArray(knowledgeChunks.documentId, docIds));
      totalChunks = result?.count ?? 0;
    }

    // Health Score calculation (0 to 100)
    let score = 0;
    if (docs.length > 0) score += 25;       // basic documentation upload
    if (faqsList.length > 3) score += 25;    // detailed FAQ list
    if (servicesList.length > 2) score += 25; // structured services
    if (categories.length > 1) score += 25;  // organized taxonomy categories

    let healthLabel: "Poor" | "Average" | "Good" | "Excellent" = "Poor";
    if (score === 100) healthLabel = "Excellent";
    else if (score === 75) healthLabel = "Good";
    else if (score === 50) healthLabel = "Average";

    return {
      success: true,
      stats: {
        totalDocuments: docs.length,
        totalChunks,
        healthScore: score,
        healthLabel,
        storageUsedBytes: docs.reduce((acc, curr) => acc + (curr.fileSize || 0), 0),
        recentUploads: docs.slice(-5),
      },
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load stats" };
  }
}

export async function analyzeKnowledgeContentAction(data: {
  content: string;
  filename: string;
  categories: { id: string; name: string }[];
}) {
  try {
    const orgId = await getVerifiedOrgId();
    const result = await KnowledgeAnalysisService.analyze(
      orgId,
      data.content,
      data.filename,
      data.categories
    );
    return { success: true, analysis: result };
  } catch (error: any) {
    return { success: false, error: error?.message || "Analysis failed" };
  }
}
