// ==============================================================================
// Daily Love For Jesus - Database Sync Engine
// Bidirectional Supabase ↔ Neon PostgreSQL Sync
// ==============================================================================

import { getTableColumns, sql } from "drizzle-orm";
import { getSupabaseDb, getNeonDb } from "./db";
import * as schema from "@db/schema";

// ──────────────────────────────────────────────────────────────────────────────
// Table sync definitions — controls which tables sync from which direction
// ──────────────────────────────────────────────────────────────────────────────

type SyncDirection = "supabase→neon" | "neon→supabase" | "bidirectional";

interface TableSyncConfig {
  table: any;           // Drizzle table reference
  name: string;         // Human-readable name
  direction: SyncDirection;
  conflictColumn: string; // Column used for upsert conflict resolution
  updatedAtColumn?: string; // Used to detect changes (if present)
}

const SYNC_TABLES: TableSyncConfig[] = [
  {
    table: schema.users,
    name: "users",
    direction: "supabase→neon", // Auth truth lives in Supabase
    conflictColumn: "id",
    updatedAtColumn: "updatedAt",
  },
  {
    table: schema.devotionals,
    name: "devotionals",
    direction: "bidirectional",
    conflictColumn: "id",
    updatedAtColumn: "updated_at",
  },
  {
    table: schema.communities,
    name: "communities",
    direction: "bidirectional",
    conflictColumn: "id",
    updatedAtColumn: "updated_at",
  },
  {
    table: schema.bibleBooks,
    name: "bible_books",
    direction: "supabase→neon", // Static reference data — one directional
    conflictColumn: "id",
  },
  {
    table: schema.hymns,
    name: "hymns",
    direction: "supabase→neon", // Static reference data — one directional
    conflictColumn: "id",
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// User Sync — Called after Supabase Auth events (sign-up, sign-in, update)
// ──────────────────────────────────────────────────────────────────────────────

export interface SupabaseAuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

/**
 * Syncs a single Supabase auth user to both databases.
 * Called from the auth webhook / middleware on login or sign-up.
 */
export async function syncUserToAllDbs(authUser: SupabaseAuthUser): Promise<void> {
  const userData: schema.InsertUser = {
    id: authUser.id,
    email: authUser.email ?? null,
    name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? authUser.email?.split("@")[0] ?? "User",
    avatar: authUser.user_metadata?.avatar_url ?? null,
    role: "user",
    lastSignInAt: new Date(),
    updatedAt: new Date(),
    createdAt: new Date(),
  };

  const neonDb = await getNeonDb();
  const supabaseDb = await getSupabaseDb();
  const primaryDb = neonDb ?? supabaseDb;
  if (!primaryDb) throw new Error("Cannot provision user profile: no application database is available.");

  const upsertProfile = async (db: any, label: string) => {
    await db.insert(schema.users).values(userData).onConflictDoUpdate({
      target: schema.users.id,
      set: {
        email: userData.email,
        name: userData.name,
        avatar: userData.avatar,
        lastSignInAt: userData.lastSignInAt,
        updatedAt: new Date(),
      },
    });
    console.log("[sync] User " + authUser.id + " synced to " + label);
  };

  await upsertProfile(primaryDb, neonDb ? "Neon" : "Supabase");
  if (neonDb && supabaseDb) {
    try {
      await upsertProfile(supabaseDb, "Supabase mirror");
    } catch (err: any) {
      console.error("[sync] Supabase profile mirror failed:", err.message);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Full Table Sync — Copies rows from source → destination
// ──────────────────────────────────────────────────────────────────────────────

export interface SyncResult {
  table: string;
  direction: SyncDirection;
  rowsSynced: number;
  errors: string[];
  durationMs: number;
}

/**
 * Syncs a single table from sourceDb → destDb using upsert.
 * Handles chunked writes of up to 500 rows to avoid timeouts.
 */
async function syncTable(
  config: TableSyncConfig,
  sourceDb: any,
  destDb: any,
  label: string
): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = {
    table: config.name,
    direction: config.direction,
    rowsSynced: 0,
    errors: [],
    durationMs: 0,
  };

  try {
    // Fetch all rows from source
    const rows = await sourceDb.select().from(config.table);
    if (!rows || rows.length === 0) {
      result.durationMs = Date.now() - start;
      return result;
    }

    // Upsert in chunks of 500 (avoids parameterized query limits)
    const CHUNK_SIZE = 500;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      try {
        const insert = destDb.insert(config.table).values(chunk);
        if (config.name === "users") {
          // Supabase Auth identity/profile sync may create missing profiles, but
          // must never overwrite the Neon-controlled application role.
          await insert.onConflictDoNothing();
        } else {
          const columns = getTableColumns(config.table) as Record<string, { name: string }>;
          const conflictTarget = columns[config.conflictColumn];
          if (!conflictTarget) throw new Error(`Unknown conflict column: ${config.conflictColumn}`);
          const updateSet = Object.fromEntries(
            Object.entries(columns)
              .filter(([key]) => key !== config.conflictColumn)
              .map(([key, column]) => [key, sql.raw(`excluded."${column.name}"`)]),
          );
          const updatedAt = config.updatedAtColumn ? columns[config.updatedAtColumn] : undefined;
          await insert.onConflictDoUpdate({
            target: conflictTarget as any,
            set: updateSet,
            ...(updatedAt
              ? { setWhere: sql` ${updatedAt as any} < ${sql.raw(`excluded."${updatedAt.name}"`)} ` }
              : {}),
          });
        }
        result.rowsSynced += chunk.length;
      } catch (err: any) {
        result.errors.push(
          `Chunk ${Math.floor(i / CHUNK_SIZE)}: ${err.message}`
        );
      }
    }

    console.log(
      `[sync] ✅ ${label} table "${config.name}": ${result.rowsSynced}/${rows.length} rows synced`
    );
  } catch (err: any) {
    result.errors.push(err.message);
    console.error(`[sync] ❌ ${label} table "${config.name}" failed:`, err.message);
  }

  result.durationMs = Date.now() - start;
  return result;
}

// ──────────────────────────────────────────────────────────────────────────────
// Full Database Sync
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Runs a full sync of all configured tables between Supabase and Neon.
 * Safe to call multiple times — uses upsert semantics (onConflictDoNothing).
 *
 * @param direction  - Which way to sync. Defaults to all tables per config.
 */
export async function runFullSync(
  direction: "supabase→neon" | "neon→supabase" | "all" = "all"
): Promise<SyncResult[]> {
  const [supabaseDb, neonDb] = await Promise.all([getSupabaseDb(), getNeonDb()]);

  if (!supabaseDb || !neonDb) {
    throw new Error("Both Neon and Supabase databases must be configured before running a full sync.");
  }

  const results: SyncResult[] = [];

  for (const config of SYNC_TABLES) {
    const tableDirs = config.direction === "bidirectional"
      ? ["supabase→neon", "neon→supabase"]
      : [config.direction];

    for (const dir of tableDirs) {
      if (direction !== "all" && dir !== direction) continue;

      if (dir === "supabase→neon" && supabaseDb && neonDb) {
        results.push(
          await syncTable(config, supabaseDb, neonDb, "Supabase→Neon")
        );
      } else if (dir === "neon→supabase" && neonDb && supabaseDb) {
        results.push(
          await syncTable(config, neonDb, supabaseDb, "Neon→Supabase")
        );
      }
    }
  }

  return results;
}

// ──────────────────────────────────────────────────────────────────────────────
// Health Check — Verify both databases are reachable
// ──────────────────────────────────────────────────────────────────────────────

export interface DbHealthStatus {
  neon: { connected: boolean; latencyMs?: number; error?: string };
  supabase: { connected: boolean; latencyMs?: number; error?: string };
}

export async function checkDbHealth(): Promise<DbHealthStatus> {
  const status: DbHealthStatus = {
    neon: { connected: false },
    supabase: { connected: false },
  };

  // Check Neon
  const neonDb = await getNeonDb();
  if (neonDb) {
    const t = Date.now();
    try {
      await neonDb.execute(sql`SELECT 1`);
      status.neon = { connected: true, latencyMs: Date.now() - t };
    } catch (err: any) {
      status.neon = { connected: false, error: err.message };
    }
  } else {
    status.neon.error = "NEON_DATABASE_URL not configured";
  }

  // Check Supabase
  const supabaseDb = await getSupabaseDb();
  if (supabaseDb) {
    const t = Date.now();
    try {
      await supabaseDb.execute(sql`SELECT 1`);
      status.supabase = { connected: true, latencyMs: Date.now() - t };
    } catch (err: any) {
      status.supabase = { connected: false, error: err.message };
    }
  } else {
    status.supabase.error = "DATABASE_URL not configured";
  }

  return status;
}
