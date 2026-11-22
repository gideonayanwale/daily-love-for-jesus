// ==============================================================================
// Daily Love For Jesus - Sync Admin Router
// Exposes endpoints to trigger and monitor the Supabase ↔ Neon sync
// ==============================================================================

import { Hono, type MiddlewareHandler } from "hono";
import { runFullSync, checkDbHealth, type SyncResult } from "./lib/dbSync";
import { findUserById } from "./queries/users";

export const syncRouter = new Hono();

// ── Auth guard: sync mutations require a verified platform-admin session ──
const adminAuth: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return c.json({ error: "A platform administrator session is required." }, 401);
  }

  try {
    const token = authHeader.substring(7).trim();
    if (!token) return c.json({ error: "A platform administrator session is required." }, 401);
    const { supabaseAdmin } = await import("./lib/supabase");
    const authUser = await supabaseAdmin.getUser(token);
    if (!authUser?.id) return c.json({ error: "Invalid or expired authentication token." }, 401);

    const profile = await findUserById(authUser.id);
    if (!profile || !["admin", "superadmin"].includes(profile.role)) {
      return c.json({ error: "Platform administrator access is required." }, 403);
    }
    return next();
  } catch {
    return c.json({ error: "Authentication verification failed." }, 401);
  }
};

// ── GET /api/sync/health — check both DB connections ──────────────────────────
syncRouter.get("/health", async (c) => {
  try {
    const status = await checkDbHealth();
    const allHealthy = status.neon.connected && status.supabase.connected;

    return c.json(
      {
        status: allHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
      },
      allHealthy ? 200 : 207
    );
  } catch {
    return c.json({ status: "unavailable" }, 503);
  }
});

// ── POST /api/sync/run — trigger a full bidirectional sync ────────────────────
syncRouter.post("/run", adminAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const direction = body?.direction ?? "all";
  if (!["all", "supabase→neon", "neon→supabase"].includes(direction)) {
    return c.json({ error: "Invalid sync direction" }, 400);
  }

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return c.json({ error: message }, 500);
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
