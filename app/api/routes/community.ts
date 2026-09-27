import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../queries/connection";
import {
  groups,
  groupMembers,
  readingLogs,
  announcements,
  attendanceSessions,
  attendanceRecords,
  auditLogs,
  users,
} from "@db/schema";
import { eq, and, sql, desc, inArray, asc } from "drizzle-orm";
import {
  authenticateRequestUser,
  assertGroupRole,
  AuthorizationError,
} from "../lib/rbac";
import { sendTargetedPushNotification } from "../lib/pushNotifications";

export const communityRestRouter = new Hono();

// ─── Input Validation Schemas ───────────────────────────────────────────────

const inviteCodeSchema = z.object({
  groupId: z.number().int().positive(),
  regenerate: z.boolean().optional().default(false),
});

const joinGroupSchema = z.object({
  inviteCode: z.string().trim().min(4).max(10),
});

const readingLogItemSchema = z.object({
  contentId: z.string().min(1), // e.g. "bible:40:5" or "devotional:12"
  contentType: z.enum(["bible_chapter", "devotional", "reading_assignment"]).default("bible_chapter"),
  bookNumber: z.number().int().optional(),
  chapter: z.number().int().optional(),
  timeSpent: z.number().int().nonnegative().default(0), // in seconds
  scrollDepth: z.number().int().min(0).max(100).default(100),
  completedAt: z.string().datetime(), // ISO 8601 string
  clientLogId: z.string().min(1), // unique UUID from offline client queue for idempotency
  groupId: z.number().int().optional(),
});

const syncTrackingSchema = z.object({
  logs: z.array(readingLogItemSchema).min(1).max(500),
});

const announcementCreateSchema = z.object({
  groupId: z.number().int().positive(),
  title: z.string().trim().min(1).max(255),
  body: z.string().trim().min(1),
  priority: z.enum(["normal", "high", "urgent"]).default("normal"),
  announcementType: z.enum(["general", "assignment", "event", "reminder"]).default("general"),
});

