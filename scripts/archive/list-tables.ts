/**
 * list-tables.ts — lists all tables that actually exist in the DB
 */
import { sql } from "drizzle-orm";
import { db } from "../src/server/db/index";

async function listTables() {
  const result = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  const rows = result as unknown as { table_name: string }[];
  console.log(`Found ${rows.length} tables:\n`);
  rows.forEach(r => console.log(" -", r.table_name));
  process.exit(0);
}

listTables().catch(e => { console.error(e); process.exit(1); });
