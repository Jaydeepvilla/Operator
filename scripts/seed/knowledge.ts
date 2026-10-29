import { db } from "../../src/server/db";
import {
  knowledgeCategories,
  knowledgeSources,
  knowledgeDocuments,
  documentProcessingJobs,
  knowledgeChunks
} from "../../src/server/db/schema";
import { ORG_ID } from "./business";

export async function seedKnowledge(): Promise<void> {
  console.log("📚 Seeding knowledge base for Operator Demo Salon...");

  // 1. Seed Categories
  const catPoliciesId = "aaaaaaaa-1111-1111-1111-111111111111";
  const catFaqsId = "aaaaaaaa-2222-2222-2222-222222222222";
  const catServicesId = "aaaaaaaa-3333-3333-3333-333333333333";

  await db.insert(knowledgeCategories).values([
    { 
      id: catPoliciesId, 
      organizationId: ORG_ID, 
      name: "Salon Booking Policies", 
      slug: "salon-booking-policies", 
      description: "Booking lead times, cancellation guidelines, and no-show policies." 
    },
    { 
      id: catFaqsId, 
      organizationId: ORG_ID, 
      name: "Customer FAQ Resources", 
      slug: "customer-faq-resources", 
      description: "Common questions regarding operating hours, appointments, and location." 
    },
    { 
      id: catServicesId, 
      organizationId: ORG_ID, 
      name: "Service Information & Guides", 
      slug: "service-information-guides", 
      description: "Haircut, styling, and herbal facial descriptions and durations." 
    }
  ]).onConflictDoNothing();

  // 2. Seed Knowledge Source
  const sourceWebId = "bbbbbbbb-1111-1111-1111-111111111111";
  const sourceUploadId = "bbbbbbbb-2222-2222-2222-222222222222";

  await db.insert(knowledgeSources).values([
    { id: sourceWebId, organizationId: ORG_ID, name: "Website Importer", type: "website", isActive: true, metadata: {} },
    { id: sourceUploadId, organizationId: ORG_ID, name: "Policy Manuals & Documents", type: "file", isActive: true, metadata: {} }
  ]).onConflictDoNothing();

  // 3. Seed Documents, Jobs, and Chunks
  const docId = "cccccccc-1001-1111-1111-111111111111";
  const jobId = "dddddddd-1001-1111-1111-111111111111";

  await db.insert(knowledgeDocuments).values({
    id: docId,
    organizationId: ORG_ID,
    categoryId: catPoliciesId,
    sourceId: sourceUploadId,
    name: "Operator Demo Salon — Policy and Service Handbook.pdf",
    fileType: "pdf",
    fileSize: 45000,
    filePath: "/documents/operator-demo-salon-handbook.pdf",
    status: "completed",
    metadata: { author: "Operator AI Staff", version: "2026.1" },
  }).onConflictDoUpdate({
    target: knowledgeDocuments.id,
    set: {
      name: "Operator Demo Salon — Policy and Service Handbook.pdf",
      status: "ready",
      updatedAt: new Date(),
    }
  });

  await db.insert(documentProcessingJobs).values({
    id: jobId,
    organizationId: ORG_ID,
    documentId: docId,
    status: "completed",
    startedAt: new Date(),
    completedAt: new Date(),
    logs: "Processed successfully",
  }).onConflictDoNothing();

  const chunks = [
    {
      id: "eeeeeeee-1001-1111-1111-111111111111",
      chunkIndex: 0,
      content: "Operator Demo Salon Services: We offer precision Haircut (30 minutes duration, priced at INR 500) including clarifying wash; Executive Hair Styling (45 minutes duration, priced at INR 800) with argan oil styling; and our signature Rejuvenating Herbal Facial (60 minutes duration, priced at INR 1500) featuring botanical cleanse and restorative massage.",
      tokenCount: 65,
    },
    {
      id: "eeeeeeee-1002-1111-1111-111111111111",
      chunkIndex: 1,
      content: "Business Operating Hours: Operator Demo Salon is open Tuesday through Friday from 10:00 AM to 8:00 PM, Saturday from 9:00 AM to 9:00 PM, and Sunday from 10:00 AM to 6:00 PM. We are closed every Monday for deep sanitization and staff rest.",
      tokenCount: 52,
    },
    {
      id: "eeeeeeee-1003-1111-1111-111111111111",
      chunkIndex: 2,
      content: "Booking Policy: Appointments can be booked up to 14 days in advance. A minimum of 2 hours advance notice is required for online and chat bookings.",
      tokenCount: 30,
    },
    {
      id: "eeeeeeee-1004-1111-1111-111111111111",
      chunkIndex: 3,
      content: "Cancellation Policy and No-Show Policy: Guests may cancel or reschedule their appointment free of charge up to 2 hours before the scheduled appointment start time. Late cancellations or no-shows without 2 hours prior notice may be subject to a 20% demonstration fee.",
      tokenCount: 48,
    },
    {
      id: "eeeeeeee-1005-1111-1111-111111111111",
      chunkIndex: 4,
      content: "Location and Contact Information: Operator Demo Salon is located at Plot 42, Bandra Kurla Complex, Mumbai, Maharashtra 400051, India. Contact us via phone at +91 98765 43210 or email at concierge@operatordemosalon.test. Valet parking is available for all guests.",
      tokenCount: 46,
    }
  ];

  for (const chunk of chunks) {
    await db.insert(knowledgeChunks).values({
      id: chunk.id,
      organizationId: ORG_ID,
      documentId: docId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      tokenCount: chunk.tokenCount,
    }).onConflictDoUpdate({
      target: knowledgeChunks.id,
      set: {
        content: chunk.content,
        tokenCount: chunk.tokenCount,
        updatedAt: new Date(),
      }
    });
  }

  console.log(`✅ Seeded ${chunks.length} knowledge chunks for Operator Demo Salon`);
}
