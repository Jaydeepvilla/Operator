import { sourcesRepository } from "../repositories/sources";
import { documentsRepository } from "../repositories/documents";
import { chunksRepository } from "../repositories/chunks";
import { chunkingService } from "./chunking";

export const syncService = {
  /**
   * Helper to retrieve or boot a system-level knowledge source
   */
  async getOrCreateSystemSource(organizationId: string, type: string, name: string) {
    let source = await sourcesRepository.getByType(organizationId, type);
    if (!source) {
      source = await sourcesRepository.create({
        organizationId,
        name,
        type,
        isActive: true,
        metadata: { system: true },
      });
    }
    return source;
  },

  /**
   * Syncs an FAQ item into the Knowledge Base
   */
  async syncFAQ(
    organizationId: string,
    faqId: string,
    question: string,
    answer: string,
    isActive: boolean,
    isDeleted = false
  ) {
    try {
      const source = await this.getOrCreateSystemSource(organizationId, "faq", "System FAQs");
      const docName = `FAQ-${faqId}`;
      const existingDoc = await documentsRepository.getBySourceAndName(organizationId, source.id, docName);

      if (isDeleted || !isActive) {
        if (existingDoc) {
          // Clean chunks and delete document
          await chunksRepository.deleteByDocument(existingDoc.id);
          await documentsRepository.delete(existingDoc.id, organizationId);
        }
        return;
      }

      const content = `Question: ${question}\nAnswer: ${answer}`;
      let documentId: string;

      if (existingDoc) {
        await documentsRepository.update(existingDoc.id, organizationId, {
          status: "completed",
          metadata: { faqId, updatedAt: new Date().toISOString() },
        });
        documentId = existingDoc.id;
        // Wipe old chunks
        await chunksRepository.deleteByDocument(documentId);
      } else {
        const doc = await documentsRepository.create({
          organizationId,
          sourceId: source.id,
          name: docName,
          fileType: "faq",
          status: "completed",
          metadata: { faqId, createdAt: new Date().toISOString() },
        });
        documentId = doc.id;
      }

      // Generate new chunks
      const chunks = chunkingService.splitText(content);
      const insertPayload = chunks.map((chunk) => ({
        organizationId,
        documentId,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        tokenCount: chunk.tokenCount,
        metadata: { faqId },
      }));

      await chunksRepository.createMany(insertPayload);
    } catch (error) {
      console.error(`[Sync] Failed to sync FAQ ${faqId}:`, error);
    }
  },

  /**
   * Syncs a Service item into the Knowledge Base
   */
  async syncServiceItem(
    organizationId: string,
    serviceId: string,
    name: string,
    description: string,
    duration: number,
    price: string,
    isActive: boolean,
    isDeleted = false
  ) {
    try {
      const source = await this.getOrCreateSystemSource(organizationId, "service", "System Services");
      const docName = `Service-${serviceId}`;
      const existingDoc = await documentsRepository.getBySourceAndName(organizationId, source.id, docName);

      if (isDeleted || !isActive) {
        if (existingDoc) {
          await chunksRepository.deleteByDocument(existingDoc.id);
          await documentsRepository.delete(existingDoc.id, organizationId);
        }
        return;
      }

      const content = `Service Name: ${name}\nDescription: ${description || "No description provided."}\nDuration: ${duration} minutes\nPrice: $${price}`;
      let documentId: string;

      if (existingDoc) {
        await documentsRepository.update(existingDoc.id, organizationId, {
          status: "completed",
          metadata: { serviceId, updatedAt: new Date().toISOString() },
        });
        documentId = existingDoc.id;
        await chunksRepository.deleteByDocument(documentId);
      } else {
        const doc = await documentsRepository.create({
          organizationId,
          sourceId: source.id,
          name: docName,
          fileType: "service",
          status: "completed",
          metadata: { serviceId, createdAt: new Date().toISOString() },
        });
        documentId = doc.id;
      }

      const chunks = chunkingService.splitText(content);
      const insertPayload = chunks.map((chunk) => ({
        organizationId,
        documentId,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        tokenCount: chunk.tokenCount,
        metadata: { serviceId },
      }));

      await chunksRepository.createMany(insertPayload);
    } catch (error) {
      console.error(`[Sync] Failed to sync Service ${serviceId}:`, error);
    }
  },

  /**
   * Syncs the Business Profile description and details into the Knowledge Base
   */
  async syncBusinessProfile(
    organizationId: string,
    name: string,
    description: string,
    email: string | null,
    phone: string | null,
    website: string | null,
    address: string | null
  ) {
    try {
      const source = await this.getOrCreateSystemSource(organizationId, "manual", "System Profile");
      const docName = "BusinessProfile";
      const existingDoc = await documentsRepository.getBySourceAndName(organizationId, source.id, docName);

      const content = `Business Profile:
Name: ${name}
Bio/Description: ${description || "No description provided."}
Contact Email: ${email || "Not provided"}
Phone Number: ${phone || "Not provided"}
Website: ${website || "Not provided"}
Physical Address: ${address || "Not provided"}`;

      let documentId: string;

      if (existingDoc) {
        await documentsRepository.update(existingDoc.id, organizationId, {
          status: "completed",
          metadata: { profile: true, updatedAt: new Date().toISOString() },
        });
        documentId = existingDoc.id;
        await chunksRepository.deleteByDocument(documentId);
      } else {
        const doc = await documentsRepository.create({
          organizationId,
          sourceId: source.id,
          name: docName,
          fileType: "manual",
          status: "completed",
          metadata: { profile: true, createdAt: new Date().toISOString() },
        });
        documentId = doc.id;
      }

      const chunks = chunkingService.splitText(content);
      const insertPayload = chunks.map((chunk) => ({
        organizationId,
        documentId,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        tokenCount: chunk.tokenCount,
        metadata: { profile: true },
      }));

      await chunksRepository.createMany(insertPayload);
    } catch (error) {
      console.error(`[Sync] Failed to sync Business Profile for ${organizationId}:`, error);
    }
  },

  /**
   * Syncs Qualification Flow questions list into the Knowledge Base
   */
  async syncQualificationFlows(organizationId: string, questions: { question: string; answerType: string; options: string[] | null; isRequired: boolean }[]) {
    try {
      const source = await this.getOrCreateSystemSource(organizationId, "manual", "System Flows");
      const docName = "QualificationFlows";
      const existingDoc = await documentsRepository.getBySourceAndName(organizationId, source.id, docName);

      if (questions.length === 0) {
        if (existingDoc) {
          await chunksRepository.deleteByDocument(existingDoc.id);
          await documentsRepository.delete(existingDoc.id, organizationId);
        }
        return;
      }

      let content = "Prospect Lead Qualification Questions:\n";
      questions.forEach((q, idx) => {
        const opts = q.options && q.options.length > 0 ? ` (Options: ${q.options.join(", ")})` : "";
        content += `${idx + 1}. ${q.question} [Type: ${q.answerType}${opts}] [Required: ${q.isRequired}]\n`;
      });

      let documentId: string;

      if (existingDoc) {
        await documentsRepository.update(existingDoc.id, organizationId, {
          status: "completed",
          metadata: { flows: true, updatedAt: new Date().toISOString() },
        });
        documentId = existingDoc.id;
        await chunksRepository.deleteByDocument(documentId);
      } else {
        const doc = await documentsRepository.create({
          organizationId,
          sourceId: source.id,
          name: docName,
          fileType: "manual",
          status: "completed",
          metadata: { flows: true, createdAt: new Date().toISOString() },
        });
        documentId = doc.id;
      }

      const chunks = chunkingService.splitText(content);
      const insertPayload = chunks.map((chunk) => ({
        organizationId,
        documentId,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        tokenCount: chunk.tokenCount,
        metadata: { flows: true },
      }));

      await chunksRepository.createMany(insertPayload);
    } catch (error) {
      console.error(`[Sync] Failed to sync Qualification Flows for ${organizationId}:`, error);
    }
  },
};
