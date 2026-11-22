// ==============================================================================
// Daily Love For Jesus - Dual Database Manager
// Neon (primary fast serverless) + Supabase PostgreSQL (auth/fallback)
// ==============================================================================

// Priority chain: 1. Neon (NEON_DATABASE_URL) — preferred for fast serverless reads/writes and branching.
// 2. Supabase PostgreSQL (DATABASE_URL) — auth source-of-truth and fallback.
// 3. No stub fallback: requests fail if neither database is available.
//
// NOTE: All DB functions are async because the package is "type": "module" (ESM),
// so dynamic import() must be used instead of require(). Call sites must await getDb().

import { env } from "./env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

// ─── Neon Serverless DB (Primary - fast cold starts, HTTP API) ─────────────────
let neonInstance: any = null;

export async function getNeonDb(): Promise<any> {
  if (neonInstance) return neonInstance;

  if (!env.neonDatabaseUrl) {
    return null;
  }

  try {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const client = postgres(env.neonDatabaseUrl, {
      ssl: "require",
      max: 10,
    });
    neonInstance = drizzle(client, { schema: fullSchema });
    console.log("[db] ✅ Neon serverless DB connected via postgres.js");
    return neonInstance;
  } catch (err: any) {
    console.error("[db] Neon connection error:", err.message);
    return null;
  }
}

// ─── Supabase PostgreSQL DB (Fallback / Auth writes) ──────────────────────────
let supabaseInstance: any = null;

export async function getSupabaseDb(): Promise<any> {
  if (supabaseInstance) return supabaseInstance;
  if (!env.databaseUrl) return null;

  try {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");

    const isSupabase =
      env.databaseUrl.includes("supabase.co") ||
      env.databaseUrl.includes("pooler.supabase.com");

    const client = postgres(env.databaseUrl, {
      prepare: false, // Required for Supabase transaction pooler
      ssl: isSupabase ? "require" : undefined,
    });

    supabaseInstance = drizzle(client, { schema: fullSchema });
    console.log("[db] ✅ Supabase PostgreSQL DB connected");
  } catch (err: any) {
    console.warn("[db] Supabase Postgres unavailable:", err.message);
    supabaseInstance = null;
  }

  return supabaseInstance;
}

// ─── Primary DB Selector ────────────────────────────────────────────────────
/**
 * Returns the best available database:
 *   1. Neon (preferred — faster, serverless-native, branching)
 *   2. Supabase PostgreSQL (fallback)
 *   3. Throws when neither configured database is available.
 */
export async function getDb(): Promise<any> {
  const neon = await getNeonDb();
  if (neon) return neon;

  const supabase = await getSupabaseDb();
  if (supabase) return supabase;

  throw new Error("Database is unavailable. Configure NEON_DATABASE_URL or DATABASE_URL before serving application requests.");
}

