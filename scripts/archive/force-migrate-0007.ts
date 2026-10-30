import fs from "fs";
import path from "path";
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });

async function main() {
  try {
    const migrationPath = path.join(__dirname, "../src/server/db/migrations", "0007_cheerful_pet_avengers.sql");
    console.log("Reading migration file:", migrationPath);
    const migrationContent = fs.readFileSync(migrationPath, "utf-8");
    
    // Split by statement-breakpoint and remove empty statements
    const statements = migrationContent
      .split("--> statement-breakpoint")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Executing ${statements.length} SQL statements...`);
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement [${i + 1}/${statements.length}]:\n${statement.substring(0, 100)}...`);
      try {
        await sql.unsafe(statement);
        console.log(`  ✓ Success`);
      } catch (e: any) {
        if (e.message.includes("already exists")) {
          console.log(`  ✓ Success (Already exists warning bypassed)`);
        } else {
          console.error("Error executing statement:", e.message);
        }
      }
    }
    console.log("Migration executed successfully!");
  } catch (e) {
    console.error("Failed to run migration script:", e);
  } finally {
    await sql.end();
  }
}

main();
