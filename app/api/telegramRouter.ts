import { z } from "zod";
import { createRouter, publicQuery, adminQuery, elevatedAdminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { telegramMessages, devotionals } from "@db/schema";
import { eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  listTelegramMessages,
  getTelegramMessageById,
  markTelegramMessageProcessed,
} from "./queries/telegram";
import { parseAndCreateDevotional } from "./lib/devotionalParser";

export const telegramRouter = createRouter({
  // Webhook endpoint for Telegram bot (public — called by Telegram servers)
  webhook: publicQuery
    .input(
      z.object({
        updateId: z.number(),
        message: z
          .object({
            messageId: z.number(),
            chat: z.object({
              id: z.number(),
              title: z.string().optional(),
            }),
            from: z
              .object({
                id: z.number(),
                firstName: z.string(),
                username: z.string().optional(),
              })
              .optional(),
            text: z.string().optional(),
            caption: z.string().optional(),
            date: z.number(),
          })
          .optional(),
        channelPost: z
          .object({
            messageId: z.number(),
            chat: z.object({
              id: z.number(),
              title: z.string().optional(),
            }),
            text: z.string().optional(),
            caption: z.string().optional(),
            date: z.number(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();

      const message = input.message ?? input.channelPost;
      if (!message) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No message data found",
        });
      }

      const text = message.text ?? message.caption ?? "";
      if (!text.trim()) {
        return { status: "ignored", reason: "empty_message" };
      }

      // Check if message already exists
      const existing = await db
        .select()
        .from(telegramMessages)
        .where(
          sql`${telegramMessages.messageId} = ${message.messageId} AND ${telegramMessages.chatId} = ${message.chat.id}`
        )
        .limit(1);

      if (existing.length > 0) {
        return { status: "duplicate", id: existing[0].id };
      }

      // Store the Telegram message
      const result = await db
        .insert(telegramMessages)
        .values({
          messageId: message.messageId,
          chatId: message.chat.id,
          chatTitle: message.chat.title ?? null,
          senderId: input.message?.from?.id ?? null,
          senderName: input.message?.from?.firstName ?? null,
          text: text,
          processed: false,
          receivedAt: new Date(message.date * 1000),
        })
        .$returningId();

      // Try to auto-create devotional from message
      const devotionalId = await tryCreateDevotionalFromMessage(
        db,
        result[0].id,
        text
      );

      return {
        status: "processed",
        messageId: result[0].id,
        devotionalId,
      };
    }),

  // Admin-only: list stored Telegram messages
  messages: adminQuery
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
          processed: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return listTelegramMessages({
        limit: input?.limit ?? 20,
        offset: input?.offset ?? 0,
        processedFilter: input?.processed,
      });
    }),

  // Admin-only: manually process a stored Telegram message into a devotional
  processMessage: adminQuery
    .input(z.object({ messageId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();

      const message = await getTelegramMessageById(input.messageId);

      if (!message) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Message not found",
        });
      }

      if (message.processed) {
        return { status: "already_processed", devotionalId: message.devotionalId };
      }

      const devotionalId = await tryCreateDevotionalFromMessage(
        db,
        message.id,
        message.text
      );

      if (devotionalId !== null) {
        await markTelegramMessageProcessed(message.id, devotionalId);
      }

      return { status: "processed", devotionalId };
    }),

  // Elevated admin: paste raw Telegram message text and ingest it directly
  ingestPasted: elevatedAdminQuery
    .input(z.object({ text: z.string().trim().min(10).max(10000) }))
    .mutation(async ({ input }) => {
      const db = await getDb();

      const result = await db
        .insert(telegramMessages)
        .values({
          messageId: Date.now(),
          chatId: 0,
          chatTitle: "manual",
          senderId: null,
          senderName: null,
          text: input.text,
          processed: false,
          receivedAt: new Date(),
        })
        .$returningId();

      const messageId = result[0].id;

      const devotionalId = await parseAndCreateDevotional(db, messageId, input.text);

      return { devotionalId: devotionalId ?? null, messageId };
    }),
});

// Helper function to parse devotional from Telegram message text
async function tryCreateDevotionalFromMessage(
  db: any,
  telegramMessageId: number,
  text: string
): Promise<number | null> {
  try {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return null;

    let title = lines[0].substring(0, 200);
    let scripture = "";
    let scriptureText = "";
    let body = "";
    let prayer = "";

    const scripturePattern = /(\d?\s?[A-Za-z]+\s?\d+[:\d\-]+)/;
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(scripturePattern);
      if (match) {
        scripture = match[0];
        let j = i + 1;
        const scriptureLines: string[] = [];
        while (j < lines.length && !lines[j].match(/^(Reflection|Mediation|Prayer|Thought|Body)/i)) {
          scriptureLines.push(lines[j]);
          j++;
        }
        scriptureText = scriptureLines.join("\n").substring(0, 1000);
        break;
      }
    }

    const bodyText = text.substring(title.length).trim();
    const prayerMarkers = ["prayer:", "let us pray:", "prayer"];
    let prayerIndex = -1;
    for (const marker of prayerMarkers) {
      const idx = bodyText.toLowerCase().indexOf(marker);
      if (idx !== -1) {
        prayerIndex = idx;
        break;
      }
    }

    if (prayerIndex !== -1) {
      body = bodyText.substring(0, prayerIndex).trim().substring(0, 2000);
      prayer = bodyText.substring(prayerIndex).trim().substring(0, 1000);
    } else {
      body = bodyText.substring(0, 2000);
    }

    const result = await db
      .insert(devotionals)
      .values({
        title,
        scripture: scripture || null,
        scriptureText: scriptureText || null,
        body,
        reflection: null,
        prayer: prayer || null,
        source: "telegram",
        telegramMessageId: telegramMessageId,
        devotionalDate: new Date(),
        isPublished: true,
      })
      .$returningId();

    await db
      .update(telegramMessages)
      .set({ processed: true, devotionalId: result[0].id })
      .where(eq(telegramMessages.id, telegramMessageId));

    return result[0].id;
  } catch (error) {
    console.error("Failed to create devotional from message:", error);
    return null;
  }
}
