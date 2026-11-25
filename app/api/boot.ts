import { Hono } from "hono";
import { z } from "zod";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { getDb } from "./queries/connection";
import { telegramMessages, auditLogs } from "@db/schema";
import { sql } from "drizzle-orm";
import * as cookie from "cookie";
import { communityRestRouter } from "./routes/community";
import { syncRouter } from "./syncRouter";
import { env } from "./lib/env";
import { insertTelegramMessage } from "./queries/telegram";
import { parseAndCreateDevotional } from "./lib/devotionalParser";
import { AnonymousVisitRateLimiter } from "./lib/anonymous-analytics";

const anonymousVisitRateLimiter = new AnonymousVisitRateLimiter();

async function timingSafeStringEqual(left: string, right: string): Promise<boolean> {
  if (left.length !== right.length) return false;
  const encoder = new TextEncoder();
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const a = new Uint8Array(leftDigest);
  const b = new Uint8Array(rightDigest);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

async function pseudonymizeVisitorIp(ip: string | null): Promise<string | null> {
  if (!ip || !env.appSecret) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 40);
}
const telegramMessageSchema = z.object({
  message_id: z.number().int().positive(),
  chat: z.object({
    id: z.number().int(),
    username: z.string().max(64).optional(),
    title: z.string().max(500).optional(),
  }),
  from: z.object({
    id: z.number().int().positive(),
    first_name: z.string().max(255).optional(),
  }).passthrough().optional(),
  date: z.number().int().nonnegative().optional(),
  text: z.string().max(10000).optional(),
  caption: z.string().max(10000).optional(),
}).passthrough();

const telegramUpdateSchema = z.object({
  message: telegramMessageSchema.optional(),
  channel_post: telegramMessageSchema.optional(),
}).passthrough();

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 5 * 1024 * 1024 }));

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

    const hasAnalyticsConsent = c.req.header('x-analytics-consent') === 'granted';
    const rawSessionId = c.req.header('x-anonymous-session') || '';
    const sessionId = /^[0-9a-f-]{36}$/i.test(rawSessionId) ? rawSessionId : null;

    if (!hasToken && hasAnalyticsConsent && sessionId) {
      const ip =
        c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
        c.req.header('x-real-ip') ||
        null;
      const ua = c.req.header('user-agent') || null;
      const requestPath = new URL(c.req.url).pathname;
      const clientPath = c.req.header('x-client-path')?.split('?')[0] ?? '';
      const path = /^\/[a-zA-Z0-9/_-]{0,99}$/.test(clientPath) ? clientPath : requestPath;

      // Skip static assets — only track meaningful API traffic
      const isStaticAsset =
        path.startsWith('/assets/') ||
        path.startsWith('/_next/') ||
        /\.(js|css|ico|png|jpg|jpeg|woff|woff2|map)$/i.test(path);
      if (isStaticAsset) {
        return next();
      }

      // Fire-and-forget — wrapped so errors from getDb() are caught,
      // not turned into an unhandled rejection that could crash the process.
      // Rate-limit by network address + path, not the client-controlled session ID.
      // The limiter also bounds its in-memory cache against high-cardinality requests.
      if (!anonymousVisitRateLimiter.shouldLog(ip, path)) return next();
      (async () => {
        const db = await getDb();
        const visitorHash = await pseudonymizeVisitorIp(ip);
        await db.insert(auditLogs).values({
          action: 'anonymous_visit',
          resourceType: 'page',
          resourceId: path,
          actorId: null,
          ipAddress: visitorHash,
          userAgent: ua,
          metadata: { method: 'GET', timestamp: new Date().toISOString(), sessionId, consentVersion: 'v1' },
        });
      })().catch((err: unknown) => {
        console.error('[anonymous-tracking] Failed to log visit:', err);
      });
    }
  }
  return next();
});

