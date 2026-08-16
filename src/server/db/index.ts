import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@127.0.0.1:5432/nexx_receptionist";

const isRemoteDb =
  connectionString.includes("sslmode=require") ||
  connectionString.includes("cockroachlabs.cloud") ||
  connectionString.includes("neon.tech") ||
  connectionString.includes("supabase.co") ||
  connectionString.includes("aws.connect.psdb.cloud");

// Disable prepared statements for CockroachDB/pgBouncer/Neon compatibility
const pgOptions = {
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
