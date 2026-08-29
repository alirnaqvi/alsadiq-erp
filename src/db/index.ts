import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * One pool per process. Next.js hot-reloads modules in development, so the pool
 * is cached on globalThis to avoid opening a new one on every reload.
 * On Vercel each serverless instance keeps a small pool of its own, which is why
 * max is deliberately low — use a *pooled* connection string (Neon/Supabase
 * pooler) in production.
 */
const globalForDb = globalThis as unknown as { pool?: Pool };

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
}

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export { schema };