// Telegram webhook endpoint - receives bot updates directly
app.post("/api/telegram/webhook", async (c) => {
  // Validate the Telegram webhook secret; production requires it.
  if (env.telegramWebhookSecret) {
    const incomingSecret = c.req.header("x-telegram-bot-api-secret-token");
    if (!incomingSecret || !(await timingSafeStringEqual(incomingSecret, env.telegramWebhookSecret))) {
      return c.json({ error: "Unauthorized" }, 401);
    }
  } else if (env.isProduction) {
    return c.json({ error: "Webhook secret required in production" }, 401);
  }

  try {
    const rawUpdate = await c.req.json();
    const parsedUpdate = telegramUpdateSchema.safeParse(rawUpdate);
    if (!parsedUpdate.success) {
      return c.json({ error: "Invalid Telegram update payload" }, 400);
    }
    const update = parsedUpdate.data;

    // Handle both messages and channel posts
    const message = update.message ?? update.channel_post;
    if (!message) {
      return c.json({ status: "ignored", reason: "no_message" });
    }

    const text = message.text ?? message.caption ?? "";
    if (!text.trim()) {
      return c.json({ status: "ignored", reason: "empty_message" });
    }

    const configuredChannel = env.telegramChannelId.trim();
    if (!configuredChannel && env.isProduction) {
      return c.json({ error: "Telegram channel is not configured" }, 503);
    }
    if (configuredChannel) {
      const incomingId = String(message.chat?.id ?? "");
      const incomingUsername = message.chat?.username ? `@${message.chat.username}` : "";
      if (
        configuredChannel !== incomingId &&
        configuredChannel.toLowerCase() !== incomingUsername.toLowerCase()
      ) {
        return c.json({ error: "Telegram update is not from the configured channel" }, 403);
      }
    }

    const db = await getDb();

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

    if (devotionalId && env.supabaseUrl && env.supabaseServiceRoleKey) {
      try {
        const broadcastResponse = await fetch(`${env.supabaseUrl}/realtime/v1/api/broadcast?private=true`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: env.supabaseServiceRoleKey,
            Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
          },
          body: JSON.stringify({
            messages: [
              {
                topic: "devotionals",
                event: "devotional_changed",
                payload: { id: devotionalId, action: "import" },
              },
              {
                topic: "admin:devotionals",
                event: "devotional_changed",
                payload: { id: devotionalId, action: "import" },
              },
            ],
          }),
        });
        if (!broadcastResponse.ok) {
          console.error("[telegram] Supabase Realtime rejected broadcast:", broadcastResponse.status, await broadcastResponse.text());
        }
      } catch (broadcastError) {
        console.error("[telegram] Realtime broadcast failed:", broadcastError);
      }
    }

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

const runtime = globalThis as unknown as {
  WebSocketPair?: unknown;
  navigator?: { userAgent?: string };
};
const isServerless =
  Boolean(process.env.VERCEL) ||
  Boolean(process.env.NETLIFY) ||
  Boolean(process.env.CF_PAGES) ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
  typeof runtime.WebSocketPair !== "undefined" ||
  Boolean(runtime.navigator?.userAgent?.includes("Cloudflare-Workers"));

if (env.isProduction && !isServerless) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

// ─── Telegram Polling Fallback ────────────────────────────────────────────────
// Only runs in non-serverless environments when webhook mode is not configured.
let updateOffset = 0;

async function pollTelegramMessages(): Promise<void> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.telegramBotToken}/getUpdates?offset=${updateOffset}&timeout=0`
    );
    type TelegramChatMessage = {
      message_id: number;
      chat: { id: number; username?: string; title?: string };
      from?: { id: number; first_name?: string };
      date: number;
      text?: string;
      caption?: string;
    };
    type TelegramUpdate = {
      update_id: number;
      message?: TelegramChatMessage;
      channel_post?: TelegramChatMessage;
    };
    const data = await response.json() as { ok?: boolean; result?: TelegramUpdate[] };

    if (!data.ok || !Array.isArray(data.result)) {
      console.error("[scheduler] Telegram getUpdates returned non-ok response:", data);
      return;
    }

    const db = await getDb();

    for (const update of data.result) {
      const message = update.message ?? update.channel_post;
      if (!message) continue;

      const configuredChannel = env.telegramChannelId.trim();
      const incomingId = String(message.chat?.id ?? "");
      const incomingUsername = message.chat?.username ? `@${message.chat.username}` : "";
      if (
        !configuredChannel ||
        (configuredChannel !== incomingId &&
          configuredChannel.toLowerCase() !== incomingUsername.toLowerCase())
      ) continue;

      const text = message.text ?? message.caption ?? "";
      if (!text.trim()) continue;

      try {
        const inserted = await insertTelegramMessage({
          messageId: message.message_id,
          chatId: message.chat.id,
          chatTitle: message.chat.title ?? null,
          senderId: message.from?.id ?? null,
          senderName: message.from?.first_name ?? null,
          text,
          processed: false,
          receivedAt: new Date((message.date ?? Math.floor(Date.now() / 1000)) * 1000),
        });

        if (inserted && !inserted.processed) {
          const devotionalId = await parseAndCreateDevotional(db, inserted.id, text);
          if (devotionalId && env.supabaseUrl && env.supabaseServiceRoleKey) {
            try {
              const response = await fetch(`${env.supabaseUrl}/realtime/v1/api/broadcast?private=true`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: env.supabaseServiceRoleKey,
                  Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
                },
                body: JSON.stringify({
                  messages: [
                    {
                      topic: "devotionals",
                      event: "devotional_changed",
                      payload: { id: devotionalId, action: "import" },
                    },
                    {
                      topic: "admin:devotionals",
                      event: "devotional_changed",
                      payload: { id: devotionalId, action: "import" },
                    },
                  ],
                }),
              });
              if (!response.ok) {
                console.error("[scheduler] Realtime broadcast rejected:", response.status, await response.text());
              }
            } catch (broadcastError) {
              console.error("[scheduler] Realtime broadcast failed:", broadcastError);
            }
          }
        }
      } catch {
        console.error("[scheduler] Failed to process a Telegram update.");
      }
    }

    if (data.result.length > 0) {
      updateOffset = data.result[data.result.length - 1].update_id + 1;
    }
  } catch {
    console.error("[scheduler] Telegram polling failed before completion.");
  }
}

if (env.telegramBotToken && env.telegramChannelId && !env.telegramWebhookSecret && !isServerless) {
  // Long-polling is a fallback only. When a webhook secret is configured,
  // Telegram push delivery is the single ingestion path.
  pollTelegramMessages().catch((e) => console.error("[scheduler]", e));
  setInterval(() => {
    pollTelegramMessages().catch((e) => console.error("[scheduler]", e));
  }, 5 * 60 * 1000).unref();
}

