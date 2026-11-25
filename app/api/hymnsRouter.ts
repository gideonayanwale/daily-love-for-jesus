import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { hymns } from "@db/schema";
import { eq, like, or, sql } from "drizzle-orm";

function normalizeHymn<T extends { stanzas: unknown }>(hymn: T) {
  let stanzas: Array<{ number?: number; text?: string }> = [];
  if (Array.isArray(hymn.stanzas)) {
    stanzas = hymn.stanzas as Array<{ number?: number; text?: string }>;
  } else if (typeof hymn.stanzas === "string") {
    try {
      const parsed: unknown = JSON.parse(hymn.stanzas);
      if (Array.isArray(parsed)) stanzas = parsed as Array<{ number?: number; text?: string }>;
    } catch {
      // Preserve legacy raw lyrics below.
    }
  }
  const lyrics = stanzas.length > 0
    ? stanzas.map((stanza) => stanza.text ?? "").filter(Boolean).join("\n\n")
    : typeof hymn.stanzas === "string" && !hymn.stanzas.trim().startsWith("[")
      ? hymn.stanzas
      : "";
  return { ...hymn, stanzas, lyrics };
}

export const hymnsRouter = createRouter({
  list: publicQuery
    .input(
      z
        .object({
          search: z.string().trim().max(100).optional(),
          category: z.string().trim().max(100).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();

      if (input?.search) {
        const search = `%${input.search}%`;
        const rows = await db
          .select()
          .from(hymns)
          .where(
            or(
              like(hymns.title, search),
              like(hymns.author, search),
              like(hymns.category, search),
              sql`${hymns.stanzas}::text ILIKE ${search}`
            )
          )
          .orderBy(hymns.hymnNumber);
        return rows.map(normalizeHymn);
      }

      if (input?.category) {
        const rows = await db
          .select()
          .from(hymns)
          .where(like(hymns.category, `%${input.category}%`))
          .orderBy(hymns.hymnNumber);
        return rows.map(normalizeHymn);
      }

      const rows = await db.select().from(hymns).orderBy(hymns.hymnNumber);
      return rows.map(normalizeHymn);
    }),

  byId: publicQuery
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const row = await db.query.hymns.findFirst({ where: eq(hymns.id, input.id) });
      return row ? normalizeHymn(row) : null;
    }),

  byNumber: publicQuery
    .input(z.object({ hymnNumber: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const row = await db.query.hymns.findFirst({ where: eq(hymns.hymnNumber, input.hymnNumber) });
      return row ? normalizeHymn(row) : null;
    }),

  random: publicQuery.query(async () => {
    const db = await getDb();
    const result = await db
      .select()
      .from(hymns)
      .orderBy(sql`RANDOM()`)
      .limit(1);
    return result[0] ? normalizeHymn(result[0]) : null;
  }),

  categories: publicQuery.query(async () => {
    const db = await getDb();
    const result = await db
      .select({ category: hymns.category })
      .from(hymns)
      .groupBy(hymns.category)
      .orderBy(hymns.category);
    return result.map((r) => r.category).filter(Boolean);
  }),
});
