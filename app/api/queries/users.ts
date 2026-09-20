import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertUser, User } from "@db/schema";
import { getDb } from "./connection";
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

  try {
    const result = await getDb()
      .insert(schema.users)
      .values(values)
      .onConflictDoUpdate({
        target: schema.users.id,
        set: updateSet,
      })
      .returning();

    return result.at(0);
  } catch {
    return findUserById(values.id);
  }
}
