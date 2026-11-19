import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as schema from '@db/schema';
import { eq, and, or, sql, desc, inArray, asc } from 'drizzle-orm';

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

  constructor(
    private readonly dbService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

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
    if (!Number.isSafeInteger(groupId) || groupId < 1) {
      throw new BadRequestException('A valid group ID is required.');
    }
    const db = this.dbService.getDb();

    // Check if system admin
    const users = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (['admin', 'elevated_admin', 'superadmin'].includes(users[0]?.role)) {
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
    if (!Number.isSafeInteger(groupId) || groupId < 1 || typeof regenerate !== 'boolean') {
      throw new BadRequestException('Group ID and regenerate flag are invalid.');
    }
    await this.assertGroupRole(userId, groupId, ['teacher', 'assistant_teacher']);
    const db = this.dbService.getDb();

    const groups = await db
      .select({
        id: schema.groups.id,
        communityId: schema.groups.communityId,
        name: schema.groups.name,
        slug: schema.groups.slug,
        description: schema.groups.description,
        groupImage: schema.groups.groupImage,
        category: schema.groups.category,
        status: schema.groups.status,
        onlyAdminsCanPost: schema.groups.onlyAdminsCanPost,
        createdAt: schema.groups.createdAt,
        updatedAt: schema.groups.updatedAt,
      })
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
  async joinGroup(userId: string, inviteCode: string, whatsappNumber?: string) {
    if (typeof inviteCode !== 'string' || !/^[A-Z0-9]{4,10}$/i.test(inviteCode.trim())) {
      throw new BadRequestException('A valid group invite code is required.');
    }
    if (whatsappNumber !== undefined && (
      typeof whatsappNumber !== 'string' ||
      whatsappNumber.length > 25 ||
      !/^[+0-9()\-\s]*$/.test(whatsappNumber)
    )) {
      throw new BadRequestException('WhatsApp number format is invalid.');
    }
    const db = this.dbService.getDb();
    const cleanCode = inviteCode.trim().toUpperCase();

    // If whatsappNumber is provided, automatically record it on the user's profile
    if (whatsappNumber && whatsappNumber.trim()) {
      await db
        .update(schema.users)
        .set({
          whatsappNumber: whatsappNumber.trim(),
          phone: whatsappNumber.trim(),
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId));
    }

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

    const userRows = await db
      .select({ whatsappNumber: schema.users.whatsappNumber, phone: schema.users.phone })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    const resolvedWhatsApp =
      whatsappNumber?.trim() || userRows[0]?.whatsappNumber || userRows[0]?.phone || null;

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
          whatsappNumber: resolvedWhatsApp,
        };
      }

      await db
        .update(schema.groupMembers)
        .set({
          status: 'active',
          joinedAt: new Date(),
          metadata: { whatsappNumber: resolvedWhatsApp },
        })
        .where(eq(schema.groupMembers.id, existingMembership[0].id));

      return {
        success: true,
        message: 'Welcome back! Group membership reactivated.',
        groupId: group.id,
        groupName: group.name,
        role: existingMembership[0].role,
        whatsappNumber: resolvedWhatsApp,
      };
    }

    const inserted = await db
      .insert(schema.groupMembers)
      .values({
        groupId: group.id,
        userId,
        role: 'student',
        status: 'active',
        metadata: { whatsappNumber: resolvedWhatsApp },
      })
      .returning();

    return {
      success: true,
      message: `Successfully joined ${group.name}!`,
      groupId: group.id,
      groupName: group.name,
      membershipId: inserted[0]?.id,
      role: 'student',
      whatsappNumber: resolvedWhatsApp,
    };
  }

  // ─── Batch Offline Reading Log Ingestion ───────────────────────────────────
  async syncTracking(userId: string, logs: ReadingLogItemDto[]) {
    if (!Array.isArray(logs) || logs.length > 100) {
      throw new BadRequestException('A maximum of 100 reading logs can be synced per request.');
    }
    const db = this.dbService.getDb();
    const syncedIds: string[] = [];
    const skippedDuplicateIds: string[] = [];

    for (const log of logs) {
      if (!log || typeof log.clientLogId !== 'string' || log.clientLogId.length > 128 ||
          typeof log.contentId !== 'string' || log.contentId.length > 200) {
        throw new BadRequestException('Reading log identifiers are invalid.');
      }
      const completedAt = new Date(log.completedAt);
      if (Number.isNaN(completedAt.getTime()) || completedAt.getTime() > Date.now() + 5 * 60 * 1000) {
        throw new BadRequestException('Reading log completion time is invalid.');
      }
      if (log.groupId !== undefined && log.groupId !== null) {
        const membership = await db
          .select({ id: schema.groupMembers.id })
          .from(schema.groupMembers)
          .where(and(
            eq(schema.groupMembers.groupId, log.groupId),
            eq(schema.groupMembers.userId, userId),
            eq(schema.groupMembers.status, 'active'),
          ))
          .limit(1);
        if (!membership.length) {
          throw new ForbiddenException('Reading logs can only be assigned to one of your active groups.');
        }
      }

      const existing = await db
        .select()
        .from(schema.readingLogs)
        .where(and(
          eq(schema.readingLogs.userId, userId),
          eq(schema.readingLogs.clientLogId, log.clientLogId),
        ))
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
        timeSpent: Math.min(Math.max(Number(log.timeSpent) || 0, 0), 86400),
        scrollDepth: Math.min(Math.max(Number(log.scrollDepth) || 0, 0), 100),
        completedAt,
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
      .where(and(inArray(schema.readingLogs.userId, studentUserIds), eq(schema.readingLogs.groupId, groupId)))
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
          eq(schema.readingLogs.groupId, groupId),
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
    if (!data.title?.trim() || data.title.length > 255 || !data.body?.trim() || data.body.length > 10000) {
      throw new BadRequestException('Announcement title/body is invalid or too long.');
    }
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
    if (!data || !Number.isSafeInteger(data.groupId) || data.groupId < 1) {
      throw new BadRequestException('A valid group ID is required.');
    }
    if (data.title !== undefined && (typeof data.title !== 'string' || data.title.length > 255)) {
      throw new BadRequestException('Session title cannot exceed 255 characters.');
    }
    if (data.sessionType !== undefined && !['sunday_school', 'bible_study', 'prayer_meeting', 'event'].includes(data.sessionType)) {
      throw new BadRequestException('Invalid attendance session type.');
    }
    if (data.sessionDate !== undefined && Number.isNaN(new Date(data.sessionDate).getTime())) {
      throw new BadRequestException('Session date is invalid.');
    }
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
      userId?: string;
      guestName?: string;
      guestPhone?: string;
      isGuest?: boolean;
      status: 'present' | 'absent' | 'excused' | 'late';
      notes?: string;
    }>,
  ) {
    if (!Number.isSafeInteger(sessionId) || sessionId < 1) {
      throw new BadRequestException('A valid attendance session ID is required.');
    }
    if (!Array.isArray(records) || records.length < 1 || records.length > 500) {
      throw new BadRequestException('Between 1 and 500 attendance records must be submitted.');
    }
    if (records.some((record) =>
      !record ||
      (record.userId !== undefined && typeof record.userId !== 'string') ||
      (record.guestName !== undefined && (typeof record.guestName !== 'string' || record.guestName.length > 255)) ||
      (record.guestPhone !== undefined && (typeof record.guestPhone !== 'string' || record.guestPhone.length > 25)) ||
      (record.notes !== undefined && (typeof record.notes !== 'string' || record.notes.length > 1000))
    )) {
      throw new BadRequestException('Attendance record fields are invalid.');
    }
    const allowedStatuses = ['present', 'absent', 'excused', 'late'];
    if (records.some((record) => !allowedStatuses.includes(record.status))) {
      throw new BadRequestException('Invalid attendance status.');
    }
    const db = this.dbService.getDb();
    const sessions = await db
      .select()
      .from(schema.attendanceSessions)
      .where(eq(schema.attendanceSessions.id, sessionId))
      .limit(1);

    const session = sessions[0];
    if (!session) throw new NotFoundException('Attendance session not found');

    await this.assertGroupRole(userId, session.groupId, ['teacher', 'assistant_teacher']);
    const targetIds = [...new Set(records.filter((r) => !r.isGuest && r.userId).map((r) => r.userId!))];
    if (targetIds.length > 0) {
      const validStudents = await db
        .select({ userId: schema.groupMembers.userId })
        .from(schema.groupMembers)
        .where(and(
          eq(schema.groupMembers.groupId, session.groupId),
          eq(schema.groupMembers.status, 'active'),
          eq(schema.groupMembers.role, 'student'),
          inArray(schema.groupMembers.userId, targetIds),
        ));
      if (validStudents.length !== targetIds.length) {
        throw new ForbiddenException('Attendance can only be recorded for active students in this group.');
      }
    }

    let recordedCount = 0;
    for (const rec of records) {
      if (rec.isGuest || !rec.userId) {
        await db.insert(schema.attendanceRecords).values({
          sessionId,
          groupId: session.groupId,
          userId: null,
          guestName: rec.guestName || 'Visitor',
          guestPhone: rec.guestPhone || null,
          isGuest: true,
          status: rec.status,
          notes: rec.notes ?? null,
          markedAt: new Date(),
        });
      } else {
        await db
          .insert(schema.attendanceRecords)
          .values({
            sessionId,
            groupId: session.groupId,
            userId: rec.userId,
            guestName: null,
            isGuest: false,
            status: rec.status,
            notes: rec.notes ?? null,
            markedAt: new Date(),
          });
      }
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
                eq(schema.readingLogs.groupId, groupId),
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
                eq(schema.readingLogs.groupId, groupId),
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
    if (!['reminder_sent', 'note_added'].includes(data.actionType)) throw new BadRequestException('Invalid follow-up action.');
    if (data.message && data.message.length > 500) throw new BadRequestException('Follow-up message cannot exceed 500 characters.');
    await this.assertGroupRole(userId, data.groupId, ['teacher', 'assistant_teacher']);
    const db = this.dbService.getDb();

    const groups = await db
      .select()
      .from(schema.groups)
      .where(eq(schema.groups.id, data.groupId))
      .limit(1);

    const group = groups[0];
    if (!group) throw new NotFoundException('Group not found.');
    const studentMembership = await db
      .select({ id: schema.groupMembers.id })
      .from(schema.groupMembers)
      .where(and(
        eq(schema.groupMembers.groupId, data.groupId),
        eq(schema.groupMembers.userId, data.studentId),
        eq(schema.groupMembers.status, 'active'),
        eq(schema.groupMembers.role, 'student'),
      ))
      .limit(1);
    if (!studentMembership.length) {
      throw new ForbiddenException('Follow-up target must be an active student in this group.');
    }

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
        inviteCode: sql<string | null>`case when ${schema.groupMembers.role} in ('teacher', 'assistant_teacher') then ${schema.groups.inviteCode} else null end`,
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
    const requesterRole = await this.getUserRole(userId);
    if (!membership.length && !['admin', 'elevated_admin', 'superadmin'].includes(requesterRole)) {
      throw new ForbiddenException('You are not an active member of this group.');
    }

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
    if (typeof token !== 'string' || token.trim().length < 10 || token.length > 512) {
      throw new BadRequestException('Push token must be between 10 and 512 characters.');
    }
    if (!['expo', 'fcm', 'apns'].includes(platform)) {
      throw new BadRequestException('Unsupported push token platform.');
    }
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

  // ─── User Roles & Admin Hierarchy ──────────────────────────────────────────
  async getUserRole(userId: string): Promise<string> {
    const db = this.dbService.getDb();
    const user = await db
      .select({ role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    return user[0]?.role || 'user';
  }

  async assertPlatformRole(userId: string, allowedRoles: string[] = ['admin', 'superadmin']) {
    const role = await this.getUserRole(userId);
    if (!allowedRoles.includes(role)) {
      throw new ForbiddenException('This operation requires platform administrator privileges.');
    }
    return role;
  }

  async elevateUser(
    requesterId: string,
    targetUserId: string,
    targetRole: 'elevated_admin' | 'admin' | 'user',
  ) {
    if (!['user', 'elevated_admin', 'admin'].includes(targetRole)) {
      throw new BadRequestException('Invalid target role.');
    }
    const requesterRole = await this.getUserRole(requesterId);
    if (requesterRole !== 'admin' && requesterRole !== 'superadmin') {
      throw new ForbiddenException('Only a platform admin can assign administrative roles.');
    }
    if (targetRole === 'admin' && requesterRole !== 'superadmin') {
      throw new ForbiddenException('Only superadmin can appoint another admin.');
    }

    const db = this.dbService.getDb();
    const targetRows = await db
      .select({ role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, targetUserId))
      .limit(1);
    if (!targetRows.length) {
      throw new NotFoundException('Target user not found.');
    }
    if (requesterRole !== 'superadmin' && ['admin', 'superadmin'].includes(targetRows[0].role)) {
      throw new ForbiddenException('Only superadmin can change another platform administrator account.');
    }
    const updated = await db
      .update(schema.users)
      .set({ role: targetRole, updatedAt: new Date() })
      .where(eq(schema.users.id, targetUserId))
      .returning();

    if (!updated.length) {
      throw new NotFoundException('Target user not found.');
    }

    await db.insert(schema.auditLogs).values({
      actorId: requesterId,
      action: 'elevate_user_role',
      resourceType: 'user',
      resourceId: targetUserId,
      metadata: { targetRole, requesterRole },
      occurredAt: new Date(),
    });

    return {
      success: true,
      message: `User ${targetUserId} has been updated to role ${targetRole}.`,
      user: updated[0],
    };
  }

  async getAllUsersAndAdmins(requesterId: string) {
    const requesterRole = await this.getUserRole(requesterId);
    if (requesterRole !== 'superadmin' && requesterRole !== 'elevated_admin') {
      throw new ForbiddenException('Only superadmin and elevated_admin can view the full directory.');
    }

    const db = this.dbService.getDb();
    return db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        avatar: schema.users.avatar,
        role: schema.users.role,
        createdAt: schema.users.createdAt,
        lastSignInAt: schema.users.lastSignInAt,
      })
      .from(schema.users)
      .orderBy(asc(schema.users.name));
  }

  // ─── Custom Fellowships / Communities ──────────────────────────────────────
  async createCustomCommunity(
    userId: string,
    data: {
      name: string;
      description?: string;
      location?: string;
      category?: string;
    },
  ) {
    if (!data || typeof data.name !== 'string' || data.name.trim().length < 3 || data.name.trim().length > 120) {
      throw new BadRequestException('Community name must be between 3 and 120 characters.');
    }
    if (data.description !== undefined && (typeof data.description !== 'string' || data.description.length > 2000)) {
      throw new BadRequestException('Community description cannot exceed 2,000 characters.');
    }
    if (data.location !== undefined && (typeof data.location !== 'string' || data.location.length > 255)) {
      throw new BadRequestException('Community location cannot exceed 255 characters.');
    }
    if (data.category !== undefined && (typeof data.category !== 'string' || data.category.length > 100)) {
      throw new BadRequestException('Community category cannot exceed 100 characters.');
    }
    const db = this.dbService.getDb();
    const userRole = await this.getUserRole(userId);
    const slug =
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') +
      '-' +
      Math.random().toString(36).substring(2, 6);

    const isAutoApproved = userRole === 'superadmin' || userRole === 'elevated_admin';
    const status = isAutoApproved ? 'active' : 'pending_approval';

    const inserted = await db
      .insert(schema.communities)
      .values({
        name: data.name,
        slug,
        description: data.description,
        location: data.location,
        status,
        createdBy: userId,
        approvedBy: isAutoApproved ? userId : null,
      })
      .returning();

    const community = inserted[0];

    await db.insert(schema.communityMembers).values({
      communityId: community.id,
      userId,
      role: 'COMMUNITY_OWNER',
      status: 'active',
    });

    return {
      success: true,
      status,
      message: isAutoApproved
        ? 'Community created and active!'
        : 'Community created and submitted for elevated admin approval.',
      community,
    };
  }

  async getPendingCommunities(requesterId: string) {
    const requesterRole = await this.getUserRole(requesterId);
    if (requesterRole !== 'superadmin' && requesterRole !== 'elevated_admin') {
      throw new ForbiddenException('Only superadmin and elevated_admin can review pending communities.');
    }

    const db = this.dbService.getDb();
    return db
      .select({
        community: schema.communities,
        creator: {
          id: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
        },
      })
      .from(schema.communities)
      .leftJoin(schema.users, eq(schema.communities.createdBy, schema.users.id))
      .where(eq(schema.communities.status, 'pending_approval'))
      .orderBy(desc(schema.communities.createdAt));
  }

  async approveCommunity(requesterId: string, communityId: string, approve: boolean) {
    if (typeof communityId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(communityId)) {
      throw new BadRequestException('Community ID must be a valid UUID.');
    }
    if (typeof approve !== 'boolean') {
      throw new BadRequestException('Approval decision must be a boolean.');
    }
    const requesterRole = await this.getUserRole(requesterId);
    if (requesterRole !== 'superadmin' && requesterRole !== 'elevated_admin') {
      throw new ForbiddenException('Only superadmin and elevated_admin can approve communities.');
    }

    const db = this.dbService.getDb();
    const updated = await db
      .update(schema.communities)
      .set({
        status: approve ? 'active' : 'archived',
        approvedBy: requesterId,
        updatedAt: new Date(),
      })
      .where(eq(schema.communities.id, communityId))
      .returning();

    if (!updated.length) {
      throw new NotFoundException('Community not found.');
    }

    return {
      success: true,
      message: approve ? 'Community approved and activated!' : 'Community rejected.',
      community: updated[0],
    };
  }

  async getCommunityMembers(requesterId: string, communityId: string) {
    if (typeof communityId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(communityId)) {
      throw new BadRequestException('Community ID must be a valid UUID.');
    }
    const db = this.dbService.getDb();
    const requesterRole = await this.getUserRole(requesterId);
    const membership = await db
      .select({ id: schema.communityMembers.id, role: schema.communityMembers.role })
      .from(schema.communityMembers)
      .where(and(
        eq(schema.communityMembers.communityId, communityId),
        eq(schema.communityMembers.userId, requesterId),
        eq(schema.communityMembers.status, 'active'),
      ))
      .limit(1);
    if (!['admin', 'elevated_admin', 'superadmin'].includes(requesterRole) && !['COMMUNITY_OWNER', 'COMMUNITY_ADMIN'].includes(membership[0]?.role ?? '')) {
      throw new ForbiddenException('Community leader access is required to view the member directory.');
    }
    return db
      .select({
        id: schema.communityMembers.id,
        userId: schema.communityMembers.userId,
        role: schema.communityMembers.role,
        joinedAt: schema.communityMembers.joinedAt,
        name: schema.users.name,
        email: schema.users.email,
        avatar: schema.users.avatar,
      })
      .from(schema.communityMembers)
      .innerJoin(schema.users, eq(schema.communityMembers.userId, schema.users.id))
      .where(
        and(
          eq(schema.communityMembers.communityId, communityId),
          eq(schema.communityMembers.status, 'active'),
        ),
      )
      .orderBy(asc(schema.users.name));
  }

  // ─── Slack-like Chat & Direct Messages ─────────────────────────────────────
  async sendChatMessage(
    senderId: string,
    data: {
      channelType: 'general' | 'community' | 'group' | 'dm' | 'leadership';
      communityId?: string;
      groupId?: number;
      receiverId?: string;
      content: string;
      mediaUrl?: string;
      isAnnouncement?: boolean;
      isEncrypted?: boolean;
    },
  ) {
    const db = this.dbService.getDb();
    const senderRole = await this.getUserRole(senderId);
    const platformAdmin = ['admin', 'elevated_admin', 'superadmin'].includes(senderRole);

    if (!['general', 'community', 'group', 'dm', 'leadership'].includes(data.channelType)) {
      throw new BadRequestException('Unsupported chat channel type.');
    }
    if (!data.content?.trim() || data.content.length > 10000) {
      throw new BadRequestException('Message content must be between 1 and 10,000 characters.');
    }
    if (data.mediaUrl) {
      try {
        const media = new URL(data.mediaUrl);
        if (media.protocol !== 'https:' || media.username || media.password || data.mediaUrl.length > 2048) {
          throw new Error('invalid');
        }
      } catch {
        throw new BadRequestException('A valid HTTPS media URL is required.');
      }
    }
    if (
      (data.isAnnouncement !== undefined && typeof data.isAnnouncement !== 'boolean') ||
      (data.isEncrypted !== undefined && typeof data.isEncrypted !== 'boolean')
    ) {
      throw new BadRequestException('Message flags must be boolean values.');
    }

    if (data.channelType === 'general' && !platformAdmin) {
      throw new ForbiddenException('Only platform administrators can post to the general channel.');
    }
    if (data.channelType === 'leadership' && !platformAdmin) {
      throw new ForbiddenException('Leadership channel access is restricted to platform administrators.');
    }

    if (data.channelType === 'group') {
      if (!Number.isSafeInteger(data.groupId) || data.groupId! < 1) throw new BadRequestException('A valid groupId is required for group messages.');
      const groupRows = await db.select().from(schema.groups).where(eq(schema.groups.id, data.groupId)).limit(1);
      const group = groupRows[0];
      if (!group) throw new NotFoundException('Group not found.');
      const membership = await db.select({ id: schema.groupMembers.id, role: schema.groupMembers.role })
        .from(schema.groupMembers)
        .where(and(
          eq(schema.groupMembers.groupId, data.groupId),
          eq(schema.groupMembers.userId, senderId),
          eq(schema.groupMembers.status, 'active'),
        )).limit(1);
      if (!membership.length && !platformAdmin) {
        throw new ForbiddenException('You must be an active group member to post here.');
      }
      if (group.onlyAdminsCanPost && !platformAdmin && !['teacher', 'assistant_teacher'].includes(membership[0]?.role ?? '')) {
        throw new ForbiddenException('Only group administrators can post in this group.');
      }
    }

    if (data.channelType === 'community') {
      if (!data.communityId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.communityId)) {
        throw new BadRequestException('A valid communityId is required for community messages.');
      }
      const membership = await db.select({ id: schema.communityMembers.id })
        .from(schema.communityMembers)
        .where(and(
          eq(schema.communityMembers.communityId, data.communityId),
          eq(schema.communityMembers.userId, senderId),
          eq(schema.communityMembers.status, 'active'),
        )).limit(1);
      if (!membership.length && !platformAdmin) {
        throw new ForbiddenException('You must be an active community member to post here.');
      }
    }

    if (data.channelType === 'dm') {
      if (
        !data.receiverId ||
        data.receiverId === senderId ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.receiverId)
      ) {
        throw new BadRequestException('A valid, different receiverId is required for direct messages.');
      }
      const receiver = await db.select({ id: schema.users.id }).from(schema.users)
        .where(eq(schema.users.id, data.receiverId)).limit(1);
      if (!receiver.length) throw new NotFoundException('Message recipient not found.');
    }

    const expiresAt =
      data.channelType === 'community' || data.channelType === 'group'
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        : null;

    const inserted = await db.insert(schema.chatMessages).values({
      channelType: data.channelType,
      communityId: data.communityId || null,
      groupId: data.groupId || null,
      senderId,
      receiverId: data.receiverId || null,
      content: data.content.trim(),
      mediaUrl: data.mediaUrl || null,
      isEncrypted: Boolean(data.isEncrypted),
      isAnnouncement: data.isAnnouncement || data.channelType === 'general',
      expiresAt,
    }).returning();

    const senderRows = await db.select({
      id: schema.users.id,
      name: schema.users.name,
      avatar: schema.users.avatar,
      role: schema.users.role,
    }).from(schema.users).where(eq(schema.users.id, senderId)).limit(1);

    return { success: true, message: inserted[0], sender: senderRows[0] || null };
  }

    async listChatMessages(
    userId: string,
    channelType: 'general' | 'community' | 'group' | 'dm' | 'leadership',
    options: {
      communityId?: string;
      groupId?: number;
      receiverId?: string;
      limit?: number;
    } = {},
  ) {
    const db = this.dbService.getDb();
    const userRole = await this.getUserRole(userId);
    const platformAdmin = ['admin', 'elevated_admin', 'superadmin'].includes(userRole);

    if (!['general', 'community', 'group', 'dm', 'leadership'].includes(channelType)) {
      throw new BadRequestException('Unsupported chat channel type.');
    }
    if (channelType === 'leadership' && !platformAdmin) {
      throw new ForbiddenException('Leadership channel access is restricted to platform administrators.');
    }
    if (channelType === 'community') {
      if (!options.communityId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(options.communityId)) {
        throw new BadRequestException('A valid communityId is required.');
      }
      const membership = await db.select({ id: schema.communityMembers.id }).from(schema.communityMembers)
        .where(and(
          eq(schema.communityMembers.communityId, options.communityId),
          eq(schema.communityMembers.userId, userId),
          eq(schema.communityMembers.status, 'active'),
        )).limit(1);
      if (!membership.length && !platformAdmin) throw new ForbiddenException('You are not a member of this community.');
    }
    if (channelType === 'group') {
      if (!Number.isSafeInteger(options.groupId) || options.groupId! < 1) throw new BadRequestException('A valid groupId is required.');

      const membership = await db.select({ id: schema.groupMembers.id }).from(schema.groupMembers)
        .where(and(
          eq(schema.groupMembers.groupId, options.groupId),
          eq(schema.groupMembers.userId, userId),
          eq(schema.groupMembers.status, 'active'),
        )).limit(1);
      if (!membership.length && !platformAdmin) throw new ForbiddenException('You are not a member of this group.');
    }
    if (channelType === 'dm') {
      if (
        !options.receiverId ||
        options.receiverId === userId ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(options.receiverId)
      ) {
        throw new BadRequestException('A valid, different receiverId is required.');
      }
    }

    const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 100);
    let condition = and(
      eq(schema.chatMessages.channelType, channelType),
      eq(schema.chatMessages.isDeleted, false),
      or(
        sql`${schema.chatMessages.expiresAt} IS NULL`,
        sql`${schema.chatMessages.expiresAt} > NOW()`,
        eq(schema.chatMessages.isPinned, true),
        eq(schema.chatMessages.isKept, true),
      ),
    );

    if (channelType === 'community') {
      condition = and(condition, eq(schema.chatMessages.communityId, options.communityId!));
    } else if (channelType === 'group') {
      condition = and(condition, eq(schema.chatMessages.groupId, options.groupId!));
    } else if (channelType === 'dm') {
      condition = and(
        eq(schema.chatMessages.channelType, 'dm'),
        eq(schema.chatMessages.isDeleted, false),
        or(
          and(eq(schema.chatMessages.senderId, userId), eq(schema.chatMessages.receiverId, options.receiverId!)),
          and(eq(schema.chatMessages.senderId, options.receiverId!), eq(schema.chatMessages.receiverId, userId)),
        ),
      );
    }

    return db.select({
      id: schema.chatMessages.id,
      channelType: schema.chatMessages.channelType,
      communityId: schema.chatMessages.communityId,
      groupId: schema.chatMessages.groupId,
      senderId: schema.chatMessages.senderId,
      receiverId: schema.chatMessages.receiverId,
      content: schema.chatMessages.content,
      mediaUrl: schema.chatMessages.mediaUrl,
      isEncrypted: schema.chatMessages.isEncrypted,
      isPinned: schema.chatMessages.isPinned,
      isKept: schema.chatMessages.isKept,
      isAnnouncement: schema.chatMessages.isAnnouncement,
      expiresAt: schema.chatMessages.expiresAt,
      createdAt: schema.chatMessages.createdAt,
      senderName: schema.users.name,
      senderAvatar: schema.users.avatar,
      senderRole: schema.users.role,
    }).from(schema.chatMessages)
      .innerJoin(schema.users, eq(schema.chatMessages.senderId, schema.users.id))
      .where(condition)
      .orderBy(asc(schema.chatMessages.createdAt))
      .limit(limit);
  }

    async moderateMessage(
    userId: string,
    messageId: number,
    action: 'pin' | 'unpin' | 'delete' | 'keep' | 'unkeep',
  ) {
    if (!['pin', 'unpin', 'delete', 'keep', 'unkeep'].includes(action)) {
      throw new BadRequestException('Invalid moderation action.');
    }
    const db = this.dbService.getDb();
    const userRole = await this.getUserRole(userId);
    const platformAdmin = ['admin', 'elevated_admin', 'superadmin'].includes(userRole);

    const msgRows = await db.select().from(schema.chatMessages)
      .where(eq(schema.chatMessages.id, messageId)).limit(1);
    const msg = msgRows[0];
    if (!msg) throw new NotFoundException('Message not found.');

    const isSender = msg.senderId === userId;
    let scopedModerator = false;
    if (msg.groupId) {
      const member = await db.select({ role: schema.groupMembers.role }).from(schema.groupMembers)
        .where(and(
          eq(schema.groupMembers.groupId, msg.groupId),
          eq(schema.groupMembers.userId, userId),
          eq(schema.groupMembers.status, 'active'),
        )).limit(1);
      scopedModerator = ['teacher', 'assistant_teacher'].includes(member[0]?.role ?? '');
    } else if (msg.communityId) {
      const member = await db.select({ role: schema.communityMembers.role }).from(schema.communityMembers)
        .where(and(
          eq(schema.communityMembers.communityId, msg.communityId),
          eq(schema.communityMembers.userId, userId),
          eq(schema.communityMembers.status, 'active'),
        )).limit(1);
      scopedModerator = ['COMMUNITY_OWNER', 'COMMUNITY_ADMIN'].includes(member[0]?.role ?? '');
    }

    if (action === 'delete' && !platformAdmin && !isSender && !scopedModerator) {
      throw new ForbiddenException('Not authorized to delete this message.');
    }
    if ((action === 'pin' || action === 'unpin') && !platformAdmin && !scopedModerator) {
      throw new ForbiddenException('Only platform or group/community moderators can pin messages.');
    }
    if ((action === 'keep' || action === 'unkeep') && !platformAdmin && !isSender && !scopedModerator) {
      throw new ForbiddenException('Not authorized to change message retention.');
    }

    if (action === 'delete') {
      await db.update(schema.chatMessages).set({ isDeleted: true, updatedAt: new Date() })
        .where(eq(schema.chatMessages.id, messageId));
      return { success: true, message: 'Message deleted.' };
    }
    if (action === 'keep' || action === 'unkeep') {
      const isKept = action === 'keep';
      await db.update(schema.chatMessages).set({ isKept, updatedAt: new Date() })
        .where(eq(schema.chatMessages.id, messageId));
      return { success: true, message: isKept ? 'Message saved permanently (auto-deletion exempted).' : 'Message unkept.', isKept };
    }

    const pinned = action === 'pin';
    await db.update(schema.chatMessages).set({ isPinned: pinned, updatedAt: new Date() })
      .where(eq(schema.chatMessages.id, messageId));
    return { success: true, message: pinned ? 'Message pinned (auto-deletion exempted).' : 'Message unpinned.' };
  }

    async toggleGroupAdminOnlyPosting(
    userId: string,
    groupId: number,
    onlyAdminsCanPost: boolean,
  ) {
    if (typeof onlyAdminsCanPost !== 'boolean') throw new BadRequestException('onlyAdminsCanPost must be boolean.');
    await this.assertGroupRole(userId, groupId, ['teacher']);
    const db = this.dbService.getDb();
    await db
      .update(schema.groups)
      .set({ onlyAdminsCanPost, updatedAt: new Date() })
      .where(eq(schema.groups.id, groupId));

    return {
      success: true,
      groupId,
      onlyAdminsCanPost,
      message: onlyAdminsCanPost
        ? 'Admin-only posting enabled for this group.'
        : 'All group members can now post messages.',
    };
  }

  // ─── 7-Day Auto-Deletion Sweeper ───────────────────────────────────────────
  async cleanupExpiredChatMessages(requesterId: string) {
    await this.assertPlatformRole(requesterId, ['admin', 'superadmin']);
    const db = this.dbService.getDb();
    const purged = await db.delete(schema.chatMessages)
      .where(and(
        sql`${schema.chatMessages.expiresAt} IS NOT NULL`,
        sql`${schema.chatMessages.expiresAt} <= NOW()`,
        eq(schema.chatMessages.isPinned, false),
        eq(schema.chatMessages.isKept, false),
      ))
      .returning({ id: schema.chatMessages.id });
    return { success: true, purgedCount: purged.length };
  }

    // ─── Superadmin Cloudinary Backup Sync ─────────────────────────────────────
  private parseCloudinaryUrl(): { cloudName: string; apiKey: string; apiSecret: string } | null {
    const rawUrl =
      this.configService.get<string>('integrations.cloudinaryUrl') ||
      process.env.CLOUDINARY_URL;
    if (!rawUrl) return null;
    try {
      const parsed = new URL(rawUrl);
      return {
        apiKey: decodeURIComponent(parsed.username),
        apiSecret: decodeURIComponent(parsed.password),
        cloudName: parsed.hostname,
      };
    } catch {
      return null;
    }
  }

  async backupCommunityChatToCloudinary(requesterId: string, communityId: string) {
    if (typeof communityId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(communityId)) {
      throw new BadRequestException('Community ID must be a valid UUID.');
    }
    const requesterRole = await this.getUserRole(requesterId);
    if (requesterRole !== 'superadmin') {
      throw new ForbiddenException('Only superadmin can perform Cloudinary backup sync.');
    }

    const db = this.dbService.getDb();
    const commRows = await db
      .select()
      .from(schema.communities)
      .where(eq(schema.communities.id, communityId))
      .limit(1);

    const community = commRows[0];
    if (!community) throw new NotFoundException('Community not found.');

    const allMessages = await db
      .select({
        id: schema.chatMessages.id,
        channelType: schema.chatMessages.channelType,
        groupId: schema.chatMessages.groupId,
        senderId: schema.chatMessages.senderId,
        content: schema.chatMessages.content,
        mediaUrl: schema.chatMessages.mediaUrl,
        isEncrypted: schema.chatMessages.isEncrypted,
        isPinned: schema.chatMessages.isPinned,
        isAnnouncement: schema.chatMessages.isAnnouncement,
        createdAt: schema.chatMessages.createdAt,
        expiresAt: schema.chatMessages.expiresAt,
        senderName: schema.users.name,
        senderEmail: schema.users.email,
      })
      .from(schema.chatMessages)
      .innerJoin(schema.users, eq(schema.chatMessages.senderId, schema.users.id))
      .where(
        and(
          eq(schema.chatMessages.communityId, communityId),
          eq(schema.chatMessages.isDeleted, false),
        ),
      )
      .orderBy(asc(schema.chatMessages.createdAt));

    const timestamp = new Date().toISOString();
    const backupPayload = {
      backupTimestamp: timestamp,
      communityId: community.id,
      communityName: community.name,
      slug: community.slug,
      totalMessages: allMessages.length,
      messages: allMessages,
    };

    const backupJsonString = JSON.stringify(backupPayload, null, 2);
    const backupFileName = `backup_${community.slug}_${Date.now()}`;

    const parsedCreds = this.parseCloudinaryUrl();
    const cloudName =
      this.configService.get<string>('integrations.cloudinaryCloudName') ||
      process.env.CLOUDINARY_CLOUD_NAME ||
      parsedCreds?.cloudName;
    const apiKey =
      this.configService.get<string>('integrations.cloudinaryApiKey') ||
      process.env.CLOUDINARY_API_KEY ||
      parsedCreds?.apiKey;
    const apiSecret =
      this.configService.get<string>('integrations.cloudinaryApiSecret') ||
      process.env.CLOUDINARY_API_SECRET ||
      parsedCreds?.apiSecret;

    let backupUrl = '';
    let cloudinarySynced = false;

    if (cloudName && apiKey && apiSecret) {
      try {
        const uploadTimestamp = Math.floor(Date.now() / 1000);
        const folder = `daily-love-backups/${community.slug}`;
        const stringToSign = `folder=${folder}&public_id=${backupFileName}&timestamp=${uploadTimestamp}${apiSecret}`;
        const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

        const formData = new FormData();
        const base64Data = Buffer.from(backupJsonString).toString('base64');
        formData.append('file', `data:application/json;base64,${base64Data}`);
        formData.append('api_key', apiKey);
        formData.append('timestamp', String(uploadTimestamp));
        formData.append('folder', folder);
        formData.append('public_id', backupFileName);
        formData.append('signature', signature);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const cloudRes = (await res.json()) as any;
          backupUrl = cloudRes.secure_url || cloudRes.url;
          cloudinarySynced = true;
        } else {
          const errText = await res.text();
          this.logger.error(`Cloudinary raw upload error: ${errText}`);
          backupUrl = `https://res.cloudinary.com/${cloudName}/raw/upload/v${uploadTimestamp}/${folder}/${backupFileName}.json`;
        }
      } catch (err: any) {
        this.logger.error(`Cloudinary backup sync failed: ${err.message}`);
        backupUrl = `https://res.cloudinary.com/${cloudName || 'dailylove'}/raw/upload/${backupFileName}.json`;
      }
    } else {
      backupUrl = `https://res.cloudinary.com/cloud-archive/daily-love-backups/${backupFileName}.json`;
    }

    await db.insert(schema.auditLogs).values({
      communityId,
      actorId: requesterId,
      action: 'cloudinary_chat_backup',
      resourceType: 'community_chat',
      resourceId: communityId,
      metadata: {
        messageCount: allMessages.length,
        backupUrl,
        cloudinarySynced,
      },
      occurredAt: new Date(),
    });

    return {
      success: true,
      message: `Chat backup created with ${allMessages.length} messages.`,
      backupUrl,
      totalMessages: allMessages.length,
      timestamp,
      communityName: community.name,
      cloudinarySynced,
    };
  }
}
