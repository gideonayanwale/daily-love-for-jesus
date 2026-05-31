import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  int,
  bigint,
  json,
  index,
  boolean,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Bible Books ─────────────────────────────────────────────────────
export const bibleBooks = mysqlTable("bible_books", {
  id: serial("id").primaryKey(),
  bookNumber: int("book_number").notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  shortName: varchar("short_name", { length: 20 }).notNull(),
  testament: mysqlEnum("testament", ["old", "new"]).notNull(),
  genre: varchar("genre", { length: 50 }),
  chapters: int("chapters").notNull(),
  order: int("order").notNull(),
}, (table) => ({
  testamentIdx: index("testament_idx").on(table.testament),
}));

export type BibleBook = typeof bibleBooks.$inferSelect;
export type InsertBibleBook = typeof bibleBooks.$inferInsert;

// ─── Bible Verses ────────────────────────────────────────────────────
export const bibleVerses = mysqlTable(
  "bible_verses",
  {
    id: serial("id").primaryKey(),
    bookId: bigint("book_id", { mode: "number", unsigned: true }).notNull(),
    bookNumber: int("book_number").notNull(),
    chapter: int("chapter").notNull(),
    verse: int("verse").notNull(),
    text: text("text").notNull(),
  },
  (table) => ({
    bookChapterIdx: index("book_chapter_idx").on(table.bookNumber, table.chapter),
    bookIdIdx: index("book_id_idx").on(table.bookId),
  }),
);

export type BibleVerse = typeof bibleVerses.$inferSelect;
export type InsertBibleVerse = typeof bibleVerses.$inferInsert;

// ─── Hymns ───────────────────────────────────────────────────────────
export const hymns = mysqlTable(
  "hymns",
  {
    id: serial("id").primaryKey(),
    hymnNumber: int("hymn_number").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    author: varchar("author", { length: 255 }),
    composer: varchar("composer", { length: 255 }),
    meter: varchar("meter", { length: 100 }),
    key: varchar("key", { length: 50 }),
    stanzas: json("stanzas").notNull(), // array of { number, text }
    chorus: text("chorus"),
    category: varchar("category", { length: 100 }),
  },
  (table) => ({
    numberIdx: index("hymn_number_idx").on(table.hymnNumber),
    categoryIdx: index("category_idx").on(table.category),
  }),
);

export type Hymn = typeof hymns.$inferSelect;
export type InsertHymn = typeof hymns.$inferInsert;

// ─── Devotionals ─────────────────────────────────────────────────────
export const devotionals = mysqlTable(
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
    source: mysqlEnum("source", ["telegram", "manual", "api"]).default("manual").notNull(),
    telegramMessageId: bigint("telegram_message_id", { mode: "number" }),
    devotionalDate: timestamp("devotional_date").defaultNow().notNull(),
    isPublished: boolean("is_published").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    dateIdx: index("devotional_date_idx").on(table.devotionalDate),
    sourceIdx: index("source_idx").on(table.source),
  }),
);

export type Devotional = typeof devotionals.$inferSelect;
export type InsertDevotional = typeof devotionals.$inferInsert;

// ─── Telegram Messages ───────────────────────────────────────────────
export const telegramMessages = mysqlTable(
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
    devotionalId: bigint("devotional_id", { mode: "number", unsigned: true }),
    receivedAt: timestamp("received_at").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    messageIdx: index("telegram_message_idx").on(table.messageId, table.chatId),
    processedIdx: index("processed_idx").on(table.processed),
  }),
);

export type TelegramMessage = typeof telegramMessages.$inferSelect;
export type InsertTelegramMessage = typeof telegramMessages.$inferInsert;

// ─── User Favorites ──────────────────────────────────────────────────
export const userFavorites = mysqlTable(
  "user_favorites",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
    type: mysqlEnum("type", ["verse", "hymn", "devotional"]).notNull(),
    itemId: bigint("item_id", { mode: "number", unsigned: true }).notNull(),
    reference: varchar("reference", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userTypeIdx: index("user_type_idx").on(table.userId, table.type),
    userItemIdx: index("user_item_idx").on(table.userId, table.itemId),
  }),
);

export type UserFavorite = typeof userFavorites.$inferSelect;
export type InsertUserFavorite = typeof userFavorites.$inferInsert;

// ─── User Reading Progress ───────────────────────────────────────────
export const userReadingProgress = mysqlTable(
  "user_reading_progress",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
    bookId: bigint("book_id", { mode: "number", unsigned: true }).notNull(),
    chapter: int("chapter").notNull(),
    lastVerse: int("last_verse").default(0),
    completed: boolean("completed").default(false).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    userBookIdx: index("user_book_idx").on(table.userId, table.bookId),
  }),
);

export type UserReadingProgress = typeof userReadingProgress.$inferSelect;
export type InsertUserReadingProgress = typeof userReadingProgress.$inferInsert;
