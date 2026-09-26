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
  uniqueIndex,
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

// ─── Communities (Multi-Tenant Churches, Fellowships, Ministries) ─────────────
export const communities = pgTable(
  "communities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),
    logo: text("logo"),
    coverImage: text("cover_image"),
    contactEmail: varchar("contact_email", { length: 320 }),
    contactPhone: varchar("contact_phone", { length: 50 }),
    location: varchar("location", { length: 255 }),
    timezone: varchar("timezone", { length: 100 }).default("UTC").notNull(),
    brandingSettings: jsonb("branding_settings"),
    joinSettings: jsonb("join_settings"),
    status: varchar("status", { length: 50 }).default("active").notNull(), // 'active' | 'inactive' | 'archived'
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_communities_slug").on(table.slug),
    index("idx_communities_status").on(table.status),
  ]
);

export type Community = typeof communities.$inferSelect;
export type InsertCommunity = typeof communities.$inferInsert;

// ─── Community Members ────────────────────────────────────────────────────────
export const communityMembers = pgTable(
  "community_members",
  {
    id: serial("id").primaryKey(),
    communityId: uuid("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 50 }).default("MEMBER").notNull(), // 'COMMUNITY_OWNER' | 'COMMUNITY_ADMIN' | 'COMMUNITY_MODERATOR' | 'MEMBER'
    status: varchar("status", { length: 50 }).default("active").notNull(), // 'pending' | 'active' | 'suspended' | 'removed' | 'invited'
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    metadata: jsonb("metadata"),
  },
  (table) => [
    index("idx_comm_members_comm_user").on(table.communityId, table.userId),
    index("idx_comm_members_user").on(table.userId),
  ]
);

export type CommunityMember = typeof communityMembers.$inferSelect;
export type InsertCommunityMember = typeof communityMembers.$inferInsert;

// ─── Groups (Sunday School Classes, Small Groups, Discipleship) ───────────────
export const groups = pgTable(
  "groups",
  {
    id: serial("id").primaryKey(),
    communityId: uuid("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    description: text("description"),
    groupImage: text("group_image"),
    category: varchar("category", { length: 100 }).default("Sunday School").notNull(),
    joinMethod: varchar("join_method", { length: 50 }).default("code").notNull(), // 'open' | 'code' | 'request' | 'invite_only'
    inviteCode: varchar("invite_code", { length: 10 }).unique(), // 6-digit class code, e.g. 'LF8421' or '482910'
    qrCodeToken: varchar("qr_code_token", { length: 64 }).unique(),
    privacySetting: varchar("privacy_setting", { length: 50 }).default("public").notNull(), // 'public' | 'private' | 'hidden'
    status: varchar("status", { length: 50 }).default("active").notNull(), // 'active' | 'inactive' | 'archived'
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_groups_community").on(table.communityId),
    index("idx_groups_invite_code").on(table.inviteCode),
    index("idx_groups_status").on(table.status),
  ]
);

export type Group = typeof groups.$inferSelect;
export type InsertGroup = typeof groups.$inferInsert;

// ─── Group Memberships (Students, Teachers, Assistants) ──────────────────────
export const groupMembers = pgTable(
  "group_members",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 50 }).default("student").notNull(), // 'teacher' | 'assistant_teacher' | 'student' | 'moderator'
    status: varchar("status", { length: 50 }).default("active").notNull(), // 'pending' | 'active' | 'suspended' | 'removed'
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    index("idx_group_members_group_user").on(table.groupId, table.userId),
    index("idx_group_members_user").on(table.userId),
    index("idx_group_members_group_role").on(table.groupId, table.role),
  ]
);

export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = typeof groupMembers.$inferInsert;

