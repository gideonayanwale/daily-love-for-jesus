// ==============================================================================
// Legacy connection.ts — now delegates to the dual-DB manager
// Import getDb from here for backwards compatibility.
// ==============================================================================

export { getDb, getNeonDb, getSupabaseDb } from "../lib/db";
