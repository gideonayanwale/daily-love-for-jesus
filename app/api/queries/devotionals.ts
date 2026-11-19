import { eq, desc, gte, and, sql } from "drizzle-orm";
import { devotionals } from "@db/schema";
import type { Devotional, InsertDevotional } from "@db/schema";
import { getDb } from "./connection";

export async function getDevotionalById(id: number): Promise<Devotional | undefined> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(devotionals)
    .where(eq(devotionals.id, id))
    .limit(1);
  return rows.at(0);
}

export async function getTodayDevotional(): Promise<Devotional | undefined> {
  const db = await getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = await db
    .select()
    .from(devotionals)
    .where(and(gte(devotionals.devotionalDate, today), eq(devotionals.isPublished, true)))
    .orderBy(devotionals.devotionalDate)
    .limit(1);

  if (rows.length > 0) return rows[0];

  // Fallback to most recent published devotional
  const fallback = await db
    .select()
    .from(devotionals)
    .where(eq(devotionals.isPublished, true))
    .orderBy(desc(devotionals.devotionalDate))
    .limit(1);

  return fallback.at(0);
}

export async function listDevotionals(params: {
  limit: number;
  offset: number;
  publishedOnly: boolean;
}): Promise<{ items: Devotional[]; total: number }> {
  const db = await getDb();
  const { limit, offset, publishedOnly } = params;

  const whereClause = publishedOnly ? eq(devotionals.isPublished, true) : undefined;

  const items = await db
    .select()
    .from(devotionals)
    .where(whereClause)
    .orderBy(desc(devotionals.devotionalDate))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(devotionals)
    .where(whereClause);

  return { items, total: countResult[0]?.count ?? 0 };
}

export async function createDevotional(data: InsertDevotional): Promise<Devotional | undefined> {
  const db = await getDb();
  const result = await db.insert(devotionals).values(data).$returningId();
  return getDevotionalById(result[0].id);
}

export async function updateDevotional(
  id: number,
  data: Partial<InsertDevotional>
): Promise<Devotional | undefined> {
  const db = await getDb();
  await db
    .update(devotionals)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(devotionals.id, id));
  return getDevotionalById(id);
}

export async function deleteDevotional(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(devotionals).where(eq(devotionals.id, id));
}

export async function publishDevotional(id: number): Promise<Devotional | undefined> {
  const db = await getDb();
  await db
    .update(devotionals)
    .set({ isPublished: true, updatedAt: new Date() })
    .where(eq(devotionals.id, id));
  return getDevotionalById(id);
}

export async function listDevotionalsBySource(source: string): Promise<Devotional[]> {
  const db = await getDb();
  return db
    .select()
    .from(devotionals)
    .where(eq(devotionals.source, source))
    .orderBy(desc(devotionals.devotionalDate));
}