// ─── Reading Logs (Granular Progress, Streaks & Batch Offline Sync) ───────────
export const readingLogs = pgTable(
  "reading_logs",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    groupId: integer("group_id").references(() => groups.id, { onDelete: "cascade" }),
    contentId: varchar("content_id", { length: 100 }).notNull(), // e.g. 'bible:40:5' (Matthew 5) or 'devotional:12'
    contentType: varchar("content_type", { length: 50 }).default("bible_chapter").notNull(), // 'bible_chapter' | 'devotional' | 'reading_assignment'
    bookNumber: integer("book_number"),
    chapter: integer("chapter"),
    timeSpent: integer("time_spent").default(0).notNull(), // seconds
    scrollDepth: integer("scroll_depth").default(100), // percentage
    completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
    clientLogId: varchar("client_log_id", { length: 100 }).unique(), // Idempotency key from mobile client
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_reading_logs_user_completed").on(table.userId, table.completedAt),
    index("idx_reading_logs_group_completed").on(table.groupId, table.completedAt),
    index("idx_reading_logs_content").on(table.contentId),
  ]
);

export type ReadingLog = typeof readingLogs.$inferSelect;
export type InsertReadingLog = typeof readingLogs.$inferInsert;

// ─── Announcements (Group & Community-scoped) ────────────────────────────────
export const announcements = pgTable(
  "announcements",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    communityId: uuid("community_id").references(() => communities.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    priority: varchar("priority", { length: 50 }).default("normal").notNull(), // 'normal' | 'high' | 'urgent'
    announcementType: varchar("announcement_type", { length: 50 }).default("general").notNull(), // 'general' | 'assignment' | 'event' | 'reminder'
    pushNotificationSent: boolean("push_notification_sent").default(false).notNull(),
    status: varchar("status", { length: 50 }).default("published").notNull(), // 'draft' | 'published' | 'archived'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_announcements_group").on(table.groupId),
    index("idx_announcements_created").on(table.createdAt),
  ]
);

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = typeof announcements.$inferInsert;

// ─── Announcement Reads (Read Receipts) ───────────────────────────────────────
export const announcementReads = pgTable(
  "announcement_reads",
  {
    id: serial("id").primaryKey(),
    announcementId: integer("announcement_id").notNull().references(() => announcements.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_announcement_reads_ann_user").on(table.announcementId, table.userId),
  ]
);

export type AnnouncementRead = typeof announcementReads.$inferSelect;
export type InsertAnnouncementRead = typeof announcementReads.$inferInsert;

// ─── Reading Plans (Structured Multi-Day Curricula) ──────────────────────────
export const readingPlans = pgTable(
  "reading_plans",
  {
    id: serial("id").primaryKey(),
    communityId: uuid("community_id").references(() => communities.id, { onDelete: "cascade" }),
    groupId: integer("group_id").references(() => groups.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    durationDays: integer("duration_days").default(7).notNull(),
    isPublic: boolean("is_public").default(true).notNull(),
    schedule: jsonb("schedule").notNull(), // array of { day: number, bookNumber: number, chapter: number, startVerse?: number, endVerse?: number, title: string }
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_reading_plans_community").on(table.communityId),
    index("idx_reading_plans_group").on(table.groupId),
  ]
);

export type ReadingPlan = typeof readingPlans.$inferSelect;
export type InsertReadingPlan = typeof readingPlans.$inferInsert;

// ─── Reading Assignments (Weekly / Periodic Group Tasks) ──────────────────────
export const readingAssignments = pgTable(
  "reading_assignments",
  {
    id: serial("id").primaryKey(),
    communityId: uuid("community_id").references(() => communities.id, { onDelete: "cascade" }),
    groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    readingPlanId: integer("reading_plan_id").references(() => readingPlans.id, { onDelete: "set null" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    bookNumber: integer("book_number").notNull(),
    chapter: integer("chapter").notNull(),
    startVerse: integer("start_verse"),
    endVerse: integer("end_verse"),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    isRequired: boolean("is_required").default(true).notNull(),
    reflectionPrompt: text("reflection_prompt"),
    status: varchar("status", { length: 50 }).default("published").notNull(), // 'draft' | 'published' | 'closed' | 'archived'
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_reading_assignments_group_due").on(table.groupId, table.dueDate),
  ]
);

export type ReadingAssignment = typeof readingAssignments.$inferSelect;
export type InsertReadingAssignment = typeof readingAssignments.$inferInsert;

// ─── Assignment Submissions ──────────────────────────────────────────────────
export const assignmentSubmissions = pgTable(
  "assignment_submissions",
  {
    id: serial("id").primaryKey(),
    assignmentId: integer("assignment_id").notNull().references(() => readingAssignments.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 50 }).default("submitted").notNull(), // 'started' | 'submitted' | 'graded'
    notes: text("notes"),
    teacherFeedback: text("teacher_feedback"),
    gradedBy: uuid("graded_by").references(() => users.id, { onDelete: "set null" }),
    gradedAt: timestamp("graded_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_submissions_assignment_user").on(table.assignmentId, table.userId),
    index("idx_submissions_group").on(table.groupId),
  ]
);

export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;
export type InsertAssignmentSubmission = typeof assignmentSubmissions.$inferInsert;

// ─── Reflections (Private or Teacher-Visible Spiritual Journaling) ────────────
export const reflections = pgTable(
  "reflections",
  {
    id: serial("id").primaryKey(),
    submissionId: integer("submission_id").references(() => assignmentSubmissions.id, { onDelete: "cascade" }),
    readingAssignmentId: integer("reading_assignment_id").references(() => readingAssignments.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    groupId: integer("group_id").references(() => groups.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    visibility: varchar("visibility", { length: 50 }).default("teacher_only").notNull(), // 'private' | 'teacher_only' | 'group_members'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_reflections_user").on(table.userId),
    index("idx_reflections_assignment").on(table.readingAssignmentId),
  ]
);

export type Reflection = typeof reflections.$inferSelect;
export type InsertReflection = typeof reflections.$inferInsert;

// ─── Attendance Sessions & Records ───────────────────────────────────────────
export const attendanceSessions = pgTable(
  "attendance_sessions",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    sessionDate: timestamp("session_date", { withTimezone: true }).defaultNow().notNull(),
    sessionType: varchar("session_type", { length: 50 }).default("sunday_school").notNull(), // 'sunday_school' | 'bible_study' | 'prayer_meeting' | 'event'
    recordedBy: uuid("recorded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_attendance_sessions_group").on(table.groupId, table.sessionDate),
  ]
);

export type AttendanceSession = typeof attendanceSessions.$inferSelect;
export type InsertAttendanceSession = typeof attendanceSessions.$inferInsert;

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id").notNull().references(() => attendanceSessions.id, { onDelete: "cascade" }),
    groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 50 }).default("present").notNull(), // 'present' | 'absent' | 'excused' | 'late'
    notes: text("notes"),
    markedAt: timestamp("marked_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_attendance_records_session_user").on(table.sessionId, table.userId),
    index("idx_attendance_records_user").on(table.userId),
  ]
);

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAttendanceRecord = typeof attendanceRecords.$inferInsert;

