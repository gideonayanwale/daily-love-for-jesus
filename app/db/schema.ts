import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  bigint,
  jsonb,
  index,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";

// ─── Users (Synced with Supabase Auth auth.users) ────────────────────────────
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(), // Matches auth.users.id
    email: varchar("email", { length: 320 }),
    name: varchar("name", { length: 255 }),
    avatar: text("avatar"),
    role: varchar("role", { length: 50 }).default("user").notNull(), // 'user' | 'admin'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_users_role").on(table.role),
  ]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Bible Books ─────────────────────────────────────────────────────────────
export const bibleBooks = pgTable(
  "bible_books",
  {
    id: serial("id").primaryKey(),
    bookNumber: integer("book_number").notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    shortName: varchar("short_name", { length: 20 }).notNull(),
    testament: varchar("testament", { length: 10 }).notNull(), // 'old' | 'new'
    genre: varchar("genre", { length: 50 }),
    chapters: integer("chapters").notNull(),
    order: integer("order").notNull(),
  },
  (table) => [
    index("idx_bible_books_testament").on(table.testament),
    index("idx_bible_books_order").on(table.order),
  ]
);

export type BibleBook = typeof bibleBooks.$inferSelect;
export type InsertBibleBook = typeof bibleBooks.$inferInsert;

// ─── Bible Verses ────────────────────────────────────────────────────────────
export const bibleVerses = pgTable(
  "bible_verses",
  {
    id: serial("id").primaryKey(),
    bookId: bigint("book_id", { mode: "number" }).notNull(),
    bookNumber: integer("book_number").notNull(),
    chapter: integer("chapter").notNull(),
    verse: integer("verse").notNull(),
    text: text("text").notNull(),
  },
  (table) => [
    index("idx_bible_verses_book_chapter").on(table.bookNumber, table.chapter),
    index("idx_bible_verses_book_id").on(table.bookId),
  ]
);

export type BibleVerse = typeof bibleVerses.$inferSelect;
export type InsertBibleVerse = typeof bibleVerses.$inferInsert;

// ─── Hymns ───────────────────────────────────────────────────────────────────
export const hymns = pgTable(
  "hymns",
  {
    id: serial("id").primaryKey(),
    hymnNumber: integer("hymn_number").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    author: varchar("author", { length: 255 }),
    composer: varchar("composer", { length: 255 }),
    meter: varchar("meter", { length: 100 }),
    key: varchar("key", { length: 50 }),
    stanzas: jsonb("stanzas").notNull(), // array of { number: number, text: string }
    chorus: text("chorus"),
    category: varchar("category", { length: 100 }),
  },
  (table) => [
    index("idx_hymns_number").on(table.hymnNumber),
    index("idx_hymns_category").on(table.category),
  ]
);

export type Hymn = typeof hymns.$inferSelect;
export type InsertHymn = typeof hymns.$inferInsert;

// ─── Devotionals ─────────────────────────────────────────────────────────────
export const devotionals = pgTable(
  "devotionals",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 500 }).notNull(),
    scripture: varchar("scripture", { length: 500 }),
    scriptureText: text("scripture_text"),
    body: text("body").notNull(),
    reflection: text("reflection"),
    prayer: text("prayer"),
    author: varchar("author", { length: 255 }),
    source: varchar("source", { length: 50 }).default("manual").notNull(), // 'telegram' | 'manual' | 'api'
    telegramMessageId: bigint("telegram_message_id", { mode: "number" }),
    devotionalDate: timestamp("devotional_date", { withTimezone: true }).defaultNow().notNull(),
    isPublished: boolean("is_published").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_devotionals_date").on(table.devotionalDate),
    index("idx_devotionals_published").on(table.isPublished),
  ]
);

export type Devotional = typeof devotionals.$inferSelect;
export type InsertDevotional = typeof devotionals.$inferInsert;

// ─── Telegram Messages ───────────────────────────────────────────────────────
export const telegramMessages = pgTable(
  "telegram_messages",
  {
    id: serial("id").primaryKey(),
    messageId: bigint("message_id", { mode: "number" }).notNull(),
    chatId: bigint("chat_id", { mode: "number" }).notNull(),
    chatTitle: varchar("chat_title", { length: 500 }),
    senderId: bigint("sender_id", { mode: "number" }),
    senderName: varchar("sender_name", { length: 255 }),
    text: text("text").notNull(),
    mediaUrl: text("media_url"),
    processed: boolean("processed").default(false).notNull(),
    devotionalId: bigint("devotional_id", { mode: "number" }),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_telegram_msg").on(table.messageId, table.chatId),
    index("idx_telegram_processed").on(table.processed),
  ]
);

export type TelegramMessage = typeof telegramMessages.$inferSelect;
export type InsertTelegramMessage = typeof telegramMessages.$inferInsert;

// ─── User Favorites ──────────────────────────────────────────────────────────
export const userFavorites = pgTable(
  "user_favorites",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(), // 'verse' | 'hymn' | 'devotional'
    itemId: bigint("item_id", { mode: "number" }).notNull(),
    reference: varchar("reference", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_user_favorites_user_type").on(table.userId, table.type),
    index("idx_user_favorites_user_item").on(table.userId, table.itemId),
  ]
);

export type UserFavorite = typeof userFavorites.$inferSelect;
export type InsertUserFavorite = typeof userFavorites.$inferInsert;

// ─── User Reading Progress ───────────────────────────────────────────────────
export const userReadingProgress = pgTable(
  "user_reading_progress",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    bookId: bigint("book_id", { mode: "number" }).notNull().references(() => bibleBooks.id, { onDelete: "cascade" }),
    chapter: integer("chapter").notNull(),
    lastVerse: integer("last_verse").default(0),
    completed: boolean("completed").default(false).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_reading_progress_user_book").on(table.userId, table.bookId),
  ]
);

export type UserReadingProgress = typeof userReadingProgress.$inferSelect;
export type InsertUserReadingProgress = typeof userReadingProgress.$inferInsert;
