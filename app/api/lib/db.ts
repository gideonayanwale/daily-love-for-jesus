// ==============================================================================
// Daily Love For Jesus - Dual Database Manager
// Neon (primary fast serverless) + Supabase PostgreSQL (auth/fallback)
// ==============================================================================

import { env } from "./env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

// ─── Neon Serverless DB (Primary - fast cold starts, HTTP API) ─────────────────
let neonInstance: any = null;

export function getNeonDb(): any {
  if (neonInstance) return neonInstance;

  if (!env.neonDatabaseUrl) {
    return null;
  }

  // Neon supports standard PostgreSQL wire protocol.
  // Using postgres.js provides fast pooled connections without requiring extra SDKs.
  try {
    const postgres = require("postgres");
    const { drizzle } = require("drizzle-orm/postgres-js");
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

export function getSupabaseDb(): any {
  if (supabaseInstance) return supabaseInstance;

  try {
    const postgres = require("postgres");
    const { drizzle } = require("drizzle-orm/postgres-js");

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
 *   3. Dev stub proxy (graceful no-op for local dev without any DB)
 */
export function getDb(): any {
  const neon = getNeonDb();
  if (neon) return neon;

  const supabase = getSupabaseDb();
  if (supabase) return supabase;

  // Graceful dev stub — returns empty arrays / success stubs
  console.warn("[db] ⚠️ No database connected — using dev stub");
  return createDevStub();
}

function createDevStub(): any {
  return new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === "query") {
          return new Proxy(
            {},
            { get: () => () => Promise.resolve([]) }
          );
        }
        return () => ({
          from: () => ({
            where: () => ({
              orderBy: () => ({ limit: () => Promise.resolve([]) }),
              limit: () => Promise.resolve([]),
            }),
            orderBy: () => ({ limit: () => Promise.resolve([]) }),
            limit: () => Promise.resolve([]),
          }),
          values: () => ({
            returning: () => Promise.resolve([{ id: 1 }]),
            onConflictDoUpdate: () => Promise.resolve([{ id: 1 }]),
          }),
          set: () => ({ where: () => Promise.resolve({ rowCount: 1 }) }),
          where: () => Promise.resolve({ rowCount: 1 }),
        });
      },
    }
  );
}
