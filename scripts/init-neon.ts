import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config();

async function initNeon() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL missing");
  }

  const sql = postgres(url, { ssl: { rejectUnauthorized: false } });

  console.log("Connecting to Neon PostgreSQL...");
  await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
  console.log("✅ pgvector extension enabled successfully!");
  await sql.end();
  process.exit(0);
}

initNeon().catch((err) => {
  console.error("Init failed:", err);
  process.exit(1);
});
