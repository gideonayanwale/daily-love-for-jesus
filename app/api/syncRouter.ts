// ==============================================================================
// Daily Love For Jesus - Sync Admin Router
// Exposes endpoints to trigger and monitor the Supabase ↔ Neon sync
// ==============================================================================

import { Hono } from "hono";
import { runFullSync, checkDbHealth, type SyncResult } from "./lib/dbSync";
import { env } from "./lib/env";

export const syncRouter = new Hono();

// ── Auth guard: require Admin-Secret or valid Admin user for sync triggers ───
const adminAuth = async (c: any, next: any) => {
  const secret = c.req.header("x-admin-secret");
  if (secret && secret === env.appSecret) {
    return next();
  }

  // Also accept Supabase Bearer token for authenticated users
  const authHeader = c.req.header("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    try {
      const token = authHeader.substring(7).trim();
      const { supabaseAdmin } = await import("./lib/supabase");
      const user = await supabaseAdmin.getUser(token);
      if (user && user.id) {
        // Allow authenticated admin, or if no admin configured, any authenticated user
        if (
          !env.adminUserId ||
          user.id === env.adminUserId ||
          (user.email && user.email.toLowerCase() === env.adminEmail.toLowerCase())
        ) {
          return next();
        }
      }
    } catch {
      // Fall through to unauthorized
    }
  }

  return c.json({ error: "Unauthorized — x-admin-secret or admin bearer token required" }, 401);
};

// ── GET /api/sync/health — check both DB connections ──────────────────────────
syncRouter.get("/health", async (c) => {
  try {
    const status = await checkDbHealth();
    const allHealthy = status.neon.connected && status.supabase.connected;

    return c.json(
      {
        status: allHealthy ? "healthy" : "degraded",
        databases: status,
        timestamp: new Date().toISOString(),
      },
      allHealthy ? 200 : 207
    );
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ── POST /api/sync/run — trigger a full bidirectional sync ────────────────────
syncRouter.post("/run", adminAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const direction = body?.direction ?? "all"; // "all" | "supabase→neon" | "neon→supabase"

  console.log(`[sync-router] Starting sync (direction: ${direction})`);
  const start = Date.now();

  try {
    const results: SyncResult[] = await runFullSync(direction);
    const totalRows = results.reduce((acc, r) => acc + r.rowsSynced, 0);
    const totalErrors = results.flatMap((r) => r.errors);

    return c.json({
      ok: totalErrors.length === 0,
      direction,
      totalRowsSynced: totalRows,
      durationMs: Date.now() - start,
      tables: results,
      errors: totalErrors.length > 0 ? totalErrors : undefined,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ── POST /api/sync/supabase-to-neon — one-way copy from Supabase → Neon ───────
syncRouter.post("/supabase-to-neon", adminAuth, async (c) => {
  const start = Date.now();
  const results = await runFullSync("supabase→neon");
  return c.json({
    ok: true,
    totalRowsSynced: results.reduce((acc, r) => acc + r.rowsSynced, 0),
    durationMs: Date.now() - start,
    tables: results,
  });
});

// ── POST /api/sync/neon-to-supabase — one-way copy from Neon → Supabase ───────
syncRouter.post("/neon-to-supabase", adminAuth, async (c) => {
  const start = Date.now();
  const results = await runFullSync("neon→supabase");
  return c.json({
    ok: true,
    totalRowsSynced: results.reduce((acc, r) => acc + r.rowsSynced, 0),
    durationMs: Date.now() - start,
    tables: results,
  });
});
