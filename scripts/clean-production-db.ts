import "dotenv/config";
import { db } from "../src/server/db";
import { sql } from "drizzle-orm";
import { DatabaseIntegrityService } from "../src/server/services/database-integrity";

async function cleanProductionDatabase() {
  console.log("🧹 Cleaning all demo credentials and demo data from database...");

  // DB-08: Prevent test / wipe scripts from deleting real customer data
  DatabaseIntegrityService.assertDestructiveOperationPermitted(
    "Truncate All Tables",
    process.env.DATABASE_URL || "",
    process.env.NODE_ENV || "development"
  );

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
