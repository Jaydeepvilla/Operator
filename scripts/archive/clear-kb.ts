import "dotenv/config";
import { db } from "../src/server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("🧹 Starting Knowledge Base cleanup...");
  try {
    const kbTables = [
      "vector_embeddings",
      "knowledge_chunks",
      "document_processing_jobs",
      "knowledge_document_tags",
      "knowledge_documents",
      "knowledge_sources",
      "knowledge_categories",
      "website_imports",
      "faq_items"
    ];

    for (const table of kbTables) {
      console.log(`Clearing table "${table}"...`);
      await db.execute(sql.raw(`TRUNCATE TABLE "${table}" CASCADE;`));
    }
    console.log("✅ Knowledge Base tables cleared successfully!");
  } catch (error) {
    console.error("❌ Error clearing Knowledge Base tables:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
