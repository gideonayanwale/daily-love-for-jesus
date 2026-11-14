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

// Fire-and-forget realtime broadcast after mutations
async function broadcastDevotionalChanged(id: number, action: string): Promise<void> {
  try {
    await fetch(`${env.supabaseUrl}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      },
      body: JSON.stringify({
        topic: "devotionals",
        event: "devotional_changed",
        payload: { id, action },
      }),
    });
  } catch (err) {
    console.error("[devotionalRouter] broadcast error:", err);
  }
}

const devotionalCreateInput = z.object({
  title: z.string().trim().min(1).max(500),
  scripture: z.string().trim().max(500).optional(),
  scriptureText: z.string().trim().optional(),
  body: z.string().trim().min(1).max(10000),
  reflection: z.string().trim().max(3000).optional(),
  prayer: z.string().trim().max(3000).optional(),
  topic: z.string().trim().max(500).optional(),
  declarationOfFaith: z.string().trim().max(5000).optional(),
  dailyCapsule: z.string().trim().max(5000).optional(),
  brothersKeeper: z.string().trim().max(5000).optional(),
  dailyBibleReading: z.string().trim().max(5000).optional(),
  otherInfo: z.string().trim().max(5000).optional(),
  author: z.string().trim().max(255).optional(),
  mediaUrl: z.string().url().optional(),
  source: z.enum(["telegram", "manual", "api"]).default("manual"),
  devotionalDate: z.date().optional(),
});

const devotionalUpdateInput = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  scripture: z.string().trim().max(500).optional(),
  scriptureText: z.string().trim().optional(),
  body: z.string().trim().min(1).max(10000).optional(),
  reflection: z.string().trim().max(3000).optional(),
  prayer: z.string().trim().max(3000).optional(),
  topic: z.string().trim().max(500).optional(),
  declarationOfFaith: z.string().trim().max(5000).optional(),
  dailyCapsule: z.string().trim().max(5000).optional(),
  brothersKeeper: z.string().trim().max(5000).optional(),
  dailyBibleReading: z.string().trim().max(5000).optional(),
  otherInfo: z.string().trim().max(5000).optional(),
  author: z.string().trim().max(255).optional(),
  mediaUrl: z.string().url().optional(),
  source: z.enum(["telegram", "manual", "api"]).optional(),
  devotionalDate: z.date().optional(),
  isPublished: z.boolean().optional(),
});

export const devotionalRouter = createRouter({
  today: publicQuery.query(async () => {
    return getTodayDevotional();
  }),

  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getDevotionalById(input.id);
    }),

  list: publicQuery
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
          publishedOnly: z.boolean().default(true),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return listDevotionals({
        limit: input?.limit ?? 20,
        offset: input?.offset ?? 0,
        publishedOnly: input?.publishedOnly ?? true,
      });
    }),

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
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const existing = await getDevotionalById(input.id);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Devotional not found" });
      }
      const devotional = await publishDevotional(input.id);
      if (devotional) {
        broadcastDevotionalChanged(devotional.id, "publish").catch(() => void 0);
        sendDevotionalToTelegram(devotional).catch(() => void 0);
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
      await sendDevotionalToTelegram(existing);
      return { success: true };
    }),
});