// ─── Push Tokens (For Targeted Push Notifications) ───────────────────────────
export const pushTokens = pgTable(
  "push_tokens",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 255 }).notNull().unique(),
    platform: varchar("platform", { length: 50 }).default("expo").notNull(), // 'expo' | 'fcm' | 'apns'
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_push_tokens_user").on(table.userId),
  ]
);

export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = typeof pushTokens.$inferInsert;

// ─── Notifications (In-App Feed) ─────────────────────────────────────────────
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    communityId: uuid("community_id").references(() => communities.id, { onDelete: "cascade" }),
    groupId: integer("group_id").references(() => groups.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    category: varchar("category", { length: 50 }).default("announcement").notNull(), // 'announcement' | 'assignment' | 'reminder' | 'system'
    resourceType: varchar("resource_type", { length: 50 }),
    resourceId: varchar("resource_id", { length: 100 }),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_notifications_user_read").on(table.userId, table.isRead),
    index("idx_notifications_created").on(table.createdAt),
  ]
);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── Audit Logs (Security & Compliance Tracking) ─────────────────────────────
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    communityId: uuid("community_id"),
    groupId: integer("group_id"),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 100 }).notNull(),
    resourceType: varchar("resource_type", { length: 50 }).notNull(),
    resourceId: varchar("resource_id", { length: 100 }),
    metadata: jsonb("metadata"),
    ipAddress: varchar("ip_address", { length: 50 }),
    userAgent: text("user_agent"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_audit_logs_actor").on(table.actorId),
    index("idx_audit_logs_comm").on(table.communityId),
    index("idx_audit_logs_occurred").on(table.occurredAt),
  ]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

