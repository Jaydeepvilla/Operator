import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@127.0.0.1:5432/operator";

const isRemoteDb =
  connectionString.includes("sslmode=require") ||
  connectionString.includes("cockroachlabs.cloud") ||
  connectionString.includes("neon.tech") ||
  connectionString.includes("supabase.co") ||
  connectionString.includes("aws.connect.psdb.cloud");

import dns from "node:dns";

// Resolve Neon serverless pooler hostnames via public DNS resolvers when native OS getaddrinfo fails
try {
  dns.setDefaultResultOrder("ipv4first");
  const resolver = new dns.promises.Resolver();
  resolver.setServers(["8.8.8.8", "1.1.1.1"]);

  const originalLookup = dns.lookup;
  dns.lookup = ((hostname: string, options: any, callback: any) => {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    if (typeof hostname === "string" && hostname.includes("neon.tech")) {
      resolver
        .resolve4(hostname)
        .then((addresses) => {
          if (addresses && addresses.length > 0) {
            if (options && options.all) {
              callback(null, addresses.map((addr) => ({ address: addr, family: 4 })));
            } else {
              callback(null, addresses[0], 4);
            }
          } else {
            originalLookup(hostname, options, callback);
          }
        })
        .catch(() => {
          originalLookup(hostname, options, callback);
        });
      return;
    }
    return originalLookup(hostname, options, callback);
  }) as typeof dns.lookup;
} catch {}

// Disable prepared statements for CockroachDB/pgBouncer/Neon compatibility
const pgOptions: any = {
  max: isRemoteDb ? 3 : 10,
  idle_timeout: 10,
  connect_timeout: 10,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : undefined,
  prepare: false, // Disable prepared statements
};

declare global {
  // eslint-disable-next-line no-var
  var globalClient: any;
}

let client;

if (process.env.NODE_ENV === "production") {
  client = postgres(connectionString, pgOptions);
} else {
  if (!global.globalClient) {
    global.globalClient = postgres(connectionString, pgOptions);
  }
  client = global.globalClient;
}

export const db = drizzle(client, { schema });
export type DbClient = typeof db;
