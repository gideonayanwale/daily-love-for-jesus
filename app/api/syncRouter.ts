// ==============================================================================
// Daily Love For Jesus - Sync Admin Router
// Exposes endpoints to trigger and monitor the Supabase ↔ Neon sync
// ==============================================================================

import { Hono } from "hono";
import { runFullSync, checkDbHealth, type SyncResult } from "./lib/dbSync";
import { env } from "./lib/env";

export const syncRouter = new Hono();

// ── Auth guard: require Admin-Secret header for all sync routes ────────────────
syncRouter.use("*", async (c, next) => {
  const secret = c.req.header("x-admin-secret");
  if (!secret || secret !== env.appSecret) {
    return c.json({ error: "Unauthorized — x-admin-secret required" }, 401);
  }
  return next();
});

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
syncRouter.post("/run", async (c) => {
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
syncRouter.post("/supabase-to-neon", async (c) => {
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
syncRouter.post("/neon-to-supabase", async (c) => {
  const start = Date.now();
  const results = await runFullSync("neon→supabase");
  return c.json({
    ok: true,
    totalRowsSynced: results.reduce((acc, r) => acc + r.rowsSynced, 0),
    durationMs: Date.now() - start,
    tables: results,
  });
});
