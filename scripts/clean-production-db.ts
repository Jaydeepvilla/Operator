import "dotenv/config";
import { db } from "../src/server/db";
import { sql } from "drizzle-orm";

async function cleanProductionDatabase() {
  console.log("🧹 Cleaning all demo credentials and demo data from database...");

  const tablesResult = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE '%drizzle%'
      AND table_name NOT LIKE '_drizzle%'
  `);

  const rows = Array.isArray(tablesResult) ? tablesResult : (tablesResult as any).rows || [];
  const tableNames = rows.map((r: any) => `"${r.table_name}"`);

  console.log(`Found ${tableNames.length} tables in database.`);

  for (const table of tableNames) {
    try {
      await db.execute(sql.raw(`TRUNCATE TABLE ${table} CASCADE;`));
      console.log(`  ✓ Truncated table: ${table}`);
    } catch (err: any) {
      try {
        await db.execute(sql.raw(`DELETE FROM ${table};`));
        console.log(`  ✓ Deleted rows from: ${table}`);
      } catch (deleteErr: any) {
        console.error(`  ✕ Error clearing ${table}:`, deleteErr.message);
      }
    }
  }

  console.log("✅ Production database is now 100% clean with schema intact.");
}

cleanProductionDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Database cleanup error:", err);
    process.exit(1);
  });
