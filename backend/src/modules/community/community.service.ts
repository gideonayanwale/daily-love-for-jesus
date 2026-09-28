import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import * as schema from '@db/schema';
import { eq, and, sql, desc, inArray, asc } from 'drizzle-orm';

export interface SendPushOptions {
  userIds?: string[];
  groupId?: number;
  title: string;
  body: string;
  data?: Record<string, any>;
  category?: string;
}

export interface ReadingLogItemDto {
  contentId: string;
  contentType?: 'bible_chapter' | 'devotional' | 'reading_assignment';
  bookNumber?: number;
  chapter?: number;
  timeSpent?: number;
  scrollDepth?: number;
  completedAt: string;
  clientLogId: string;
  groupId?: number;
}

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(private readonly dbService: DatabaseService) {}

  // ─── Push Notifications Dispatcher ──────────────────────────────────────────
  async sendPushNotification(options: SendPushOptions) {
    const db = this.dbService.getDb();
    let recipientIds = options.userIds ?? [];

    if (options.groupId && recipientIds.length === 0) {
      const members = await db
        .select({ userId: schema.groupMembers.userId })
        .from(schema.groupMembers)
        .where(
          and(
            eq(schema.groupMembers.groupId, options.groupId),
            eq(schema.groupMembers.status, 'active'),
          ),
        );
      recipientIds = members.map((m: any) => m.userId);
    }

    if (recipientIds.length === 0) {
      return { sent: 0, recipientCount: 0 };
    }

    // 1. Record in-app notifications
    const rows = recipientIds.map((userId) => ({
      userId,
      groupId: options.groupId ?? null,
      title: options.title,
      body: options.body,
      category: options.category ?? 'announcement',
      resourceType: options.data?.resourceType ?? 'group',
      resourceId: options.data?.resourceId ? String(options.data.resourceId) : null,
      isRead: false,
    }));

    try {
      await db.insert(schema.notifications).values(rows);
    } catch (err: any) {
      this.logger.error(`Failed to record in-app notifications: ${err.message}`);
    }

    // 2. Fetch tokens
    const tokens = await db
      .select({ token: schema.pushTokens.token, platform: schema.pushTokens.platform })
      .from(schema.pushTokens)
      .where(inArray(schema.pushTokens.userId, recipientIds));

    if (tokens.length === 0) {
      return { sent: 0, recipientCount: recipientIds.length };
    }

    // 3. Dispatch to Expo
    const messages = tokens.map((t: any) => ({
      to: t.token,
      sound: 'default',
      title: options.title,
      body: options.body,
      data: options.data || {},
      badge: 1,
    }));

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
      const result = await response.json();
      return { sent: messages.length, recipientCount: recipientIds.length, result };
    } catch (err: any) {
      this.logger.warn(`Expo push dispatch warning: ${err.message}`);
      return { sent: 0, recipientCount: recipientIds.length, error: String(err) };
    }
  }

  // ─── Helpers: Role checks ──────────────────────────────────────────────────
  async assertGroupRole(userId: string, groupId: number, allowedRoles: string[] = ['teacher', 'assistant_teacher']) {
    const db = this.dbService.getDb();

    // Check if system admin
    const users = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (users[0]?.role === 'admin') {
      return { role: 'teacher', status: 'active' };
    }

    const membership = await db
      .select()
      .from(schema.groupMembers)
      .where(
        and(
          eq(schema.groupMembers.groupId, groupId),
          eq(schema.groupMembers.userId, userId),
          eq(schema.groupMembers.status, 'active'),
        ),
      )
      .limit(1);

    if (!membership[0] || !allowedRoles.includes(membership[0].role)) {
      throw new ForbiddenException(
        `Access denied: requires one of [${allowedRoles.join(', ')}] roles in group ${groupId}`,
      );
    }

    return membership[0];
  }

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // ─── Invite Code Generation ────────────────────────────────────────────────
  async generateInvite(userId: string, groupId: number, regenerate: boolean = false) {
    await this.assertGroupRole(userId, groupId, ['teacher', 'assistant_teacher']);
    const db = this.dbService.getDb();

    const groups = await db
      .select()
      .from(schema.groups)
      .where(eq(schema.groups.id, groupId))
      .limit(1);

    const group = groups[0];
    if (!group) throw new NotFoundException('Group not found');

    if (group.inviteCode && !regenerate) {
      return {
        success: true,
        groupId: group.id,
        groupName: group.name,
        inviteCode: group.inviteCode,
        joinUrl: `/join?code=${group.inviteCode}`,
      };
    }

    let newCode = this.generateInviteCode();
    let collision = true;
    let attempts = 0;

    while (collision && attempts < 10) {
      const existing = await db
        .select()
        .from(schema.groups)
        .where(eq(schema.groups.inviteCode, newCode))
        .limit(1);

      if (existing.length === 0) {
        collision = false;
      } else {
        newCode = this.generateInviteCode();
        attempts++;
      }
    }

    await db
      .update(schema.groups)
      .set({ inviteCode: newCode, updatedAt: new Date() })
      .where(eq(schema.groups.id, groupId));

    return {
      success: true,
      groupId: group.id,
      groupName: group.name,
      inviteCode: newCode,
      joinUrl: `/join?code=${newCode}`,
    };
  }

  // ─── Join Group with 6-Digit Code ──────────────────────────────────────────
  async joinGroup(userId: string, inviteCode: string) {
    const db = this.dbService.getDb();
    const cleanCode = inviteCode.trim().toUpperCase();

    const groups = await db
      .select()
      .from(schema.groups)
      .where(eq(schema.groups.inviteCode, cleanCode))
      .limit(1);

    const group = groups[0];
    if (!group) {
      throw new NotFoundException('Invalid invite code. Class not found.');
    }

    if (group.status !== 'active') {
      throw new BadRequestException('This group is no longer accepting new members.');
    }

    const existingMembership = await db
      .select()
      .from(schema.groupMembers)
      .where(
        and(
          eq(schema.groupMembers.groupId, group.id),
          eq(schema.groupMembers.userId, userId),
        ),
      )
      .limit(1);

    if (existingMembership[0]) {
      if (existingMembership[0].status === 'active') {
        return {
          success: true,
          message: 'You are already a member of this group.',
          groupId: group.id,
          groupName: group.name,
          role: existingMembership[0].role,
        };
      }

      await db
        .update(schema.groupMembers)
        .set({ status: 'active', joinedAt: new Date() })
        .where(eq(schema.groupMembers.id, existingMembership[0].id));

      return {
        success: true,
        message: 'Welcome back! Group membership reactivated.',
        groupId: group.id,
        groupName: group.name,
        role: existingMembership[0].role,
      };
    }

    const inserted = await db
      .insert(schema.groupMembers)
      .values({
        groupId: group.id,
        userId,
        role: 'student',
        status: 'active',
      })
      .returning();

    return {
      success: true,
      message: `Successfully joined ${group.name}!`,
      groupId: group.id,
      groupName: group.name,
      membershipId: inserted[0]?.id,
      role: 'student',
    };
  }

  // ─── Batch Offline Reading Log Ingestion ───────────────────────────────────
  async syncTracking(userId: string, logs: ReadingLogItemDto[]) {
    const db = this.dbService.getDb();
    const syncedIds: string[] = [];
    const skippedDuplicateIds: string[] = [];

    for (const log of logs) {
      const existing = await db
        .select()
        .from(schema.readingLogs)
        .where(eq(schema.readingLogs.clientLogId, log.clientLogId))
        .limit(1);

      if (existing.length > 0) {
        skippedDuplicateIds.push(log.clientLogId);
        continue;
      }

      await db.insert(schema.readingLogs).values({
        userId,
        groupId: log.groupId ?? null,
        contentId: log.contentId,
        contentType: log.contentType ?? 'bible_chapter',
        bookNumber: log.bookNumber ?? null,
        chapter: log.chapter ?? null,
        timeSpent: log.timeSpent ?? 0,
        scrollDepth: log.scrollDepth ?? 100,
        completedAt: new Date(log.completedAt),
        clientLogId: log.clientLogId,
        syncedAt: new Date(),
      });

      syncedIds.push(log.clientLogId);
    }

    return {
      success: true,
      receivedCount: logs.length,
      syncedCount: syncedIds.length,
      syncedIds,
      duplicateSkippedCount: skippedDuplicateIds.length,
    };
  }

  // ─── Teacher Roster & Streak Calculation ───────────────────────────────────
  async getRoster(userId: string, groupId: number) {
    await this.assertGroupRole(userId, groupId, ['teacher', 'assistant_teacher']);
    const db = this.dbService.getDb();

    const groupRows = await db
      .select()
      .from(schema.groups)
      .where(eq(schema.groups.id, groupId))
      .limit(1);

    const group = groupRows[0];
    if (!group) throw new NotFoundException('Group not found');

    const students = await db
      .select({
        id: schema.groupMembers.id,
        userId: schema.groupMembers.userId,
        role: schema.groupMembers.role,
        joinedAt: schema.groupMembers.joinedAt,
        name: schema.users.name,
        email: schema.users.email,
        avatar: schema.users.avatar,
      })
      .from(schema.groupMembers)
      .innerJoin(schema.users, eq(schema.groupMembers.userId, schema.users.id))
      .where(
        and(
          eq(schema.groupMembers.groupId, groupId),
          eq(schema.groupMembers.status, 'active'),
          eq(schema.groupMembers.role, 'student'),
        ),
      )
      .orderBy(asc(schema.users.name));

    if (students.length === 0) {
      return {
        group: { id: group.id, name: group.name, inviteCode: group.inviteCode },
        totalStudents: 0,
        students: [],
      };
    }

    const studentUserIds = students.map((s: any) => s.userId);

    const readingAggregations = await db
      .select({
        userId: schema.readingLogs.userId,
        totalChaptersRead: sql<number>`count(distinct ${schema.readingLogs.contentId})::int`,
        totalTimeSpentSeconds: sql<number>`coalesce(sum(${schema.readingLogs.timeSpent}), 0)::int`,
        lastCompletedAt: sql<string>`max(${schema.readingLogs.completedAt})`,
      })
      .from(schema.readingLogs)
      .where(inArray(schema.readingLogs.userId, studentUserIds))
      .groupBy(schema.readingLogs.userId);

    const aggMap = new Map<string, any>(
      readingAggregations.map((a: any) => [a.userId, a]),
    );

    const recentReadingDates = await db
      .select({
        userId: schema.readingLogs.userId,
        readingDate: sql<string>`to_char(${schema.readingLogs.completedAt}, 'YYYY-MM-DD')`,
      })
      .from(schema.readingLogs)
      .where(
        and(
          inArray(schema.readingLogs.userId, studentUserIds),
          sql`${schema.readingLogs.completedAt} >= now() - interval '60 days'`,
        ),
      )
      .groupBy(
        schema.readingLogs.userId,
        sql`to_char(${schema.readingLogs.completedAt}, 'YYYY-MM-DD')`,
      )
      .orderBy(desc(sql`to_char(${schema.readingLogs.completedAt}, 'YYYY-MM-DD')`));

    const userDatesMap = new Map<string, Set<string>>();
    for (const row of recentReadingDates) {
      if (!userDatesMap.has(row.userId)) {
        userDatesMap.set(row.userId, new Set());
      }
      userDatesMap.get(row.userId)!.add(row.readingDate);
    }

    const calculateStreak = (dateSet?: Set<string>): number => {
      if (!dateSet || dateSet.size === 0) return 0;
      const today = new Date();
      let streak = 0;
      let checkDate = new Date(today);
      const formatDate = (d: Date) => d.toISOString().split('T')[0];

      let dateStr = formatDate(checkDate);
      if (!dateSet.has(dateStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
        dateStr = formatDate(checkDate);
        if (!dateSet.has(dateStr)) {
          return 0;
        }
      }

      while (dateSet.has(formatDate(checkDate))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
      return streak;
    };

    const enrichedStudents = students.map((student: any) => {
      const agg = aggMap.get(student.userId);
      const dates = userDatesMap.get(student.userId);
      const streak = calculateStreak(dates);

      return {
        userId: student.userId,
        name: student.name || 'Anonymous Member',
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

    return {
      group: {
        id: group.id,
        name: group.name,
        category: group.category,
        inviteCode: group.inviteCode,
      },
      totalStudents: enrichedStudents.length,
      activeThisWeek: enrichedStudents.filter(
        (s) => s.lastActiveAt && new Date(s.lastActiveAt) > new Date(Date.now() - 7 * 86400000),
      ).length,
      students: enrichedStudents,
    };
  }

  // ─── Create Announcement & Push Notification ───────────────────────────────
  async createAnnouncement(
    userId: string,
    data: {
      groupId: number;
      title: string;
      body: string;
      priority?: 'normal' | 'high' | 'urgent';
      announcementType?: 'general' | 'assignment' | 'event' | 'reminder';
    },
  ) {
    await this.assertGroupRole(userId, data.groupId, ['teacher', 'assistant_teacher']);
    const db = this.dbService.getDb();

    const groups = await db
      .select()
      .from(schema.groups)
      .where(eq(schema.groups.id, data.groupId))
      .limit(1);

    const group = groups[0];
    if (!group) throw new NotFoundException('Group not found');

    const inserted = await db
      .insert(schema.announcements)
      .values({
        groupId: data.groupId,
        communityId: group.communityId,
        authorId: userId,
        title: data.title,
        body: data.body,
        priority: data.priority ?? 'normal',
        announcementType: data.announcementType ?? 'general',
        pushNotificationSent: true,
        status: 'published',
      })
      .returning();

    const announcement = inserted[0];

    const pushResult = await this.sendPushNotification({
      groupId: data.groupId,
      title: `${group.name}: ${data.title}`,
      body: data.body.substring(0, 160),
      category: 'announcement',
      data: {
        announcementId: announcement.id,
        groupId: data.groupId,
        resourceType: 'announcement',
      },
    });

    return {
      success: true,
      message: 'Announcement published and push notification dispatched.',
      announcement,
      pushDelivery: {
        recipientsReached: pushResult.recipientCount,
        devicesSent: pushResult.sent,
      },
    };
  }

  // ─── Attendance Session ────────────────────────────────────────────────────
  async createAttendanceSession(
    userId: string,
    data: {
      groupId: number;
      title?: string;
      sessionType?: 'sunday_school' | 'bible_study' | 'prayer_meeting' | 'event';
      sessionDate?: string;
    },
  ) {
    await this.assertGroupRole(userId, data.groupId, ['teacher', 'assistant_teacher']);
    const db = this.dbService.getDb();

    const inserted = await db
      .insert(schema.attendanceSessions)
      .values({
        groupId: data.groupId,
        title: data.title || 'Sunday School Class',
        sessionType: data.sessionType || 'sunday_school',
        sessionDate: data.sessionDate ? new Date(data.sessionDate) : new Date(),
        recordedBy: userId,
      })
      .returning();

    return { success: true, session: inserted[0] };
  }

  // ─── Attendance Records ────────────────────────────────────────────────────
  async recordAttendance(
    userId: string,
    sessionId: number,
    records: Array<{
      userId: string;
      status: 'present' | 'absent' | 'excused' | 'late';
      notes?: string;
    }>,
  ) {
    const db = this.dbService.getDb();
    const sessions = await db
      .select()
      .from(schema.attendanceSessions)
      .where(eq(schema.attendanceSessions.id, sessionId))
      .limit(1);

    const session = sessions[0];
    if (!session) throw new NotFoundException('Attendance session not found');

    await this.assertGroupRole(userId, session.groupId, ['teacher', 'assistant_teacher']);

    let recordedCount = 0;
    for (const rec of records) {
      await db
        .insert(schema.attendanceRecords)
        .values({
          sessionId,
          groupId: session.groupId,
          userId: rec.userId,
          status: rec.status,
          notes: rec.notes ?? null,
          markedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [schema.attendanceRecords.sessionId, schema.attendanceRecords.userId],
          set: {
            status: rec.status,
            notes: rec.notes ?? null,
            markedAt: new Date(),
          },
        });
      recordedCount++;
    }

    return { success: true, sessionId, recordsMarked: recordedCount };
  }

  // ─── Weekly Report & CSV Export ────────────────────────────────────────────
  async getWeeklyReport(userId: string, groupId: number) {
    await this.assertGroupRole(userId, groupId, ['teacher', 'assistant_teacher']);
    const db = this.dbService.getDb();

    const groups = await db
      .select()
      .from(schema.groups)
      .where(eq(schema.groups.id, groupId))
      .limit(1);

    const group = groups[0];
    if (!group) throw new NotFoundException('Group not found');

    const students = await db
      .select({
        userId: schema.groupMembers.userId,
        name: schema.users.name,
        email: schema.users.email,
        joinedAt: schema.groupMembers.joinedAt,
      })
      .from(schema.groupMembers)
      .innerJoin(schema.users, eq(schema.groupMembers.userId, schema.users.id))
      .where(
        and(
          eq(schema.groupMembers.groupId, groupId),
          eq(schema.groupMembers.status, 'active'),
          eq(schema.groupMembers.role, 'student'),
        ),
      );

    const studentIds = students.map((s: any) => s.userId);

    const currentWeekLogs =
      studentIds.length > 0
        ? await db
            .select({
              userId: schema.readingLogs.userId,
              chaptersCount: sql<number>`count(distinct ${schema.readingLogs.contentId})::int`,
              timeSpent: sql<number>`coalesce(sum(${schema.readingLogs.timeSpent}), 0)::int`,
            })
            .from(schema.readingLogs)
            .where(
              and(
                inArray(schema.readingLogs.userId, studentIds),
                sql`${schema.readingLogs.completedAt} >= now() - interval '7 days'`,
              ),
            )
            .groupBy(schema.readingLogs.userId)
        : [];

    const previousWeekLogs =
      studentIds.length > 0
        ? await db
            .select({
              chaptersCount: sql<number>`count(distinct ${schema.readingLogs.contentId})::int`,
            })
            .from(schema.readingLogs)
            .where(
              and(
                inArray(schema.readingLogs.userId, studentIds),
                sql`${schema.readingLogs.completedAt} >= now() - interval '14 days' AND ${schema.readingLogs.completedAt} < now() - interval '7 days'`,
              ),
            )
        : [];

    const currentWeekTotalChapters = currentWeekLogs.reduce(
      (acc: number, row: any) => acc + row.chaptersCount,
      0,
    );
    const prevWeekTotalChapters = previousWeekLogs[0]?.chaptersCount ?? 0;
    const chaptersTrendPercent =
      prevWeekTotalChapters > 0
        ? Math.round(((currentWeekTotalChapters - prevWeekTotalChapters) / prevWeekTotalChapters) * 100)
        : currentWeekTotalChapters > 0
        ? 100
        : 0;

    const logMap = new Map<string, any>(currentWeekLogs.map((l: any) => [l.userId, l]));
    const activeStudentCount = currentWeekLogs.filter((l: any) => l.chaptersCount > 0).length;
    const completionRatePercent =
      students.length > 0 ? Math.round((activeStudentCount / students.length) * 100) : 0;

    const csvRows = [
      ['Student Name', 'Email', 'Chapters Read (7d)', 'Minutes Spent', 'Active Status'],
      ...students.map((s: any) => {
        const stats = logMap.get(s.userId);
        const mins = Math.round((stats?.timeSpent ?? 0) / 60);
        return [
          `"${s.name || 'Member'}"`,
          `"${s.email || ''}"`,
          String(stats?.chaptersCount ?? 0),
          String(mins),
          (stats?.chaptersCount ?? 0) > 0 ? 'Active' : 'Inactive',
        ];
      }),
    ];

    const csvExport = csvRows.map((r) => r.join(',')).join('\n');

    return {
      group: { id: group.id, name: group.name, category: group.category },
      reportPeriod: 'Last 7 Days',
      metrics: {
        totalEnrolledStudents: students.length,
        activeStudentsThisWeek: activeStudentCount,
        readingCompletionRate: completionRatePercent,
        totalChaptersCompleted: currentWeekTotalChapters,
        previousWeekChapters: prevWeekTotalChapters,
        chaptersTrendPercent,
      },
      students: students.map((s: any) => ({
        ...s,
        chaptersReadThisWeek: logMap.get(s.userId)?.chaptersCount ?? 0,
        timeSpentMinutes: Math.round((logMap.get(s.userId)?.timeSpent ?? 0) / 60),
        isActiveThisWeek: (logMap.get(s.userId)?.chaptersCount ?? 0) > 0,
      })),
      csvExport,
    };
  }

  // ─── Teacher Follow-Up ─────────────────────────────────────────────────────
  async teacherFollowup(
    userId: string,
    data: {
      groupId: number;
      studentId: string;
      actionType: 'reminder_sent' | 'note_added';
      message?: string;
    },
  ) {
    await this.assertGroupRole(userId, data.groupId, ['teacher', 'assistant_teacher']);
    const db = this.dbService.getDb();

    const groups = await db
      .select()
      .from(schema.groups)
      .where(eq(schema.groups.id, data.groupId))
      .limit(1);

    const group = groups[0];

    if (data.actionType === 'reminder_sent') {
      const reminderText =
        data.message ||
        `Gentle reminder from your ${group?.name ?? 'Sunday School'} teacher: Don't forget this week's Bible reading!`;

      await this.sendPushNotification({
        userIds: [data.studentId],
        groupId: data.groupId,
        title: `${group?.name ?? 'Class'} Reading Reminder`,
        body: reminderText,
        category: 'reminder',
        data: { groupId: data.groupId, resourceType: 'reading_reminder' },
      });
    }

    await db.insert(schema.auditLogs).values({
      communityId: group?.communityId,
      groupId: data.groupId,
      actorId: userId,
      action: data.actionType,
      resourceType: 'member',
      resourceId: data.studentId,
      metadata: { message: data.message ?? null },
      occurredAt: new Date(),
    });

    return { success: true, message: 'Follow-up processed successfully.' };
  }

  // ─── Community List Queries ────────────────────────────────────────────────
  async getMyCommunities(userId: string) {
    const db = this.dbService.getDb();
    return db
      .select({
        id: schema.communities.id,
        name: schema.communities.name,
        slug: schema.communities.slug,
        description: schema.communities.description,
        logo: schema.communities.logo,
        coverImage: schema.communities.coverImage,
        location: schema.communities.location,
        role: schema.communityMembers.role,
        status: schema.communityMembers.status,
        joinedAt: schema.communityMembers.joinedAt,
      })
      .from(schema.communityMembers)
      .innerJoin(
        schema.communities,
        eq(schema.communityMembers.communityId, schema.communities.id),
      )
      .where(
        and(
          eq(schema.communityMembers.userId, userId),
          eq(schema.communityMembers.status, 'active'),
        ),
      );
  }

  async getMyGroups(userId: string) {
    const db = this.dbService.getDb();
    return db
      .select({
        id: schema.groups.id,
        communityId: schema.groups.communityId,
        communityName: schema.communities.name,
        name: schema.groups.name,
        slug: schema.groups.slug,
        description: schema.groups.description,
        groupImage: schema.groups.groupImage,
        category: schema.groups.category,
        inviteCode: schema.groups.inviteCode,
        role: schema.groupMembers.role,
        joinedAt: schema.groupMembers.joinedAt,
      })
      .from(schema.groupMembers)
      .innerJoin(schema.groups, eq(schema.groupMembers.groupId, schema.groups.id))
      .innerJoin(schema.communities, eq(schema.groups.communityId, schema.communities.id))
      .where(
        and(
          eq(schema.groupMembers.userId, userId),
          eq(schema.groupMembers.status, 'active'),
        ),
      );
  }

  async getGroupDetails(userId: string, groupId: number) {
    const db = this.dbService.getDb();

    const membership = await db
      .select()
      .from(schema.groupMembers)
      .where(
        and(
          eq(schema.groupMembers.groupId, groupId),
          eq(schema.groupMembers.userId, userId),
          eq(schema.groupMembers.status, 'active'),
        ),
      )
      .limit(1);

    const groups = await db
      .select()
      .from(schema.groups)
      .where(eq(schema.groups.id, groupId))
      .limit(1);

    const group = groups[0];
    if (!group) throw new NotFoundException('Group not found');

    const recentAnnouncements = await db
      .select({
        id: schema.announcements.id,
        title: schema.announcements.title,
        body: schema.announcements.body,
        priority: schema.announcements.priority,
        announcementType: schema.announcements.announcementType,
        createdAt: schema.announcements.createdAt,
        authorName: schema.users.name,
        authorAvatar: schema.users.avatar,
      })
      .from(schema.announcements)
      .innerJoin(schema.users, eq(schema.announcements.authorId, schema.users.id))
      .where(eq(schema.announcements.groupId, groupId))
      .orderBy(desc(schema.announcements.createdAt))
      .limit(10);

    const activeAssignments = await db
      .select()
      .from(schema.readingAssignments)
      .where(
        and(
          eq(schema.readingAssignments.groupId, groupId),
          eq(schema.readingAssignments.status, 'published'),
        ),
      )
      .orderBy(desc(schema.readingAssignments.dueDate))
      .limit(10);

    return {
      group,
      myRole: membership[0]?.role ?? null,
      announcements: recentAnnouncements,
      assignments: activeAssignments,
    };
  }

  async getTeacherOverview(userId: string, groupId: number) {
    await this.assertGroupRole(userId, groupId, ['teacher', 'assistant_teacher']);
    const db = this.dbService.getDb();

    const studentCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.groupMembers)
      .where(
        and(
          eq(schema.groupMembers.groupId, groupId),
          eq(schema.groupMembers.status, 'active'),
          eq(schema.groupMembers.role, 'student'),
        ),
      );
    const totalStudents = studentCountResult[0]?.count ?? 0;

    const activeWeekResult = await db
      .select({ count: sql<number>`count(distinct ${schema.readingLogs.userId})::int` })
      .from(schema.readingLogs)
      .where(
        and(
          eq(schema.readingLogs.groupId, groupId),
          sql`${schema.readingLogs.completedAt} >= now() - interval '7 days'`,
        ),
      );
    const activeThisWeek = activeWeekResult[0]?.count ?? 0;

    const latestAssignments = await db
      .select()
      .from(schema.readingAssignments)
      .where(
        and(
          eq(schema.readingAssignments.groupId, groupId),
          eq(schema.readingAssignments.status, 'published'),
        ),
      )
      .orderBy(desc(schema.readingAssignments.dueDate))
      .limit(1);

    const latestAssignment = latestAssignments[0] ?? null;
    let assignmentCompletionRate = 0;
    let completedCount = 0;

    if (latestAssignment && totalStudents > 0) {
      const completedSubs = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.assignmentSubmissions)
        .where(
          and(
            eq(schema.assignmentSubmissions.assignmentId, latestAssignment.id),
            eq(schema.assignmentSubmissions.status, 'submitted'),
          ),
        );
      completedCount = completedSubs[0]?.count ?? 0;
      assignmentCompletionRate = Math.round((completedCount / totalStudents) * 100);
    }

    return {
      totalStudents,
      activeThisWeek,
      latestAssignment: latestAssignment
        ? {
            id: latestAssignment.id,
            title: latestAssignment.title,
            dueDate: latestAssignment.dueDate,
            completionRate: assignmentCompletionRate,
            completedCount,
          }
        : null,
    };
  }

  async registerPushToken(userId: string, token: string, platform: 'expo' | 'fcm' | 'apns' = 'expo') {
    const db = this.dbService.getDb();
    await db
      .insert(schema.pushTokens)
      .values({
        userId,
        token,
        platform,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.pushTokens.token,
        set: {
          userId,
          platform,
          updatedAt: new Date(),
        },
      });
    return { success: true };
  }
}
