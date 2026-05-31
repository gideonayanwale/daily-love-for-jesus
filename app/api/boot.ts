import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { createOAuthCallbackHandler } from "./kimi/auth";
import { Paths } from "@contracts/constants";
import { getDb } from "./queries/connection";
import { telegramMessages, devotionals } from "@db/schema";
import { eq, sql } from "drizzle-orm";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.get(Paths.oauthCallback, createOAuthCallbackHandler());

// Telegram webhook endpoint - receives bot updates directly
app.post("/api/telegram/webhook", async (c) => {
  try {
    const update = await c.req.json();

    // Handle both messages and channel posts
    const message = update.message ?? update.channel_post;
    if (!message) {
      return c.json({ status: "ignored", reason: "no_message" });
    }

    const text = message.text ?? message.caption ?? "";
    if (!text.trim()) {
      return c.json({ status: "ignored", reason: "empty_message" });
    }

    const db = getDb();

    // Check for duplicate
    const existing = await db
      .select()
      .from(telegramMessages)
      .where(
        sql`${telegramMessages.messageId} = ${message.message_id} AND ${telegramMessages.chatId} = ${message.chat.id}`
      )
      .limit(1);

    if (existing.length > 0) {
      return c.json({ status: "duplicate", id: existing[0].id });
    }

    // Store message
    const from = message.from ?? {};
    const result = await db
      .insert(telegramMessages)
      .values({
        messageId: message.message_id,
        chatId: message.chat.id,
        chatTitle: message.chat.title ?? null,
        senderId: from.id ?? null,
        senderName: from.first_name ?? null,
        text: text,
        processed: false,
        receivedAt: new Date((message.date ?? Math.floor(Date.now() / 1000)) * 1000),
      })
      .$returningId();

    // Try auto-create devotional
    const devotionalId = await tryCreateDevotional(db, result[0].id, text);

    return c.json({
      status: "processed",
      messageId: result[0].id,
      devotionalId,
    });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return c.json({ status: "error", message: "Internal server error" }, 500);
  }
});

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

// Helper to parse devotional from Telegram text
async function tryCreateDevotional(db: any, telegramMessageId: number, text: string): Promise<number | null> {
  try {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return null;

    const title = lines[0].substring(0, 200);
    const scripturePattern = /(\d?\s?[A-Za-z]+\s?\d+[:\d\-]+)/;
    let scripture = "";
    let scriptureText = "";
    let body = "";
    let prayer = "";

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
        prayer: prayer || null,
        source: "telegram",
        telegramMessageId,
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
