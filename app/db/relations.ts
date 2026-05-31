import { relations } from "drizzle-orm";
import { users, bibleBooks, bibleVerses, devotionals, telegramMessages, userFavorites, userReadingProgress } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  favorites: many(userFavorites),
  readingProgress: many(userReadingProgress),
}));

export const bibleBooksRelations = relations(bibleBooks, ({ many }) => ({
  verses: many(bibleVerses),
}));

export const bibleVersesRelations = relations(bibleVerses, ({ one }) => ({
  book: one(bibleBooks, {
    fields: [bibleVerses.bookId],
    references: [bibleBooks.id],
  }),
}));

export const devotionalsRelations = relations(devotionals, ({ one }) => ({
  telegramMessage: one(telegramMessages, {
    fields: [devotionals.telegramMessageId],
    references: [telegramMessages.id],
  }),
}));

export const telegramMessagesRelations = relations(telegramMessages, ({ one }) => ({
  devotional: one(devotionals, {
    fields: [telegramMessages.devotionalId],
    references: [devotionals.id],
  }),
}));

export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
  user: one(users, {
    fields: [userFavorites.userId],
    references: [users.id],
  }),
}));

export const userReadingProgressRelations = relations(userReadingProgress, ({ one }) => ({
  user: one(users, {
    fields: [userReadingProgress.userId],
    references: [users.id],
  }),
  book: one(bibleBooks, {
    fields: [userReadingProgress.bookId],
    references: [bibleBooks.id],
  }),
}));
