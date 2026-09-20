import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { bibleBooks, bibleVerses } from "@db/schema";
import { eq, and, sql, like } from "drizzle-orm";
import { bibleService, POPULAR_TRANSLATIONS } from "./lib/bibleService";

export const bibleRouter = createRouter({
  translations: publicQuery.query(async () => {
    try {
      const list = await bibleService.getTranslations();
      return list;
    } catch {
      return POPULAR_TRANSLATIONS;
    }
  }),

  popularTranslations: publicQuery.query(() => {
    return POPULAR_TRANSLATIONS;
  }),

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
      try {
        const book = await db.query.bibleBooks.findFirst({
          where: eq(bibleBooks.bookNumber, input.bookNumber),
        });

        if (!book) return [];

        // If chapters count is known on book metadata, generate 1..chapters
        if (book.chapters && book.chapters > 0) {
          return Array.from({ length: book.chapters }, (_, i) => i + 1);
        }

        // Otherwise get all unique chapters for this book from verses
        const result = await db
          .select({ chapter: bibleVerses.chapter })
          .from(bibleVerses)
          .where(eq(bibleVerses.bookNumber, input.bookNumber))
          .groupBy(bibleVerses.chapter)
          .orderBy(bibleVerses.chapter);

        return result.map((r) => r.chapter);
      } catch {
        // Fallback: return chapters based on book
        const book = await db.query.bibleBooks.findFirst({
          where: eq(bibleBooks.bookNumber, input.bookNumber),
        });
        if (book?.chapters) {
          return Array.from({ length: book.chapters }, (_, i) => i + 1);
        }
        return [];
      }
    }),

  verses: publicQuery
    .input(
      z.object({
        bookNumber: z.number(),
        chapter: z.number(),
        translation: z.string().optional().default("KJV"),
      })
    )
    .query(async ({ input }) => {
      const translation = (input.translation || "KJV").toUpperCase();

      // If translation is KJV, try querying local DB first
      if (translation === "KJV") {
        try {
          const db = getDb();
          const rows = await db
            .select()
            .from(bibleVerses)
            .where(
              and(
                eq(bibleVerses.bookNumber, input.bookNumber),
                eq(bibleVerses.chapter, input.chapter)
              )
            )
            .orderBy(bibleVerses.verse);

          if (rows && rows.length > 0) {
            return rows.map((r) => ({
              ...r,
              translation: "KJV",
            }));
          }
        } catch {
          // If local DB is not accessible or empty, fall back to online service
        }
      }

      // Fetch from multi-version Bible service (Bolls Life API)
      return bibleService.getChapter(translation, input.bookNumber, input.chapter);
    }),

  verse: publicQuery
    .input(
      z.object({
        bookNumber: z.number(),
        chapter: z.number(),
        verse: z.number(),
        translation: z.string().optional().default("KJV"),
      })
    )
    .query(async ({ input }) => {
      const translation = (input.translation || "KJV").toUpperCase();

      if (translation === "KJV") {
        try {
          const db = getDb();
          const row = await db
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

          if (row) {
            return { ...row, translation: "KJV" };
          }
        } catch {
          // Fall back
        }
      }

      const chapterVerses = await bibleService.getChapter(
        translation,
        input.bookNumber,
        input.chapter
      );
      return chapterVerses.find((v) => v.verse === input.verse) ?? null;
    }),

  compareVerse: publicQuery
    .input(
      z.object({
        bookNumber: z.number(),
        chapter: z.number(),
        verse: z.number(),
        translations: z.array(z.string()).optional(),
      })
    )
    .query(async ({ input }) => {
      return bibleService.compareVerse(
        input.bookNumber,
        input.chapter,
        input.verse,
        input.translations ?? ["KJV", "WEB", "ESV", "NIV"]
      );
    }),

  search: publicQuery
    .input(
      z.object({
        query: z.string().min(1),
        translation: z.string().optional().default("KJV"),
      })
    )
    .query(async ({ input }) => {
      const translation = (input.translation || "KJV").toUpperCase();

      if (translation === "KJV") {
        try {
          const db = getDb();
          const dbResults = await db
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

          if (dbResults && dbResults.length > 0) {
            return dbResults.map((r) => ({ ...r, translation: "KJV" }));
          }
        } catch {
          // Fall back
        }
      }

      return bibleService.search(translation, input.query);
    }),

  randomVerse: publicQuery
    .input(
      z
        .object({
          translation: z.string().optional().default("KJV"),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      try {
        const result = await db
          .select()
          .from(bibleVerses)
          .orderBy(sql`RAND()`)
          .limit(1);

        if (result.length > 0) {
          const book = await db.query.bibleBooks.findFirst({
            where: eq(bibleBooks.bookNumber, result[0].bookNumber),
          });
          return {
            ...result[0],
            bookName: book?.name ?? "",
            translation: "KJV",
          };
        }
      } catch {
        // Fall back
      }

      // Default inspirational fallback: John 3:16 in requested translation
      const trans = input?.translation ?? "KJV";
      const verses = await bibleService.getChapter(trans, 43, 3);
      const j16 = verses.find((v) => v.verse === 16);
      return {
        id: 43003016,
        bookNumber: 43,
        chapter: 3,
        verse: 16,
        text: j16?.text ?? "For God so loved the world, that he gave his only begotten Son...",
        bookName: "John",
        translation: trans,
      };
    }),
});
