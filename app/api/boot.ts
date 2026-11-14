import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { Paths } from "@contracts/constants";
import { getDb } from "./queries/connection";
import { telegramMessages, auditLogs } from "@db/schema";
import { sql } from "drizzle-orm";
import * as cookie from "cookie";
import { communityRestRouter } from "./routes/community";
import { syncRouter } from "./syncRouter";
import { env } from "./lib/env";
import { insertTelegramMessage } from "./queries/telegram";
import { parseAndCreateDevotional } from "./lib/devotionalParser";


const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

app.use('*', async (c, next) => {
  // Only track anonymous GET requests
  if (c.req.method === 'GET') {
    const authHeader = c.req.header('authorization');
    const cookieHeader = c.req.header('cookie') || '';
    const cookies = cookie.parse(cookieHeader);
    const hasToken =
      (authHeader && authHeader.toLowerCase().startsWith('bearer ')) ||
      cookies['sb-access-token'] ||
      cookies['daily_love_token'];

    if (!hasToken) {
      const ip =
        c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
        c.req.header('x-real-ip') ||
        null;
      const ua = c.req.header('user-agent') || null;
      const path = new URL(c.req.url).pathname;

      // Skip static assets — only track meaningful API traffic
      const isStaticAsset =
        path.startsWith('/assets/') ||
        path.startsWith('/_next/') ||
        /\.(js|css|ico|png|jpg|jpeg|woff|woff2|map)$/i.test(path);
      if (isStaticAsset) {
        return next();
      }

      // Fire-and-forget — wrapped so a synchronous throw from getDb() is caught,
      // not turned into an unhandled rejection that could crash the process.
      try {
        getDb().insert(auditLogs).values({
          action: 'anonymous_visit',
          resourceType: 'page',
          resourceId: path,
          actorId: null,
          ipAddress: ip,
          userAgent: ua,
          metadata: { method: 'GET', timestamp: new Date().toISOString() },
        }).catch((err: unknown) => {
          console.error('[anonymous-tracking] Failed to log visit:', err);
        });
      } catch (err: unknown) {
        console.error('[anonymous-tracking] getDb() threw synchronously:', err);
      }
    }
  }
  return next();
});

// Telegram webhook endpoint - receives bot updates directly
app.post("/api/telegram/webhook", async (c) => {
  // Validate webhook secret token (skip if not configured — dev mode)
  if (env.telegramWebhookSecret) {
    const incomingSecret = c.req.header("x-telegram-bot-api-secret-token");
    if (incomingSecret !== env.telegramWebhookSecret) {
      return c.json({ error: "Unauthorized" }, 401);
    }
  }

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
    const devotionalId = await parseAndCreateDevotional(db, result[0].id, text);

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

app.route("/api", communityRestRouter);
app.route("/api/sync", syncRouter);

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

const isServerless =
  Boolean(process.env.VERCEL) ||
  Boolean(process.env.NETLIFY) ||
  Boolean(process.env.CF_PAGES) ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
  typeof (globalThis as any).WebSocketPair !== "undefined" ||
  Boolean((globalThis as any).navigator?.userAgent?.includes("Cloudflare-Workers"));

if (env.isProduction && !isServerless) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

// ─── Telegram Polling Scheduler (2am & 4am) ───────────────────────────────────
// Only runs in non-serverless environments when bot token is configured
let updateOffset = 0;

async function pollTelegramMessages(): Promise<void> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.telegramBotToken}/getUpdates?offset=${updateOffset}&timeout=0`
    );
    const data: any = await response.json();

    if (!data.ok || !Array.isArray(data.result)) {
      console.error("[scheduler] Telegram getUpdates returned non-ok response:", data);
      return;
    }

    const db = getDb();

    for (const update of data.result) {
      const message = update.message ?? update.channel_post;
      if (!message) continue;

      const text = message.text ?? message.caption ?? "";
      if (!text.trim()) continue;

      try {
        await insertTelegramMessage({
          messageId: message.message_id,
          chatId: message.chat.id,
          chatTitle: message.chat.title ?? null,
          senderId: message.from?.id ?? null,
          senderName: message.from?.first_name ?? null,
          text,
          processed: false,
          receivedAt: new Date((message.date ?? Math.floor(Date.now() / 1000)) * 1000),
        });

        await parseAndCreateDevotional(db, update.update_id, text);
      } catch (err) {
        console.error("[scheduler] Error processing update:", err);
      }
    }

    if (data.result.length > 0) {
      updateOffset = data.result[data.result.length - 1].update_id + 1;
    }
  } catch (err) {
    console.error("[scheduler] pollTelegramMessages error:", err);
  }
}

if (env.telegramBotToken && !isServerless) {
  const lastFiredSlot: Record<string, Date | null> = { "2": null, "4": null };

  setInterval(() => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();

    if (m === 0 && (h === 2 || h === 4)) {
      const slot = String(h);
      if (
        !lastFiredSlot[slot] ||
        now.getTime() - lastFiredSlot[slot]!.getTime() > 60 * 60 * 1000
      ) {
        lastFiredSlot[slot] = now;
        pollTelegramMessages().catch((e) => console.error("[scheduler]", e));
      }
    }
  }, 60_000);
}

