import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertUser, User } from "@db/schema";
import { getDb, getNeonDb, getSupabaseDb } from "./connection";
import { env } from "../lib/env";

export async function findUserById(id: string): Promise<User | undefined> {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  return rows.at(0);
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  return rows.at(0);
}

export async function upsertUser(data: InsertUser): Promise<User | undefined> {
  const values = { ...data };
  const updateSet: Partial<InsertUser> = {
    lastSignInAt: new Date(),
    updatedAt: new Date(),
    ...data,
  };

  // Determine admin privileges
  const isAdmin =
    (values.id && values.id === env.adminUserId) ||
    (values.email && values.email.toLowerCase() === env.adminEmail.toLowerCase());

  if (isAdmin) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  // ─── Primary DB write ──────────────────────────────────────────────────────
  let result: User | undefined;
  try {
    const rows = await getDb()
      .insert(schema.users)
      .values(values)
      .onConflictDoUpdate({
        target: schema.users.id,
        set: updateSet,
      })
      .returning();
    result = rows.at(0);
  } catch {
    result = await findUserById(values.id);
  }

  // ─── Mirror write to the secondary DB (fire-and-forget) ───────────────────
  // Ensures user record exists in both Neon AND Supabase Postgres regardless
  // of which one is the primary.
  const primaryDb = getDb();
  const neonDb = getNeonDb();
  const supabaseDb = getSupabaseDb();
  const secondaryDb = primaryDb === neonDb ? supabaseDb : neonDb;

  if (secondaryDb && secondaryDb !== primaryDb) {
    secondaryDb
      .insert(schema.users)
      .values(values)
      .onConflictDoUpdate({
        target: schema.users.id,
        set: updateSet,
      })
      .catch((err: Error) => {
        // Fire-and-forget: non-blocking background mirror
        console.warn("[sync] Secondary DB user mirror failed:", err.message);
      });
  }

  return result;
}
