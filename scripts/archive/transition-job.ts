import "dotenv/config";
import { db } from "../src/server/db";
import { knowledgeDocuments, documentProcessingJobs } from "../src/server/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log("Usage: npx tsx scripts/transition-job.ts \"<Document Name>\" <new_status> \"<logs>\"");
    console.log("Statuses: queued, processing, chunking, embedding, completed, failed");
    process.exit(1);
  }

  const [docName, newStatus, logs] = args;

  try {
    // 1. Find the document
    const doc = await db.query.knowledgeDocuments.findFirst({
      where: (table, { eq }) => eq(table.name, docName)
    });

    if (!doc) {
      console.error(`❌ Error: Document named "${docName}" not found.`);
      process.exit(1);
    }

    // 2. Update Document Status
    await db.update(knowledgeDocuments)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(knowledgeDocuments.id, doc.id));

    // 3. Update associated Job status and logs
    await db.update(documentProcessingJobs)
      .set({
        status: newStatus,
        logs: logs,
        updatedAt: new Date(),
        startedAt: newStatus !== "queued" ? new Date() : null,
        completedAt: ["completed", "failed"].includes(newStatus) ? new Date() : null
      })
      .where(eq(documentProcessingJobs.documentId, doc.id));

    console.log(`✅ Successfully transitioned "${docName}" to status: ${newStatus}`);
  } catch (error) {
    console.error("❌ Error running transition:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
