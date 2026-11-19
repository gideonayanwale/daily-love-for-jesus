// ==============================================================================
// Legacy connection.ts — delegates to the dual-DB manager.
// Import getDb from here for backwards compatibility.
//
// getDb() is now async (ESM dynamic import — no require() allowed).
// All call sites must await it: `const db = await getDb();`
// ==============================================================================

export { getDb, getNeonDb, getSupabaseDb } from "../lib/db";
