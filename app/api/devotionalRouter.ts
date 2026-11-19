import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, elevatedAdminQuery } from "./middleware";
import { env } from "./lib/env";
import { sendDevotionalToTelegram } from './lib/telegramNotify';
import {
  getTodayDevotional,
  getDevotionalById,
  listDevotionals,
  createDevotional,
  updateDevotional,
  deleteDevotional,
  publishDevotional,
} from "./queries/devotionals";

const stripHtml = (s: string): string => s.replace(/(<([^>]+)>)/gi, '').trim();

// Fire-and-forget realtime broadcast after mutations
export async function broadcastDevotionalChanged(id: number, action: string): Promise<void> {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) return;
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
            payload: { id, action },
          },
          {
            topic: "admin:devotionals",
            event: "devotional_changed",
            payload: { id, action },
          },
        ],
      }),
    });
    if (!response.ok) {
      console.error("[devotionalRouter] Supabase Realtime rejected broadcast:", response.status, await response.text());
    }
  } catch (err) {
    console.error("[devotionalRouter] broadcast error:", err);
  }
}

const devotionalCreateInput = z.object({
  title: z.string().trim().min(1).max(500).transform(stripHtml),
  scripture: z.string().trim().max(500).optional().transform(v => v !== undefined ? stripHtml(v) : v),
  scriptureText: z.string().trim().optional().transform(v => v !== undefined ? stripHtml(v) : v),
  body: z.string().trim().min(1).max(10000).transform(stripHtml),
  reflection: z.string().trim().max(3000).optional().transform(v => v !== undefined ? stripHtml(v) : v),
  prayer: z.string().trim().max(3000).optional().transform(v => v !== undefined ? stripHtml(v) : v),
  topic: z.string().trim().max(500).optional().transform(v => v !== undefined ? stripHtml(v) : v),
  declarationOfFaith: z.string().trim().max(5000).optional().transform(v => v !== undefined ? stripHtml(v) : v),
  dailyCapsule: z.string().trim().max(5000).optional().transform(v => v !== undefined ? stripHtml(v) : v),
  brothersKeeper: z.string().trim().max(5000).optional().transform(v => v !== undefined ? stripHtml(v) : v),
  dailyBibleReading: z.string().trim().max(5000).optional().transform(v => v !== undefined ? stripHtml(v) : v),
  otherInfo: z.string().trim().max(5000).optional().transform(v => v !== undefined ? stripHtml(v) : v),
  author: z.string().trim().max(255).optional(),
  mediaUrl: z.string().url().refine(url => url.startsWith('https://'), { message: 'Only HTTPS media URLs are accepted' }).optional(),
  source: z.enum(["telegram", "manual", "api"]).default("manual"),
  devotionalDate: z.date().optional(),
  isPublished: z.boolean().optional(),
});

const devotionalUpdateInput = z.object({
  title: z.string().trim().min(1).max(500).optional().transform(v => v !== undefined ? stripHtml(v) : v),
  scripture: z.string().trim().max(500).optional().transform(v => v !== undefined ? stripHtml(v) : v),
  scriptureText: z.string().trim().optional().transform(v => v !== undefined ? stripHtml(v) : v),
  body: z.string().trim().min(1).max(10000).optional().transform(v => v !== undefined ? stripHtml(v) : v),
  reflection: z.string().trim().max(3000).optional().transform(v => v !== undefined ? stripHtml(v) : v),
  prayer: z.string().trim().max(3000).optional().transform(v => v !== undefined ? stripHtml(v) : v),
  topic: z.string().trim().max(500).optional().transform(v => v !== undefined ? stripHtml(v) : v),
  declarationOfFaith: z.string().trim().max(5000).optional().transform(v => v !== undefined ? stripHtml(v) : v),
  dailyCapsule: z.string().trim().max(5000).optional().transform(v => v !== undefined ? stripHtml(v) : v),
  brothersKeeper: z.string().trim().max(5000).optional().transform(v => v !== undefined ? stripHtml(v) : v),
  dailyBibleReading: z.string().trim().max(5000).optional().transform(v => v !== undefined ? stripHtml(v) : v),
  otherInfo: z.string().trim().max(5000).optional().transform(v => v !== undefined ? stripHtml(v) : v),
  author: z.string().trim().max(255).optional(),
  mediaUrl: z.string().url().refine(url => url.startsWith('https://'), { message: 'Only HTTPS media URLs are accepted' }).optional(),
  source: z.enum(["telegram", "manual", "api"]).optional(),
  devotionalDate: z.date().optional(),
  isPublished: z.boolean().optional(),
});

export const devotionalRouter = createRouter({
  today: publicQuery.query(async () => {
    return getTodayDevotional();
  }),

  byId: publicQuery
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const devotional = await getDevotionalById(input.id);
      return devotional?.isPublished ? devotional : null;
    }),

  list: publicQuery
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return listDevotionals({
        limit: input?.limit ?? 20,
        offset: input?.offset ?? 0,
        publishedOnly: true,
      });
    }),

  adminList: elevatedAdminQuery
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20), offset: z.number().int().min(0).default(0) }).optional())
    .query(async ({ input }) => listDevotionals({ limit: input?.limit ?? 20, offset: input?.offset ?? 0, publishedOnly: false })),

  create: elevatedAdminQuery
    .input(devotionalCreateInput)
    .mutation(async ({ input }) => {
      const devotional = await createDevotional({
        ...input,
        devotionalDate: input.devotionalDate ?? new Date(),
      });
      if (devotional) {
        broadcastDevotionalChanged(devotional.id, "create").catch(() => void 0);
      }
      return devotional;
    }),

  update: elevatedAdminQuery
    .input(
      z.object({
        id: z.number(),
        data: devotionalUpdateInput,
      })
    )
    .mutation(async ({ input }) => {
      const existing = await getDevotionalById(input.id);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Devotional not found" });
      }
      const devotional = await updateDevotional(input.id, input.data);
      if (devotional) {
        broadcastDevotionalChanged(devotional.id, "update").catch(() => void 0);
      }
      return devotional;
    }),

  delete: elevatedAdminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const existing = await getDevotionalById(input.id);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Devotional not found" });
      }
      await deleteDevotional(input.id);
      broadcastDevotionalChanged(input.id, "delete").catch(() => void 0);
      return { success: true, id: input.id };
    }),

  publish: elevatedAdminQuery
    .input(z.object({ id: z.number().int().positive(), isPublished: z.boolean().default(true) }))
    .mutation(async ({ input }) => {
      const existing = await getDevotionalById(input.id);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Devotional not found" });
      }
      const devotional = await publishDevotional(input.id, input.isPublished);
      if (devotional) {
        broadcastDevotionalChanged(devotional.id, "publish").catch(() => void 0);
      }
      return devotional;
    }),

  sendToTelegram: elevatedAdminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const existing = await getDevotionalById(input.id);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Devotional not found" });
      }
      if (!existing.isPublished) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Publish the devotional before sending it to Telegram." });
      }
      const sent = await sendDevotionalToTelegram(existing);
      if (!sent) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Telegram delivery is not configured. Set the bot token and channel ID." });
      }
      return { success: true };
    }),
});
