import fs from "fs";
import postgres from "postgres";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const env = {
  ...loadEnvFile(".env"),
  ...loadEnvFile(".env.local"),
};

const tokenArg = process.argv[2] || env.META_ACCESS_TOKEN;
const phoneId = env.META_PHONE_NUMBER_ID;

if (!tokenArg) {
  console.error("Usage: node scripts/update-whatsapp-token.mjs <new_meta_token>");
  process.exit(1);
}

const cleanToken = tokenArg.trim().replace(/^["']|["']$/g, "");
const cleanPhoneId = (phoneId || "").trim().replace(/^["']|["']$/g, "");

const sql = postgres(env.DATABASE_URL);

async function run() {
  try {
    console.log("Updating channel_connections in database for phoneId:", cleanPhoneId);
    const existing = await sql`SELECT * FROM channel_connections WHERE external_id = ${cleanPhoneId}`;
    if (existing.length === 0) {
      console.log("No existing channel_connections row found with externalId:", cleanPhoneId);
      return;
    }

    const row = existing[0];
    const updatedCreds = {
      ...(row.credentials || {}),
      accessToken: cleanToken,
      phoneId: cleanPhoneId,
    };

    await sql`
      UPDATE channel_connections 
      SET credentials = ${sql.json(updatedCreds)}, updated_at = NOW() 
      WHERE id = ${row.id}
    `;

    console.log("Successfully updated channel_connections with fresh token!");
  } catch (err) {
    console.error("Update failed:", err);
  } finally {
    await sql.end();
  }
}
run();

