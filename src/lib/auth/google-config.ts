import fs from "fs";
import path from "path";

let cachedConfig: { clientId: string; clientSecret: string } | null = null;

function loadEnvFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const eqIdx = trimmed.indexOf("=");
          const key = trimmed.substring(0, eqIdx).trim();
          let val = trimmed.substring(eqIdx + 1).trim();
          // Strip surrounding quotes
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch (err) {
    // Ignore filesystem read errors
  }
}

export function getGoogleOAuthConfig() {
  if (cachedConfig && cachedConfig.clientId && cachedConfig.clientSecret) {
    return cachedConfig;
  }

  // 1. Direct process.env check
  let clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // 2. If missing, dynamically reload from .env.local and .env
  if (!clientId || !clientSecret) {
    const cwd = process.cwd();
    loadEnvFile(path.join(cwd, ".env.local"));
    loadEnvFile(path.join(cwd, ".env"));
    loadEnvFile(path.join(cwd, ".env.production"));
    loadEnvFile(path.join(cwd, ".env.development"));

    clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  }

  if (clientId && clientSecret) {
    cachedConfig = { clientId, clientSecret };
    return cachedConfig;
  }

  return {
    clientId: clientId || "",
    clientSecret: clientSecret || "",
  };
}
