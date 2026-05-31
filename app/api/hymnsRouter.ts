import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { hymns } from "@db/schema";
import { eq, like, or, sql } from "drizzle-orm";

export const hymnsRouter = createRouter({
  list: publicQuery
    .input(
      z
        .object({
          search: z.string().optional(),
          category: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();

      if (input?.search) {
        const search = `%${input.search}%`;
        return db
          .select()
          .from(hymns)
          .where(
            or(
              like(hymns.title, search),
              like(hymns.author, search),
              like(hymns.category, search)
            )
          )
          .orderBy(hymns.hymnNumber);
      }

      if (input?.category) {
        return db
          .select()
          .from(hymns)
          .where(like(hymns.category, `%${input.category}%`))
          .orderBy(hymns.hymnNumber);
      }

      return db.select().from(hymns).orderBy(hymns.hymnNumber);
    }),

  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.query.hymns.findFirst({
        where: eq(hymns.id, input.id),
      });
    }),

  byNumber: publicQuery
    .input(z.object({ hymnNumber: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.query.hymns.findFirst({
        where: eq(hymns.hymnNumber, input.hymnNumber),
      });
    }),

  random: publicQuery.query(async () => {
    const db = getDb();
    const result = await db
      .select()
      .from(hymns)
      .orderBy(sql`RAND()`)
      .limit(1);
    return result[0] ?? null;
  }),

  categories: publicQuery.query(async () => {
    const db = getDb();
    const result = await db
      .select({ category: hymns.category })
      .from(hymns)
      .groupBy(hymns.category)
      .orderBy(hymns.category);
    return result.map((r) => r.category).filter(Boolean);
  }),
});
