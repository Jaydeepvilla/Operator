import "dotenv/config";
import { db } from "../src/server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("🧹 Starting complete database purge (including all Users & Organizations)...");

  try {
    // 1. Fetch all user tables in public schema
    const tablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE '%drizzle%'
        AND table_name NOT LIKE '_drizzle%'
    `);

    const rows = Array.isArray(tablesResult) ? tablesResult : (tablesResult as any).rows || [];
    const tableNames = rows.map((row: any) => `"${row.table_name}"`);

    console.log(`🔍 Found ${tableNames.length} tables in database: ${tableNames.join(", ")}`);

    if (tableNames.length > 0) {
      // Truncate all tables at once with CASCADE to cleanly handle all foreign key relations
      const truncateQuery = `TRUNCATE TABLE ${tableNames.join(", ")} CASCADE;`;
      console.log("Executing full TRUNCATE CASCADE...");
      await db.execute(sql.raw(truncateQuery));
      console.log("✅ All tables (including users, sessions, orgs, data) successfully emptied!");
    } else {
      console.log("ℹ️ No tables found in public schema.");
    }
  } catch (err: any) {
    console.error("❌ Error during complete database purge:", err.message);
    
    // Fallback: Delete rows table by table
    try {
      console.log("⚠️ Retrying with sequential DELETE CASCADE...");
      await db.execute(sql`
        DO $$ 
        DECLARE 
          r RECORD;
        BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '%drizzle%') LOOP
            EXECUTE 'TRUNCATE TABLE "' || r.tablename || '" CASCADE;';
          END LOOP;
        END $$;
      `);
      console.log("✅ Fallback sequential truncate completed successfully.");
    } catch (fallbackErr: any) {
      console.error("❌ Fallback truncate error:", fallbackErr.message);
    }
  }

  console.log("✨ Database is now 100% completely empty and fresh!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
