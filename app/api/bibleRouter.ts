import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { bibleBooks, bibleVerses } from "@db/schema";
import { eq, and, sql, like } from "drizzle-orm";

export const bibleRouter = createRouter({
  books: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(bibleBooks).orderBy(bibleBooks.order);
  }),

  bookById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.query.bibleBooks.findFirst({
        where: eq(bibleBooks.id, input.id),
      });
    }),

  chapters: publicQuery
    .input(z.object({ bookNumber: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const book = await db.query.bibleBooks.findFirst({
        where: eq(bibleBooks.bookNumber, input.bookNumber),
      });

      if (!book) return [];

      // Get all unique chapters for this book
      const result = await db
        .select({ chapter: bibleVerses.chapter })
        .from(bibleVerses)
        .where(eq(bibleVerses.bookNumber, input.bookNumber))
        .groupBy(bibleVerses.chapter)
        .orderBy(bibleVerses.chapter);

      return result.map((r) => r.chapter);
    }),

  verses: publicQuery
    .input(
      z.object({
        bookNumber: z.number(),
        chapter: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(bibleVerses)
        .where(
          and(
            eq(bibleVerses.bookNumber, input.bookNumber),
            eq(bibleVerses.chapter, input.chapter)
          )
        )
        .orderBy(bibleVerses.verse);
    }),

  verse: publicQuery
    .input(
      z.object({
        bookNumber: z.number(),
        chapter: z.number(),
        verse: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(bibleVerses)
        .where(
          and(
            eq(bibleVerses.bookNumber, input.bookNumber),
            eq(bibleVerses.chapter, input.chapter),
            eq(bibleVerses.verse, input.verse)
          )
        )
        .then((rows) => rows[0] ?? null);
    }),

  search: publicQuery
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select({
          id: bibleVerses.id,
          bookNumber: bibleVerses.bookNumber,
          chapter: bibleVerses.chapter,
          verse: bibleVerses.verse,
          text: bibleVerses.text,
        })
        .from(bibleVerses)
        .where(like(bibleVerses.text, `%${input.query}%`))
        .limit(50);
    }),

  randomVerse: publicQuery.query(async () => {
    const db = getDb();
    // Get a random verse using ORDER BY RAND()
    const result = await db
      .select()
      .from(bibleVerses)
      .orderBy(sql`RAND()`)
      .limit(1);

    if (result.length === 0) return null;

    // Get the book name
    const book = await db.query.bibleBooks.findFirst({
      where: eq(bibleBooks.bookNumber, result[0].bookNumber),
    });

    return {
      ...result[0],
      bookName: book?.name ?? "",
    };
  }),
});
