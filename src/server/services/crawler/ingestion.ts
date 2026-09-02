import { db } from "../../db";
import { knowledgeDocuments, knowledgeChunks, websiteImports } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { sourcesRepository } from "../../repositories/sources";
import { documentsRepository } from "../../repositories/documents";
import { chunksRepository } from "../../repositories/chunks";
import { categoriesRepository } from "../../repositories/categories";
import { importsRepository } from "../../repositories/imports";
import { chunkingService } from "../chunking";
import { safeFetch } from "./ssrf";
import { ContentExtractor } from "./extractor";

export interface SelectedPagePayload {
  title: string;
  url: string;
  path: string;
  wordCount?: number;
  suggestedCategory?: string;
  content?: string;
}

export class WebsiteIngestionPipeline {
  /**
   * Executes the full ingestion process for selected pages of an import run.
   */
  static async runIngestion(
    organizationId: string,
    importId: string,
    selectedPages: SelectedPagePayload[],
    duplicateHandling: string = "skip"
  ): Promise<void> {
    const importRecord = await importsRepository.getById(importId);
    if (!importRecord || importRecord.organizationId !== organizationId) {
      throw new Error("Import record not found or access denied.");
    }

    // 1. Get or create website source
    let source = await sourcesRepository.getByType(organizationId, "website");
    if (!source) {
      source = await sourcesRepository.create({
        organizationId,
        name: "Website Crawls",
        type: "website",
        isActive: true,
      });
    }

    const categoriesList = await categoriesRepository.list(organizationId);

    // Initial update: Processing started
    await importsRepository.update(importId, {
      status: "processing",
      metadata: {
        ...(importRecord.metadata as Record<string, any>),
        stage: "Starting ingestion pipeline",
        progress: 5,
        startTime: Date.now(),
      },
    });

    let importedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let totalChunksCreated = 0;
    const failedPagesList: { url: string; error: string }[] = [];
    const totalPages = selectedPages.length;

    for (let i = 0; i < selectedPages.length; i++) {
      const page = selectedPages[i];
      const currentProgress = Math.round(5 + ((i + 1) / totalPages) * 90);

      try {
        await importsRepository.update(importId, {
          metadata: {
            ...(importRecord.metadata as Record<string, any>),
            stage: `Processing: ${page.title || page.url} (${i + 1}/${totalPages})`,
            progress: currentProgress,
          },
        });

        // 2. Fetch and extract content if not already provided
        let pageContent = page.content;
        let pageTitle = page.title;
        let suggestedCategory = page.suggestedCategory;
        let tags = ["website", "ingested"];

        if (!pageContent || pageContent.length < 20) {
          const fetchRes = await safeFetch(page.url, { timeoutMs: 12000 });
          if (!fetchRes.ok) {
            throw new Error(`Failed to fetch ${page.url} (HTTP ${fetchRes.status})`);
          }
          const extracted = ContentExtractor.extract(fetchRes.html, page.url);
          pageContent = extracted.content;
          pageTitle = extracted.title || pageTitle;
          suggestedCategory = extracted.suggestedCategory || suggestedCategory;
          tags = extracted.tags;
        }

        if (!pageContent || pageContent.trim().length === 0) {
          pageContent = `Web content from ${page.url}. No textual body could be extracted.`;
        }

        // 3. Duplicate Handling Check
        const existingDocs = await documentsRepository.list(organizationId);
        const existingMatchingDoc = existingDocs.find(d => {
          const docUrl = (d.metadata as any)?.url;
          return docUrl && (docUrl === page.url || docUrl === page.url.replace(/\/$/, ""));
        });

        if (existingMatchingDoc) {
          if (duplicateHandling === "skip") {
            skippedCount++;
            continue;
          } else if (duplicateHandling === "replace") {
            // Delete old chunks and update existing document
            await chunksRepository.deleteByDocument(existingMatchingDoc.id);
            await documentsRepository.update(existingMatchingDoc.id, organizationId, {
              name: `${pageTitle} (Web)`,
              status: "completed",
              metadata: {
                ...(existingMatchingDoc.metadata as Record<string, any>),
                url: page.url,
                lastCrawledAt: new Date().toISOString(),
                summary: pageContent.slice(0, 140) + "...",
                tags,
              },
            });

            // Re-chunk and insert
            const chunks = chunkingService.splitText(pageContent);
            const chunkPayload = chunks.map(chunk => ({
              organizationId,
              documentId: existingMatchingDoc.id,
              content: chunk.content,
              chunkIndex: chunk.chunkIndex,
              tokenCount: chunk.tokenCount,
              metadata: { url: page.url, title: pageTitle },
            }));

            if (chunkPayload.length > 0) {
              await chunksRepository.createMany(chunkPayload);
              totalChunksCreated += chunkPayload.length;
            }

            importedCount++;
            continue;
          }
        }

        // 4. Match Category ID
        const matchedCategory = categoriesList.find(c => c.name.toLowerCase() === (suggestedCategory || "").toLowerCase());
        const categoryId = matchedCategory?.id || null;

        // 5. Create Document Record
        const doc = await documentsRepository.create({
          organizationId,
          sourceId: source.id,
          categoryId,
          name: `${pageTitle} (Web)`,
          fileType: "website",
          status: "completed",
          metadata: {
            url: page.url,
            path: page.path,
            title: pageTitle,
            lastCrawledAt: new Date().toISOString(),
            summary: pageContent.slice(0, 140) + "...",
            tags,
            priority: "medium",
            visibility: "public",
          },
        });

        // 6. Split into Chunks and Persist
        const chunks = chunkingService.splitText(pageContent);
        const chunkPayload = chunks.map(chunk => ({
          organizationId,
          documentId: doc.id,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          tokenCount: chunk.tokenCount,
          metadata: { url: page.url, title: pageTitle },
        }));

        if (chunkPayload.length > 0) {
          await chunksRepository.createMany(chunkPayload);
          totalChunksCreated += chunkPayload.length;
        }

        importedCount++;
      } catch (err: any) {
        failedCount++;
        failedPagesList.push({
          url: page.url,
          error: err?.message || "Failed to ingest page",
        });
        console.error(`[Website Ingestion] Error processing ${page.url}:`, err);
      }
    }

    // 7. Finalize Import Status
    const startTime = (importRecord.metadata as any)?.startTime || Date.now();
    const durationMs = Date.now() - startTime;
    const finalStatus = failedCount > 0 && importedCount > 0 ? "completed" : failedCount === totalPages ? "failed" : "completed";

    await importsRepository.update(importId, {
      status: finalStatus,
      pagesScraped: importedCount,
      metadata: {
        ...(importRecord.metadata as Record<string, any>),
        stage: finalStatus === "failed" ? "Ingestion Failed" : "Completed Ingestion",
        progress: 100,
        durationMs,
        stats: {
          imported: importedCount,
          skipped: skippedCount,
          failed: failedCount,
          totalChunksCreated,
          failedPagesList,
        },
      },
    });
  }
}
