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

  // 1. Direct process.env check with common aliases
  let clientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.AUTH_GOOGLE_ID ||
    process.env.GOOGLE_ID;

  let clientSecret =
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.GOOGLE_SECRET ||
    process.env.AUTH_GOOGLE_SECRET ||
    process.env.GOOGLE_AUTH_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET_KEY;

  // 2. If missing, dynamically reload from local environment files
  if (!clientId || !clientSecret) {
    const cwd = process.cwd();
    loadEnvFile(path.join(cwd, ".env.local"));
    loadEnvFile(path.join(cwd, ".env"));
    loadEnvFile(path.join(cwd, ".env.production"));
    loadEnvFile(path.join(cwd, ".env.development"));

    clientId =
      clientId ||
      process.env.GOOGLE_CLIENT_ID ||
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      process.env.AUTH_GOOGLE_ID ||
      process.env.GOOGLE_ID;

    clientSecret =
      clientSecret ||
      process.env.GOOGLE_CLIENT_SECRET ||
      process.env.GOOGLE_SECRET ||
      process.env.AUTH_GOOGLE_SECRET ||
      process.env.GOOGLE_AUTH_SECRET ||
      process.env.GOOGLE_CLIENT_SECRET_KEY;
  }

  if (clientId && clientSecret) {
    cachedConfig = { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
    return cachedConfig;
  }

  return {
    clientId: (clientId || "").trim(),
    clientSecret: (clientSecret || "").trim(),
  };
}

export function getGoogleRedirectUri(requestHost?: string | null): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/auth/callback/google`;
  }
  const host = requestHost || "operator-azure.vercel.app";
  const proto = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  return `${proto}://${host}/api/auth/callback/google`;
}
