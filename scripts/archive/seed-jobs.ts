import "dotenv/config";
import { db } from "../src/server/db";
import {
  organizations,
  knowledgeCategories,
  knowledgeDocuments,
  documentProcessingJobs,
  knowledgeChunks,
  faqItems,
  services,
  serviceCategories,
  businessSettings
} from "../src/server/db/schema";
import { sql, eq } from "drizzle-orm";

async function main() {
  console.log("🌱 Seeding document processing queue, chunks, and FAQs data...");
  try {
    // 1. Get first organization
    const org = await db.query.organizations.findFirst();
    if (!org) {
      throw new Error("No organization found. Please run seed script first.");
    }
    const orgId = org.id;
    console.log(`Using Organization: ${org.name} (${orgId})`);

    // 3. Clear existing categories, documents, chunks, jobs, and FAQs first to have a clean board
    console.log("Clearing existing categories, documents, chunks, jobs, and FAQs...");
    await db.execute(sql`TRUNCATE TABLE "document_processing_jobs" CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE "knowledge_chunks" CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE "faq_items" CASCADE;`);
    await db.execute(sql`DELETE FROM "knowledge_documents" WHERE "organization_id" = ${orgId};`);
    await db.execute(sql`DELETE FROM "knowledge_categories" WHERE "organization_id" = ${orgId};`);

    // 2. Create categories
    const [generalCategory] = await db.insert(knowledgeCategories).values({
      organizationId: orgId,
      name: "General Salon Operations",
      slug: "general-salon-operations",
      description: "Standard operating procedures and templates"
    }).returning();

    const [pricingCategory] = await db.insert(knowledgeCategories).values({
      organizationId: orgId,
      name: "Billing & Pricing Policies",
      slug: "billing-pricing-policies",
      description: "Details about payments, cancellations, and membership plans"
    }).returning();

    const category = generalCategory;
    console.log(`Seeded Categories: General (${generalCategory.id}), Pricing (${pricingCategory.id})`);

    // 4. Seed documents & processing jobs for each status
    const jobsData = [
      {
        name: "Glow & Grace — Staff Welcome Guide.pdf",
        docStatus: "queued",
        jobStatus: "queued",
        logs: "Waiting in processing queue for worker resource assignment...",
        chunks: []
      },
      {
        name: "Salon Inventory & Backbar Audit.xlsx",
        docStatus: "processing",
        jobStatus: "processing",
        logs: "Starting processing job...\nUploading source document to Vercel Blob storage...",
        chunks: []
      },
      {
        name: "Esthetician Training Manual 2025.docx",
        docStatus: "processing",
        jobStatus: "processing",
        logs: "Starting processing job...\nSource document uploaded successfully.\nExtracting text content from DOCX file...",
        chunks: []
      },
      {
        name: "Glow & Grace — Cleanliness Protocols.txt",
        docStatus: "completed",
        jobStatus: "completed",
        logs: "Indexing completed.\nIngestion pipeline finished successfully!",
        chunks: [
          "Cleanliness Protocols and Hygiene Policies. Pets and non-service dogs are strictly prohibited from entering the salon floor or treatment rooms due to state board sanitary regulations. Certified service animals with proper harness are allowed.",
          "Esthetician hygiene standards: Wipe down all beds and tools with disinfectant wipes after every service. Handwashing is required before and after styling or massage sessions."
        ]
      },
      {
        name: "Treatment Room Booking Instructions.pdf",
        docStatus: "completed",
        jobStatus: "completed",
        logs: "Indexing completed.\nIngestion pipeline finished successfully!",
        chunks: [
          "Treatment Room Booking Guidelines. To reserve a facial treatment room, log into the booking console, select the esthetician room tier, and reserve the slot. Double booking of esthetician blocks is not permitted.",
          "Estheticians must clean and vacate rooms 10 minutes prior to the end of their scheduled block to ensure smooth client transitions."
        ]
      },
      {
        name: "Glow & Grace — Cancellation & No-Show Fees.pdf",
        docStatus: "completed",
        jobStatus: "completed",
        logs: "Indexing completed.\nIngestion pipeline finished successfully!",
        chunks: [
          "Cancellation and No-Show Policies. Appointments cancelled with less than 24 hours notice are subject to a cancellation fee equal to 50% of the reserved service price. No-shows will be charged 100% of the service price.",
          "For group bookings (bridal parties, spa days), cancellation must be made at least 7 days in advance to avoid a 50% charge to the card on file."
        ]
      },
      {
        name: "Bridal Package Service Tier Guidelines.pdf",
        docStatus: "completed",
        jobStatus: "completed",
        logs: "Indexing completed.\nIngestion pipeline finished successfully!",
        chunks: [
          "Bridal Service Packages. We offer customized hair and makeup styling for bridal parties. Tier 1 covers bride-only styling. Tier 2 covers bride plus up to 4 bridesmaids. Tiers must be selected at least 30 days prior to the wedding.",
          "Bridal trials must be booked separately. Payment is non-refundable and due at the end of the trial session."
        ]
      },
      {
        name: "Glow & Grace — Classic Pedicure Steps.txt",
        docStatus: "completed",
        jobStatus: "completed",
        logs: "Indexing completed.\nIngestion pipeline finished successfully!",
        chunks: [
          "Classic Pedicure Steps. Start by soaking feet in warm water with lavender salts. Clip and file nails. Apply cuticle softener and trim. Massage feet with hydration lotion. Finish with double-layer polish application.",
          "Drying times: Clients should wait at least 15 minutes before putting on closed-toe shoes. Flip-flops are highly recommended post-pedicure."
        ]
      },
      {
        name: "Vendor Agreement Template (Corrupted).pdf",
        docStatus: "failed",
        jobStatus: "failed",
        logs: "Starting processing job...\nSource document uploaded.\nError during extraction stage:\nPDF parsing failed. The file header is corrupted or not a valid PDF document.",
        chunks: []
      }
    ];

    for (const data of jobsData) {
      // Create Document
      const [doc] = await db.insert(knowledgeDocuments).values({
        organizationId: orgId,
        categoryId: category.id,
        name: data.name,
        fileType: data.name.split('.').pop() || "txt",
        fileSize: 1024 * 25, // mock 25 KB
        status: data.docStatus,
        isArchived: false,
        metadata: {}
      }).returning();

      // Create Job
      await db.insert(documentProcessingJobs).values({
        organizationId: orgId,
        documentId: doc.id,
        status: data.jobStatus,
        logs: data.logs,
        startedAt: data.jobStatus !== "queued" ? new Date() : null,
        completedAt: data.jobStatus === "completed" || data.jobStatus === "failed" ? new Date() : null,
        duration: data.jobStatus === "completed" ? 3420 : null
      });

      // Insert Chunks if any
      if (data.chunks.length > 0) {
        for (let i = 0; i < data.chunks.length; i++) {
          await db.insert(knowledgeChunks).values({
            organizationId: orgId,
            documentId: doc.id,
            content: data.chunks[i],
            chunkIndex: i,
            tokenCount: Math.ceil(data.chunks[i].split(" ").length * 1.3),
            metadata: {}
          });
        }
      }

      console.log(`Seeded doc/job: ${data.name} [Status: ${data.jobStatus}] with ${data.chunks.length} chunks`);
    }

    // 5. Seed FAQ Items
    const faqsData = [
      {
        question: "Can I bring my pet or dog to the salon?",
        answer: "No, pets and non-service dogs are strictly prohibited inside the salon due to health department and sanitary regulations. Only certified service animals with proper documentation are permitted on the styling floor.",
        category: "Policies"
      },
      {
        question: "Do you accept Apple Pay?",
        answer: "Yes, we accept Apple Pay, Google Pay, contactless debit/credit cards, and cash at checkout.",
        category: "Payments"
      },
      {
        question: "What is your late cancellation policy fee?",
        answer: "Appointments cancelled with less than 24 hours notice are subject to a cancellation fee equal to 50% of the scheduled service price. No-shows will be charged 100% of the reserved service.",
        category: "Booking"
      },
      {
        question: "How do I take care of my skin after a chemical peel?",
        answer: "Peeling and mild redness are common after chemical peels. Keep the skin hydrated using gentle, non-scented moisturizers, avoid picking or peeling skin manually, and apply daily SPF 30+ sunscreen.",
        category: "Aftercare"
      },
      {
        question: "Do you offer special wedding and bridal party packages?",
        answer: "Yes, we offer custom bridal and wedding party packages for hair, makeup, and pedicure treatments. Contact our bridal coordinator at booking@glowandgracesalon.com to check availability and book a trial.",
        category: "Bridal"
      }
    ];

    for (let i = 0; i < faqsData.length; i++) {
      await db.insert(faqItems).values({
        organizationId: orgId,
        question: faqsData[i].question,
        answer: faqsData[i].answer,
        category: faqsData[i].category,
        isActive: true,
        order: i
      });
      console.log(`Seeded FAQ: ${faqsData[i].question}`);
    }

    // 6. Ensure at least 3 services exist for the active organization to get 100% health
    const existingServices = await db.query.services.findMany({
      where: (table, { eq }) => eq(table.organizationId, orgId)
    });

    if (existingServices.length < 3) {
      console.log("Seeding default services to satisfy health check...");
      const [serviceCat] = await db.insert(serviceCategories).values({
        organizationId: orgId,
        name: "General Services"
      }).returning();

      await db.insert(services).values([
        {
          organizationId: orgId,
          categoryId: serviceCat.id,
          name: "Classic Haircut",
          duration: 30,
          price: "35.00",
          isActive: true
        },
        {
          organizationId: orgId,
          categoryId: serviceCat.id,
          name: "Beard Grooming",
          duration: 20,
          price: "20.00",
          isActive: true
        },
        {
          organizationId: orgId,
          categoryId: serviceCat.id,
          name: "Shave & Towel",
          duration: 30,
          price: "25.00",
          isActive: true
        }
      ]);
      console.log("✅ Seeded default services!");
    }

    // 7. Ensure business settings has websiteImportUrl set to complete the dashboard checklist
    const existingSettings = await db.query.businessSettings.findFirst({
      where: (table, { eq }) => eq(table.organizationId, orgId)
    });

    if (existingSettings) {
      await db.update(businessSettings)
        .set({ websiteImportUrl: "https://glowandgracesalon.com" })
        .where(eq(businessSettings.organizationId, orgId));
      console.log("✅ Updated existing business settings websiteImportUrl!");
    } else {
      await db.insert(businessSettings).values({
        organizationId: orgId,
        websiteImportUrl: "https://glowandgracesalon.com",
        businessHours: {
          monday: { open: "09:00", close: "17:00" },
          tuesday: { open: "09:00", close: "17:00" },
          wednesday: { open: "09:00", close: "17:00" },
          thursday: { open: "09:00", close: "17:00" },
          friday: { open: "09:00", close: "17:00" },
          saturday: { open: "closed", close: "closed" },
          sunday: { open: "closed", close: "closed" }
        }
      });
      console.log("✅ Inserted new business settings with websiteImportUrl!");
    }

    console.log("✅ Seeding of document processing queue, chunks, and FAQs data complete!");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
