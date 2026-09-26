import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  communities,
  communityMembers,
  groups,
  groupMembers,
  announcements,
  readingAssignments,
  assignmentSubmissions,
  readingLogs,
  pushTokens,
  users,
} from "@db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { assertGroupRole } from "./lib/rbac";
import { TRPCError } from "@trpc/server";

export const communityRouter = createRouter({
  // ─── List Communities current user belongs to ──────────────────────────────
  myCommunities: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db
      .select({
        id: communities.id,
        name: communities.name,
        slug: communities.slug,
        description: communities.description,
        logo: communities.logo,
        coverImage: communities.coverImage,
        location: communities.location,
        role: communityMembers.role,
        status: communityMembers.status,
        joinedAt: communityMembers.joinedAt,
      })
      .from(communityMembers)
      .innerJoin(communities, eq(communityMembers.communityId, communities.id))
      .where(and(eq(communityMembers.userId, ctx.user.id), eq(communityMembers.status, "active")));

    return rows;
  }),

  // ─── List Groups current user belongs to (Sunday School classes, etc.) ──────
  myGroups: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db
      .select({
        id: groups.id,
        communityId: groups.communityId,
        communityName: communities.name,
        name: groups.name,
        slug: groups.slug,
        description: groups.description,
        groupImage: groups.groupImage,
        category: groups.category,
        inviteCode: groups.inviteCode,
        role: groupMembers.role, // 'teacher' | 'student' | 'assistant_teacher'
        joinedAt: groupMembers.joinedAt,
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .innerJoin(communities, eq(groups.communityId, communities.id))
      .where(and(eq(groupMembers.userId, ctx.user.id), eq(groupMembers.status, "active")));

    return rows;
  }),

  // ─── Get Group Details with Announcements & Active Reading Assignments ─────
  groupDetails: authedQuery
    .input(z.object({ groupId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();

      // Check group existence and membership
      const membership = await db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, input.groupId),
          eq(groupMembers.userId, ctx.user.id),
          eq(groupMembers.status, "active")
        ),
      });

      const group = await db.query.groups.findFirst({
        where: eq(groups.id, input.groupId),
      });

      if (!group) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
      }

      // Fetch announcements
      const recentAnnouncements = await db
        .select({
          id: announcements.id,
          title: announcements.title,
          body: announcements.body,
          priority: announcements.priority,
          announcementType: announcements.announcementType,
          createdAt: announcements.createdAt,
          authorName: users.name,
          authorAvatar: users.avatar,
        })
        .from(announcements)
        .innerJoin(users, eq(announcements.authorId, users.id))
        .where(eq(announcements.groupId, input.groupId))
        .orderBy(desc(announcements.createdAt))
        .limit(10);

      // Fetch active reading assignments
      const activeAssignments = await db
        .select()
        .from(readingAssignments)
        .where(
          and(
            eq(readingAssignments.groupId, input.groupId),
            eq(readingAssignments.status, "published")
          )
        )
        .orderBy(desc(readingAssignments.dueDate))
        .limit(10);

      return {
        group,
        myRole: membership?.role ?? null,
        announcements: recentAnnouncements,
        assignments: activeAssignments,
      };
    }),

  // ─── Teacher Dashboard Overview ───────────────────────────────────────────
  teacherOverview: authedQuery
    .input(z.object({ groupId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      // Must have teacher role
      await assertGroupRole(ctx.user.id, input.groupId, ["teacher", "assistant_teacher"]);

      const db = getDb();

      // 1. Total student count
      const studentCountResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, input.groupId),
            eq(groupMembers.status, "active"),
            eq(groupMembers.role, "student")
          )
        );
      const totalStudents = studentCountResult[0]?.count ?? 0;

      // 2. Active students in the last 7 days
      const activeWeekResult = await db
        .select({ count: sql<number>`count(distinct ${readingLogs.userId})::int` })
        .from(readingLogs)
        .where(
          and(
            eq(readingLogs.groupId, input.groupId),
            sql`${readingLogs.completedAt} >= now() - interval '7 days'`
          )
        );
      const activeThisWeek = activeWeekResult[0]?.count ?? 0;

      // 3. Current active reading assignment completion rate
      const latestAssignment = await db.query.readingAssignments.findFirst({
        where: and(
          eq(readingAssignments.groupId, input.groupId),
          eq(readingAssignments.status, "published")
        ),
        orderBy: desc(readingAssignments.dueDate),
      });

      let assignmentCompletionRate = 0;
      let completedCount = 0;

      if (latestAssignment && totalStudents > 0) {
        const completedSubs = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(assignmentSubmissions)
          .where(
            and(
              eq(assignmentSubmissions.assignmentId, latestAssignment.id),
              eq(assignmentSubmissions.status, "submitted")
            )
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
    }),

  // ─── Register Mobile Push Token ───────────────────────────────────────────
  registerPushToken: authedQuery
    .input(
      z.object({
        token: z.string().min(10),
        platform: z.enum(["expo", "fcm", "apns"]).default("expo"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .insert(pushTokens)
        .values({
          userId: ctx.user.id,
          token: input.token,
          platform: input.platform,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: pushTokens.token,
          set: {
            userId: ctx.user.id,
            platform: input.platform,
            updatedAt: new Date(),
          },
        });

      return { success: true };
    }),
});
