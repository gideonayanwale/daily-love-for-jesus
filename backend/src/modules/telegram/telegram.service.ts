import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import * as schema from '@db/schema';
import { eq, desc, sql } from 'drizzle-orm';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly dbService: DatabaseService) {}

  async handleWebhookUpdate(update: any) {
    const message = update.message ?? update.channel_post ?? update.channelPost;
    if (!message) {
      return { status: 'ignored', reason: 'no_message' };
    }

    const text = message.text ?? message.caption ?? '';
    if (!text.trim()) {
      return { status: 'ignored', reason: 'empty_message' };
    }

    const db = this.dbService.getDb();
    const messageId = message.message_id ?? message.messageId;
    const chatId = message.chat?.id;

    // Check duplicate
    const existing = await db
      .select()
      .from(schema.telegramMessages)
      .where(
        sql`${schema.telegramMessages.messageId} = ${messageId} AND ${schema.telegramMessages.chatId} = ${chatId}`,
      )
      .limit(1);

    if (existing.length > 0) {
      return { status: 'duplicate', id: existing[0].id };
    }

    const from = message.from ?? {};
    const messageDate = message.date ? new Date(message.date * 1000) : new Date();

    const inserted = await db
      .insert(schema.telegramMessages)
      .values({
        messageId,
        chatId,
        chatTitle: message.chat?.title ?? null,
        senderId: from.id ?? null,
        senderName: from.first_name ?? from.firstName ?? null,
        text,
        processed: false,
        receivedAt: messageDate,
      })
      .$returningId();

    const storedId = inserted[0]?.id;
    const devotionalId = await this.tryCreateDevotionalFromText(db, storedId, text);

    return {
      status: 'processed',
      messageId: storedId,
      devotionalId,
    };
  }

  async listMessages(limit: number = 20, offset: number = 0, processed?: boolean) {
    const db = this.dbService.getDb();

    let query = db.select().from(schema.telegramMessages);
    if (processed !== undefined) {
      query = query.where(eq(schema.telegramMessages.processed, processed));
    }

    const items = await query
      .orderBy(desc(schema.telegramMessages.receivedAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.telegramMessages);

    return {
      items,
      total: Number(countResult[0]?.count ?? 0),
    };
  }

  async processMessage(messageId: number) {
    const db = this.dbService.getDb();
    const rows = await db
      .select()
      .from(schema.telegramMessages)
      .where(eq(schema.telegramMessages.id, messageId))
      .limit(1);

    const message = rows[0];
    if (!message) {
      return { status: 'not_found' };
    }

    if (message.processed) {
      return { status: 'already_processed', devotionalId: message.devotionalId };
    }

    const devotionalId = await this.tryCreateDevotionalFromText(db, message.id, message.text);
    return { status: 'processed', devotionalId };
  }

  private async tryCreateDevotionalFromText(
    db: any,
    telegramMessageId: number,
    text: string,
  ): Promise<number | null> {
    try {
      const lines = text.split('\n').filter((l: string) => l.trim());
      if (lines.length < 2) return null;

      const title = lines[0].substring(0, 200);
      const scripturePattern = /(\d?\s?[A-Za-z]+\s?\d+[:\d\-]+)/;
      let scripture = '';
      let scriptureText = '';
      let body = '';
      let prayer = '';

      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(scripturePattern);
        if (match) {
          scripture = match[0];
          let j = i + 1;
          const scriptureLines = [];
          while (
            j < lines.length &&
            !lines[j].match(/^(Reflection|Mediation|Prayer|Thought|Body)/i)
          ) {
            scriptureLines.push(lines[j]);
            j++;
          }
          scriptureText = scriptureLines.join('\n').substring(0, 1000);
          break;
        }
      }

      const bodyText = text.substring(title.length).trim();
      const prayerMarkers = ['prayer:', 'let us pray:', 'prayer'];
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
        .insert(schema.devotionals)
        .values({
          title,
          scripture: scripture || null,
          scriptureText: scriptureText || null,
          body,
          prayer: prayer || null,
          source: 'telegram',
          telegramMessageId,
          devotionalDate: new Date(),
          isPublished: true,
        })
        .$returningId();

      const devotionalId = result[0]?.id;

      await db
        .update(schema.telegramMessages)
        .set({ processed: true, devotionalId })
        .where(eq(schema.telegramMessages.id, telegramMessageId));

      return devotionalId;
    } catch (error: any) {
      this.logger.error(`Failed to create devotional from Telegram text: ${error.message}`);
      return null;
    }
  }
}
