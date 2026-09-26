import { relations } from "drizzle-orm";
import {
  users, bibleBooks, bibleVerses, devotionals, telegramMessages,
  userFavorites, userReadingProgress,
  // ─── Community Tables ───
  communities, communityMembers, groups, groupMembers,
  readingLogs, announcements, announcementReads,
  readingPlans, readingAssignments, assignmentSubmissions,
  reflections, attendanceSessions, attendanceRecords,
  pushTokens, notifications, auditLogs,
} from "./schema";

// ═══════════════════════════════════════════════════════════════════════════════
// ORIGINAL TABLE RELATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const usersRelations = relations(users, ({ many }) => ({
  favorites: many(userFavorites),
  readingProgress: many(userReadingProgress),
  // Community relations
  communityMemberships: many(communityMembers),
  groupMemberships: many(groupMembers),
  readingLogs: many(readingLogs),
  announcementsAuthored: many(announcements),
  reflections: many(reflections),
  pushTokens: many(pushTokens),
  notifications: many(notifications),
  attendanceRecords: many(attendanceRecords),
  auditLogs: many(auditLogs),
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

// ═══════════════════════════════════════════════════════════════════════════════
// COMMUNITY TABLE RELATIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Communities ──────────────────────────────────────────────────────────────
export const communitiesRelations = relations(communities, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [communities.createdBy],
    references: [users.id],
  }),
  members: many(communityMembers),
  groups: many(groups),
  announcements: many(announcements),
  readingPlans: many(readingPlans),
  readingAssignments: many(readingAssignments),
  notifications: many(notifications),
}));

// ─── Community Members ───────────────────────────────────────────────────────
export const communityMembersRelations = relations(communityMembers, ({ one }) => ({
  community: one(communities, {
    fields: [communityMembers.communityId],
    references: [communities.id],
  }),
  user: one(users, {
    fields: [communityMembers.userId],
    references: [users.id],
  }),
  invitedByUser: one(users, {
    fields: [communityMembers.invitedBy],
    references: [users.id],
    relationName: "communityMemberInviter",
  }),
}));

// ─── Groups ──────────────────────────────────────────────────────────────────
export const groupsRelations = relations(groups, ({ one, many }) => ({
  community: one(communities, {
    fields: [groups.communityId],
    references: [communities.id],
  }),
  createdByUser: one(users, {
    fields: [groups.createdBy],
    references: [users.id],
  }),
  members: many(groupMembers),
  readingLogs: many(readingLogs),
  announcements: many(announcements),
  readingPlans: many(readingPlans),
  readingAssignments: many(readingAssignments),
  assignmentSubmissions: many(assignmentSubmissions),
  reflections: many(reflections),
  attendanceSessions: many(attendanceSessions),
  attendanceRecords: many(attendanceRecords),
  notifications: many(notifications),
}));

// ─── Group Members ───────────────────────────────────────────────────────────
export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
  invitedByUser: one(users, {
    fields: [groupMembers.invitedBy],
    references: [users.id],
    relationName: "groupMemberInviter",
  }),
}));

