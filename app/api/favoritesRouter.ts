import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { userFavorites } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

export const favoritesRouter = createRouter({
  list: authedQuery
    .input(
      z.object({
        type: z.enum(["verse", "hymn", "devotional"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();

      if (input.type) {
        return db
          .select()
          .from(userFavorites)
          .where(
            and(
              eq(userFavorites.userId, ctx.user.id),
              eq(userFavorites.type, input.type)
            )
          )
          .orderBy(desc(userFavorites.createdAt));
      }

      return db
        .select()
        .from(userFavorites)
        .where(eq(userFavorites.userId, ctx.user.id))
        .orderBy(desc(userFavorites.createdAt));
    }),

  add: authedQuery
    .input(
      z.object({
        type: z.enum(["verse", "hymn", "devotional"]),
        itemId: z.number().int().positive(),
        reference: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      // Check if already exists
      const existing = await db
        .select()
        .from(userFavorites)
        .where(
          and(
            eq(userFavorites.userId, ctx.user.id),
            eq(userFavorites.type, input.type),
            eq(userFavorites.itemId, input.itemId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return existing[0];
      }

      const result = await db
        .insert(userFavorites)
        .values({
          userId: ctx.user.id,
          type: input.type,
          itemId: input.itemId,
          reference: input.reference ?? null,
        })
        .returning();

      return result[0] ?? null;
    }),

  remove: authedQuery
    .input(
      z.object({
        userId: z.string(),
        type: z.enum(["verse", "hymn", "devotional"]),
        itemId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      await db
        .delete(userFavorites)
        .where(
          and(
            eq(userFavorites.userId, input.userId),
            eq(userFavorites.type, input.type),
            eq(userFavorites.itemId, input.itemId)
          )
        );
      return { success: true };
    }),
});
