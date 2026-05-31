import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { userFavorites } from "@db/schema";
import { eq, and, sql } from "drizzle-orm";

export const favoritesRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        userId: z.number(),
        type: z.enum(["verse", "hymn", "devotional"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();

      if (input.type) {
        return db
          .select()
          .from(userFavorites)
          .where(
            and(
              eq(userFavorites.userId, input.userId),
              eq(userFavorites.type, input.type)
            )
          )
          .orderBy(sql`${userFavorites.createdAt} DESC`);
      }

      return db
        .select()
        .from(userFavorites)
        .where(eq(userFavorites.userId, input.userId))
        .orderBy(sql`${userFavorites.createdAt} DESC`);
    }),

  add: publicQuery
    .input(
      z.object({
        userId: z.number(),
        type: z.enum(["verse", "hymn", "devotional"]),
        itemId: z.number(),
        reference: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Check if already exists
      const existing = await db
        .select()
        .from(userFavorites)
        .where(
          and(
            eq(userFavorites.userId, input.userId),
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
          userId: input.userId,
          type: input.type,
          itemId: input.itemId,
          reference: input.reference ?? null,
        })
        .$returningId();

      return db.query.userFavorites.findFirst({
        where: eq(userFavorites.id, result[0].id),
      });
    }),

  remove: publicQuery
    .input(
      z.object({
        userId: z.number(),
        type: z.enum(["verse", "hymn", "devotional"]),
        itemId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
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