// ─── Reading Logs ────────────────────────────────────────────────────────────
export const readingLogsRelations = relations(readingLogs, ({ one }) => ({
  user: one(users, {
    fields: [readingLogs.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [readingLogs.groupId],
    references: [groups.id],
  }),
}));

// ─── Announcements ──────────────────────────────────────────────────────────
export const announcementsRelations = relations(announcements, ({ one, many }) => ({
  group: one(groups, {
    fields: [announcements.groupId],
    references: [groups.id],
  }),
  community: one(communities, {
    fields: [announcements.communityId],
    references: [communities.id],
  }),
  author: one(users, {
    fields: [announcements.authorId],
    references: [users.id],
  }),
  reads: many(announcementReads),
}));

// ─── Announcement Reads ─────────────────────────────────────────────────────
export const announcementReadsRelations = relations(announcementReads, ({ one }) => ({
  announcement: one(announcements, {
    fields: [announcementReads.announcementId],
    references: [announcements.id],
  }),
  user: one(users, {
    fields: [announcementReads.userId],
    references: [users.id],
  }),
}));

// ─── Reading Plans ──────────────────────────────────────────────────────────
export const readingPlansRelations = relations(readingPlans, ({ one, many }) => ({
  community: one(communities, {
    fields: [readingPlans.communityId],
    references: [communities.id],
  }),
  group: one(groups, {
    fields: [readingPlans.groupId],
    references: [groups.id],
  }),
  author: one(users, {
    fields: [readingPlans.authorId],
    references: [users.id],
  }),
  assignments: many(readingAssignments),
}));

// ─── Reading Assignments ────────────────────────────────────────────────────
export const readingAssignmentsRelations = relations(readingAssignments, ({ one, many }) => ({
  community: one(communities, {
    fields: [readingAssignments.communityId],
    references: [communities.id],
  }),
  group: one(groups, {
    fields: [readingAssignments.groupId],
    references: [groups.id],
  }),
  readingPlan: one(readingPlans, {
    fields: [readingAssignments.readingPlanId],
    references: [readingPlans.id],
  }),
  createdByUser: one(users, {
    fields: [readingAssignments.createdBy],
    references: [users.id],
  }),
  submissions: many(assignmentSubmissions),
  reflections: many(reflections),
}));

// ─── Assignment Submissions ─────────────────────────────────────────────────
export const assignmentSubmissionsRelations = relations(assignmentSubmissions, ({ one }) => ({
  assignment: one(readingAssignments, {
    fields: [assignmentSubmissions.assignmentId],
    references: [readingAssignments.id],
  }),
  user: one(users, {
    fields: [assignmentSubmissions.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [assignmentSubmissions.groupId],
    references: [groups.id],
  }),
  gradedByUser: one(users, {
    fields: [assignmentSubmissions.gradedBy],
    references: [users.id],
    relationName: "submissionGrader",
  }),
}));

// ─── Reflections ────────────────────────────────────────────────────────────
export const reflectionsRelations = relations(reflections, ({ one }) => ({
  submission: one(assignmentSubmissions, {
    fields: [reflections.submissionId],
    references: [assignmentSubmissions.id],
  }),
  readingAssignment: one(readingAssignments, {
    fields: [reflections.readingAssignmentId],
    references: [readingAssignments.id],
  }),
  user: one(users, {
    fields: [reflections.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [reflections.groupId],
    references: [groups.id],
  }),
}));

// ─── Attendance Sessions ────────────────────────────────────────────────────
export const attendanceSessionsRelations = relations(attendanceSessions, ({ one, many }) => ({
  group: one(groups, {
    fields: [attendanceSessions.groupId],
    references: [groups.id],
  }),
  recordedByUser: one(users, {
    fields: [attendanceSessions.recordedBy],
    references: [users.id],
  }),
  records: many(attendanceRecords),
}));

// ─── Attendance Records ─────────────────────────────────────────────────────
export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
  session: one(attendanceSessions, {
    fields: [attendanceRecords.sessionId],
    references: [attendanceSessions.id],
  }),
  group: one(groups, {
    fields: [attendanceRecords.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [attendanceRecords.userId],
    references: [users.id],
  }),
}));

// ─── Push Tokens ────────────────────────────────────────────────────────────
export const pushTokensRelations = relations(pushTokens, ({ one }) => ({
  user: one(users, {
    fields: [pushTokens.userId],
    references: [users.id],
  }),
}));

// ─── Notifications ──────────────────────────────────────────────────────────
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  community: one(communities, {
    fields: [notifications.communityId],
    references: [communities.id],
  }),
  group: one(groups, {
    fields: [notifications.groupId],
    references: [groups.id],
  }),
}));

// ─── Audit Logs ─────────────────────────────────────────────────────────────
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
  }),
}));
