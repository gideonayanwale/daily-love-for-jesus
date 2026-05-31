import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { devotionals } from "@db/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export const devotionalRouter = createRouter({
  today: publicQuery.query(async () => {
    const db = getDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's devotional, or the most recent one
    const result = await db
      .select()
      .from(devotionals)
      .where(
        and(
          gte(devotionals.devotionalDate, today),
          eq(devotionals.isPublished, true)
        )
      )
      .orderBy(devotionals.devotionalDate)
      .limit(1);

    if (result.length > 0) return result[0];

    // Fallback to most recent devotional
    const fallback = await db
      .select()
      .from(devotionals)
      .where(eq(devotionals.isPublished, true))
      .orderBy(desc(devotionals.devotionalDate))
      .limit(1);

    return fallback[0] ?? null;
  }),

  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.query.devotionals.findFirst({
        where: eq(devotionals.id, input.id),
      });
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
      const db = getDb();
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;

      const items = await db
        .select()
        .from(devotionals)
        .where(eq(devotionals.isPublished, true))
        .orderBy(desc(devotionals.devotionalDate))
        .limit(limit)
        .offset(offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(devotionals)
        .where(eq(devotionals.isPublished, true));

      return {
        items,
        total: countResult[0]?.count ?? 0,
      };
    }),

  create: publicQuery
    .input(
      z.object({
        title: z.string().min(1),
        scripture: z.string().optional(),
        scriptureText: z.string().optional(),
        body: z.string().min(1),
        reflection: z.string().optional(),
        prayer: z.string().optional(),
        author: z.string().optional(),
        source: z.enum(["telegram", "manual", "api"]).default("manual"),
        devotionalDate: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db
        .insert(devotionals)
        .values({
          ...input,
          devotionalDate: input.devotionalDate ?? new Date(),
        })
        .$returningId();

      return db.query.devotionals.findFirst({
        where: eq(devotionals.id, result[0].id),
      });
    }),
});
