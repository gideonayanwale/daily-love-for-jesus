import { and, eq, desc, sql } from "drizzle-orm";
import { telegramMessages } from "@db/schema";
import type { TelegramMessage, InsertTelegramMessage } from "@db/schema";
import { getDb } from "./connection";

export async function getTelegramMessageById(id: number): Promise<TelegramMessage | undefined> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(telegramMessages)
    .where(eq(telegramMessages.id, id))
    .limit(1);
  return rows.at(0);
}

export async function listTelegramMessages(params: {
  limit: number;
  offset: number;
  processedFilter?: boolean;
}): Promise<{ items: TelegramMessage[]; total: number }> {
  const db = await getDb();
  const { limit, offset, processedFilter } = params;

  const whereClause =
    processedFilter !== undefined
      ? eq(telegramMessages.processed, processedFilter)
      : undefined;

  const items = await db
    .select()
    .from(telegramMessages)
    .where(whereClause)
    .orderBy(desc(telegramMessages.receivedAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(telegramMessages)
    .where(whereClause);

  return { items, total: countResult[0]?.count ?? 0 };
}

export async function markTelegramMessageProcessed(
  id: number,
  devotionalId: number
): Promise<void> {
  const db = await getDb();
  await db
    .update(telegramMessages)
    .set({ processed: true, devotionalId })
    .where(eq(telegramMessages.id, id));
}

export async function insertTelegramMessage(
  data: InsertTelegramMessage
): Promise<TelegramMessage | undefined> {
  const db = await getDb();
  const existing = await db
    .select()
    .from(telegramMessages)
    .where(and(
      eq(telegramMessages.messageId, data.messageId),
      eq(telegramMessages.chatId, data.chatId),
    ))
    .limit(1);
  if (existing[0]) return existing[0];

  const result = await db.insert(telegramMessages).values(data).$returningId();
  return getTelegramMessageById(result[0].id);
}