// Helper: Generate unique 6-digit alphanumeric code (e.g. "LF8421" or "592814")
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ─── 1. POST /groups/invite - Generate Class Invite Code ─────────────────────
communityRestRouter.post("/groups/invite", async (c) => {
  try {
    const user = await authenticateRequestUser(c.req.raw);
    const body = await c.req.json();
    const { groupId, regenerate } = inviteCodeSchema.parse(body);

    // Security Check: Requester must be teacher or assistant teacher
    await assertGroupRole(user.id, groupId, ["teacher", "assistant_teacher"]);

    const db = getDb();
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });

    if (!group) {
      return c.json({ error: "Group not found" }, 404);
    }

    // Return existing code if available and regenerate is not requested
    if (group.inviteCode && !regenerate) {
      return c.json({
        success: true,
        groupId: group.id,
        groupName: group.name,
        inviteCode: group.inviteCode,
        joinUrl: `/join?code=${group.inviteCode}`,
      });
    }

    // Generate unique code with collision retry
    let newCode = generateInviteCode();
    let collision = true;
    let attempts = 0;

    while (collision && attempts < 10) {
      const existing = await db.query.groups.findFirst({
        where: eq(groups.inviteCode, newCode),
      });
      if (!existing) {
        collision = false;
      } else {
        newCode = generateInviteCode();
        attempts++;
      }
    }

    await db
      .update(groups)
      .set({
        inviteCode: newCode,
        updatedAt: new Date(),
      })
      .where(eq(groups.id, groupId));

    return c.json({
      success: true,
      groupId: group.id,
      groupName: group.name,
      inviteCode: newCode,
      joinUrl: `/join?code=${newCode}`,
    });
  } catch (err: any) {
    if (err instanceof AuthorizationError) {
      return c.json({ error: err.message }, err.statusCode as any);
    }
    if (err instanceof z.ZodError) {
      return c.json({ error: "Validation failed", details: (err as any).issues || (err as any).errors }, 400);
    }

    console.error("[api] /groups/invite error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ─── 2. POST /groups/join - Join Class using 6-Digit Code ───────────────────
communityRestRouter.post("/groups/join", async (c) => {
  try {
    const user = await authenticateRequestUser(c.req.raw);
    const body = await c.req.json();
    const { inviteCode } = joinGroupSchema.parse(body);

    const db = getDb();
    const group = await db.query.groups.findFirst({
      where: eq(groups.inviteCode, inviteCode.toUpperCase()),
    });

    if (!group) {
      return c.json({ error: "Invalid invite code. Class not found." }, 404);
    }

    if (group.status !== "active") {
      return c.json({ error: "This group is no longer accepting new members." }, 400);
    }

    // Check if user is already a member
    const existingMembership = await db.query.groupMembers.findFirst({
      where: and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, user.id)),
    });

    if (existingMembership) {
      if (existingMembership.status === "active") {
        return c.json({
          success: true,
          message: "You are already a member of this group.",
          groupId: group.id,
          groupName: group.name,
          role: existingMembership.role,
        });
      }

      // Re-activate previously left membership
      await db
        .update(groupMembers)
        .set({ status: "active", joinedAt: new Date() })
        .where(eq(groupMembers.id, existingMembership.id));

      return c.json({
        success: true,
        message: "Welcome back! Group membership reactivated.",
        groupId: group.id,
        groupName: group.name,
        role: existingMembership.role,
      });
    }

    // Insert new student membership
    const [membership] = await db
      .insert(groupMembers)
      .values({
        groupId: group.id,
        userId: user.id,
        role: "student",
        status: "active",
      })
      .returning();

    return c.json({
      success: true,
      message: `Successfully joined ${group.name}!`,
      groupId: group.id,
      groupName: group.name,
      membershipId: membership.id,
      role: "student",
    });
  } catch (err: any) {
    if (err instanceof AuthorizationError) {
      return c.json({ error: err.message }, err.statusCode as any);
    }
    if (err instanceof z.ZodError) {
      return c.json({ error: "Validation failed", details: (err as any).issues || (err as any).errors }, 400);
    }

    console.error("[api] /groups/join error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ─── 3. POST /tracking/sync - Batch Offline Reading Log Ingestion ───────────
communityRestRouter.post("/tracking/sync", async (c) => {
  try {
    const user = await authenticateRequestUser(c.req.raw);
    const body = await c.req.json();
    const { logs } = syncTrackingSchema.parse(body);

    const db = getDb();
    const syncedIds: string[] = [];
    const skippedDuplicateIds: string[] = [];

    // Process logs with idempotency on clientLogId
    for (const log of logs) {
      // Check if already synced using unique clientLogId
      const existing = await db.query.readingLogs.findFirst({
        where: eq(readingLogs.clientLogId, log.clientLogId),
      });

      if (existing) {
        skippedDuplicateIds.push(log.clientLogId);
        continue;
      }

      await db.insert(readingLogs).values({
        userId: user.id,
        groupId: log.groupId ?? null,
        contentId: log.contentId,
        contentType: log.contentType,
        bookNumber: log.bookNumber ?? null,
        chapter: log.chapter ?? null,
        timeSpent: log.timeSpent,
        scrollDepth: log.scrollDepth,
        completedAt: new Date(log.completedAt),
        clientLogId: log.clientLogId,
        syncedAt: new Date(),
      });

      syncedIds.push(log.clientLogId);
    }

    return c.json({
      success: true,
      receivedCount: logs.length,
      syncedCount: syncedIds.length,
      syncedIds,
      duplicateSkippedCount: skippedDuplicateIds.length,
    });
  } catch (err: any) {
    if (err instanceof AuthorizationError) {
      return c.json({ error: err.message }, err.statusCode as any);
    }
    if (err instanceof z.ZodError) {
      return c.json({ error: "Validation failed", details: (err as any).issues || (err as any).errors }, 400);
    }

    console.error("[api] /tracking/sync error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ─── 4. GET /dashboard/roster - Teacher Group Roster & Streaks ───────────────
communityRestRouter.get("/dashboard/roster", async (c) => {
  try {
    const user = await authenticateRequestUser(c.req.raw);
    const groupIdStr = c.req.query("groupId");

    if (!groupIdStr || isNaN(parseInt(groupIdStr))) {
      return c.json({ error: "Valid groupId query parameter is required" }, 400);
    }
    const groupId = parseInt(groupIdStr);

    // Security Check: Requester must be teacher or assistant teacher in this group
    await assertGroupRole(user.id, groupId, ["teacher", "assistant_teacher"]);

    const db = getDb();

    // 1. Fetch group details
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });

    if (!group) {
      return c.json({ error: "Group not found" }, 404);
    }

    // 2. Fetch all students in the group
    const studentMemberships = await db
      .select({
        id: groupMembers.id,
        userId: groupMembers.userId,
        role: groupMembers.role,
        joinedAt: groupMembers.joinedAt,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.status, "active")))
      .orderBy(asc(users.name));

    if (studentMemberships.length === 0) {
      return c.json({
        group: { id: group.id, name: group.name, inviteCode: group.inviteCode },
        totalStudents: 0,
        students: [],
      });
    }

    const studentUserIds = studentMemberships.map((s) => s.userId);

    // 3. Optimized aggregation query: Chapters read, total time, and last activity
    const readingAggregations = await db
      .select({
        userId: readingLogs.userId,
        totalChaptersRead: sql<number>`count(distinct ${readingLogs.contentId})::int`,
        totalTimeSpentSeconds: sql<number>`coalesce(sum(${readingLogs.timeSpent}), 0)::int`,
        lastCompletedAt: sql<string>`max(${readingLogs.completedAt})`,
      })
      .from(readingLogs)
      .where(inArray(readingLogs.userId, studentUserIds))
      .groupBy(readingLogs.userId);

    const aggMap = new Map<string, any>(readingAggregations.map((a: any) => [a.userId, a]));

    // 4. Calculate reading streaks per student (consecutive active days)
    // Fetch unique reading dates for these students over the past 60 days
    const recentReadingDates = await db
      .select({
        userId: readingLogs.userId,
        readingDate: sql<string>`to_char(${readingLogs.completedAt}, 'YYYY-MM-DD')`,
      })
      .from(readingLogs)
      .where(
        and(
          inArray(readingLogs.userId, studentUserIds),
          sql`${readingLogs.completedAt} >= now() - interval '60 days'`
        )
      )
      .groupBy(readingLogs.userId, sql`to_char(${readingLogs.completedAt}, 'YYYY-MM-DD')`)
      .orderBy(desc(sql`to_char(${readingLogs.completedAt}, 'YYYY-MM-DD')`));

    // Group dates by user
    const userDatesMap = new Map<string, Set<string>>();
    for (const row of recentReadingDates) {
      if (!userDatesMap.has(row.userId)) {
        userDatesMap.set(row.userId, new Set());
      }
      userDatesMap.get(row.userId)!.add(row.readingDate);
    }

    // Helper to calculate current active streak
    const calculateStreak = (dateSet?: Set<string>): number => {
      if (!dateSet || dateSet.size === 0) return 0;
      const today = new Date();
      let streak = 0;
      let checkDate = new Date(today);

      // Format date as YYYY-MM-DD
      const formatDate = (d: Date) => d.toISOString().split("T")[0];

      // Check if read today, or yesterday
      let dateStr = formatDate(checkDate);
      if (!dateSet.has(dateStr)) {
        // Check yesterday to keep active streak intact
        checkDate.setDate(checkDate.getDate() - 1);
        dateStr = formatDate(checkDate);
        if (!dateSet.has(dateStr)) {
          return 0; // Inactive
        }
      }

      while (dateSet.has(formatDate(checkDate))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      return streak;
    };

    // 5. Build enriched student roster list
    const enrichedStudents = studentMemberships.map((student) => {
      const agg = aggMap.get(student.userId);
      const dates = userDatesMap.get(student.userId);
      const streak = calculateStreak(dates);

      return {
        userId: student.userId,
        name: student.name || "Anonymous Member",
        email: student.email,
        avatar: student.avatar,
        role: student.role,
        joinedAt: student.joinedAt,
        totalChaptersRead: agg?.totalChaptersRead ?? 0,
        totalTimeSpentMinutes: Math.round((agg?.totalTimeSpentSeconds ?? 0) / 60),
        currentStreakDays: streak,
        lastActiveAt: agg?.lastCompletedAt ?? null,
      };
    });

    return c.json({
      group: {
        id: group.id,
        name: group.name,
        category: group.category,
        inviteCode: group.inviteCode,
      },
      totalStudents: enrichedStudents.length,
      activeThisWeek: enrichedStudents.filter(
        (s) => s.lastActiveAt && new Date(s.lastActiveAt) > new Date(Date.now() - 7 * 86400000)
      ).length,
      students: enrichedStudents,
    });
  } catch (err: any) {
    if (err instanceof AuthorizationError) {
      return c.json({ error: err.message }, err.statusCode as any);
    }
    console.error("[api] /dashboard/roster error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ─── 5. POST /announcements - Create Announcement & Trigger Targeted Push ───
communityRestRouter.post("/announcements", async (c) => {
  try {
    const user = await authenticateRequestUser(c.req.raw);
    const body = await c.req.json();
    const data = announcementCreateSchema.parse(body);

    // Security Check: Must be teacher, assistant teacher, or admin to post
    await assertGroupRole(user.id, data.groupId, ["teacher", "assistant_teacher"]);

    const db = getDb();
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, data.groupId),
    });

    if (!group) {
      return c.json({ error: "Group not found" }, 404);
    }

    // 1. Insert announcement record
    const [announcement] = await db
      .insert(announcements)
      .values({
        groupId: data.groupId,
        communityId: group.communityId,
        authorId: user.id,
        title: data.title,
        body: data.body,
        priority: data.priority,
        announcementType: data.announcementType,
        pushNotificationSent: true,
        status: "published",
      })
      .returning();

    // 2. Trigger targeted push notifications to all class members
    const pushResult = await sendTargetedPushNotification({
      groupId: data.groupId,
      title: `${group.name}: ${data.title}`,
      body: data.body.substring(0, 160),
      category: "announcement",
      data: {
        announcementId: announcement.id,
        groupId: data.groupId,
        resourceType: "announcement",
      },
    });

    return c.json({
      success: true,
      message: "Announcement published and push notification dispatched.",
      announcement,
      pushDelivery: {
        recipientsReached: pushResult.recipientCount,
        devicesSent: pushResult.sent,
      },
    });
  } catch (err: any) {
    if (err instanceof AuthorizationError) {
      return c.json({ error: err.message }, err.statusCode as any);
    }
    if (err instanceof z.ZodError) {
      return c.json({ error: "Validation failed", details: (err as any).issues || (err as any).errors }, 400);
    }

    console.error("[api] /announcements error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ─── 6. POST /attendance/session - Create Attendance Session ─────────────────
communityRestRouter.post("/attendance/session", async (c) => {
  try {
    const user = await authenticateRequestUser(c.req.raw);
    const body = await c.req.json();
    const schema = z.object({
      groupId: z.number().int().positive(),
      title: z.string().trim().min(1).default("Sunday School Class"),
      sessionType: z.enum(["sunday_school", "bible_study", "prayer_meeting", "event"]).default("sunday_school"),
      sessionDate: z.string().datetime().optional(),
    });
    const data = schema.parse(body);

    await assertGroupRole(user.id, data.groupId, ["teacher", "assistant_teacher"]);

    const db = getDb();
    const [session] = await db
      .insert(attendanceSessions)
      .values({
        groupId: data.groupId,
        title: data.title,
        sessionType: data.sessionType,
        sessionDate: data.sessionDate ? new Date(data.sessionDate) : new Date(),
        recordedBy: user.id,
      })
      .returning();

    return c.json({ success: true, session });
  } catch (err: any) {
    if (err instanceof AuthorizationError) return c.json({ error: err.message }, err.statusCode as any);
    if (err instanceof z.ZodError) return c.json({ error: "Validation failed", details: (err as any).issues || (err as any).errors }, 400);
    console.error("[api] /attendance/session error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ─── 7. POST /attendance/record - Mark Student Attendance ───────────────────
communityRestRouter.post("/attendance/record", async (c) => {
  try {
    const user = await authenticateRequestUser(c.req.raw);
    const body = await c.req.json();
    const schema = z.object({
      sessionId: z.number().int().positive(),
      records: z.array(
        z.object({
          userId: z.string().uuid(),
          status: z.enum(["present", "absent", "excused", "late"]),
          notes: z.string().optional(),
        })
      ).min(1),
    });
    const { sessionId, records } = schema.parse(body);

    const db = getDb();
    const session = await db.query.attendanceSessions.findFirst({
      where: eq(attendanceSessions.id, sessionId),
    });
    if (!session) return c.json({ error: "Attendance session not found" }, 404);

    await assertGroupRole(user.id, session.groupId, ["teacher", "assistant_teacher"]);

    let recordedCount = 0;
    for (const rec of records) {
      await db
        .insert(attendanceRecords)
        .values({
          sessionId,
          groupId: session.groupId,
          userId: rec.userId,
          status: rec.status,
          notes: rec.notes ?? null,
          markedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [attendanceRecords.sessionId, attendanceRecords.userId],
          set: {
            status: rec.status,
            notes: rec.notes ?? null,
            markedAt: new Date(),
          },
        });
      recordedCount++;
    }

    return c.json({ success: true, sessionId, recordsMarked: recordedCount });
  } catch (err: any) {
    if (err instanceof AuthorizationError) return c.json({ error: err.message }, err.statusCode as any);
    if (err instanceof z.ZodError) return c.json({ error: "Validation failed", details: (err as any).issues || (err as any).errors }, 400);
    console.error("[api] /attendance/record error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ─── 8. GET /dashboard/reports/weekly - Weekly Teacher & Admin Report ────────
communityRestRouter.get("/dashboard/reports/weekly", async (c) => {
  try {
    const user = await authenticateRequestUser(c.req.raw);
    const groupIdStr = c.req.query("groupId");
    if (!groupIdStr || isNaN(parseInt(groupIdStr))) {
      return c.json({ error: "Valid groupId query parameter is required" }, 400);
    }
    const groupId = parseInt(groupIdStr);

    await assertGroupRole(user.id, groupId, ["teacher", "assistant_teacher"]);

    const db = getDb();
    const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
    if (!group) return c.json({ error: "Group not found" }, 404);

    // Students in group
    const students = await db
      .select({
        userId: groupMembers.userId,
        name: users.name,
        email: users.email,
        joinedAt: groupMembers.joinedAt,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.status, "active"), eq(groupMembers.role, "student")));

    const studentIds = students.map((s) => s.userId);

    // Current week readings (last 7 days)
    const currentWeekLogs = studentIds.length > 0 ? await db
      .select({
        userId: readingLogs.userId,
        chaptersCount: sql<number>`count(distinct ${readingLogs.contentId})::int`,
        timeSpent: sql<number>`coalesce(sum(${readingLogs.timeSpent}), 0)::int`,
      })
      .from(readingLogs)
      .where(and(inArray(readingLogs.userId, studentIds), sql`${readingLogs.completedAt} >= now() - interval '7 days'`))
      .groupBy(readingLogs.userId) : [];

    // Previous week readings (7 to 14 days ago)
    const previousWeekLogs = studentIds.length > 0 ? await db
      .select({
        chaptersCount: sql<number>`count(distinct ${readingLogs.contentId})::int`,
      })
      .from(readingLogs)
      .where(and(inArray(readingLogs.userId, studentIds), sql`${readingLogs.completedAt} >= now() - interval '14 days' AND ${readingLogs.completedAt} < now() - interval '7 days'`)) : [];

    const currentWeekTotalChapters = currentWeekLogs.reduce((acc, row) => acc + row.chaptersCount, 0);
    const prevWeekTotalChapters = previousWeekLogs[0]?.chaptersCount ?? 0;
    const chaptersTrendPercent = prevWeekTotalChapters > 0
      ? Math.round(((currentWeekTotalChapters - prevWeekTotalChapters) / prevWeekTotalChapters) * 100)
      : currentWeekTotalChapters > 0 ? 100 : 0;

    const logMap = new Map<string, any>(currentWeekLogs.map((l: any) => [l.userId, l]));
    const activeStudentCount = currentWeekLogs.filter((l: any) => (l as any).chaptersCount > 0).length;
    const completionRatePercent = students.length > 0
      ? Math.round((activeStudentCount / students.length) * 100)
      : 0;

    // Build CSV Export string
    const csvRows = [
      ["Student Name", "Email", "Chapters Read (7d)", "Minutes Spent", "Active Status"],
      ...students.map((s) => {
        const stats = logMap.get(s.userId);
        const mins = Math.round((stats?.timeSpent ?? 0) / 60);
        return [
          `"${s.name || "Member"}"`,
          `"${s.email || ""}"`,
          String(stats?.chaptersCount ?? 0),
          String(mins),
          (stats?.chaptersCount ?? 0) > 0 ? "Active" : "Inactive",
        ];
      }),
    ];
    const csvContent = csvRows.map((r) => r.join(",")).join("\n");

    return c.json({
      group: { id: group.id, name: group.name, category: group.category },
      reportPeriod: "Last 7 Days",
      metrics: {
        totalEnrolledStudents: students.length,
        activeStudentsThisWeek: activeStudentCount,
        readingCompletionRate: completionRatePercent,
        totalChaptersCompleted: currentWeekTotalChapters,
        previousWeekChapters: prevWeekTotalChapters,
        chaptersTrendPercent,
      },
      students: students.map((s) => ({
        ...s,
        chaptersReadThisWeek: logMap.get(s.userId)?.chaptersCount ?? 0,
        timeSpentMinutes: Math.round((logMap.get(s.userId)?.timeSpent ?? 0) / 60),
        isActiveThisWeek: (logMap.get(s.userId)?.chaptersCount ?? 0) > 0,
      })),
      csvExport: csvContent,
    });
  } catch (err: any) {
    if (err instanceof AuthorizationError) return c.json({ error: err.message }, err.statusCode as any);
    console.error("[api] /dashboard/reports/weekly error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ─── 9. POST /teacher/followup - Send Gentle Reminder or Note ────────────────
communityRestRouter.post("/teacher/followup", async (c) => {
  try {
    const user = await authenticateRequestUser(c.req.raw);
    const body = await c.req.json();
    const schema = z.object({
      groupId: z.number().int().positive(),
      studentId: z.string().uuid(),
      actionType: z.enum(["reminder_sent", "note_added"]),
      message: z.string().trim().optional(),
    });
    const data = schema.parse(body);

    await assertGroupRole(user.id, data.groupId, ["teacher", "assistant_teacher"]);

    const db = getDb();
    const group = await db.query.groups.findFirst({ where: eq(groups.id, data.groupId) });

    if (data.actionType === "reminder_sent") {
      const reminderText = data.message || `Gentle reminder from your ${group?.name ?? "Sunday School"} teacher: Don't forget this week's Bible reading!`;

      // Dispatch gentle targeted push notification
      await sendTargetedPushNotification({
        userIds: [data.studentId],
        groupId: data.groupId,
        title: `${group?.name ?? "Class"} Reading Reminder`,
        body: reminderText,
        category: "reminder",
        data: { groupId: data.groupId, resourceType: "reading_reminder" },
      });
    }

    // Record audit log
    await db.insert(auditLogs).values({
      communityId: group?.communityId,
      groupId: data.groupId,
      actorId: user.id,
      action: data.actionType,
      resourceType: "member",
      resourceId: data.studentId,
      metadata: { message: data.message ?? null },
      occurredAt: new Date(),
    });

    return c.json({ success: true, message: "Follow-up processed successfully." });
  } catch (err: any) {
    if (err instanceof AuthorizationError) return c.json({ error: err.message }, err.statusCode as any);
    if (err instanceof z.ZodError) return c.json({ error: "Validation failed", details: (err as any).issues || (err as any).errors }, 400);
    console.error("[api] /teacher/followup error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});
