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
  auditLogs,
} from "@db/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { assertGroupRole } from "./lib/rbac";
import { TRPCError } from "@trpc/server";

export const communityRouter = createRouter({
  // ─── List Communities current user belongs to ──────────────────────────────
  myCommunities: authedQuery.query(async ({ ctx }) => {
    const db = await getDb();
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
    const db = await getDb();
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
        inviteCode: sql<string | null>`case when ${groupMembers.role} in ('teacher', 'assistant_teacher') then ${groups.inviteCode} else null end`,
        role: groupMembers.role, // 'teacher' | 'student' | 'assistant_teacher'
        joinedAt: groupMembers.joinedAt,
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .innerJoin(communities, eq(groups.communityId, communities.id))
      .where(and(eq(groupMembers.userId, ctx.user.id), eq(groupMembers.status, "active")));

    return rows;
  }),



  ownedCommunityGroups: authedQuery
    .input(z.object({ communityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const ownerMembership = await db.query.communityMembers.findFirst({
        where: and(
          eq(communityMembers.communityId, input.communityId),
          eq(communityMembers.userId, ctx.user.id),
          eq(communityMembers.status, "active"),
          eq(communityMembers.role, "COMMUNITY_OWNER"),
        ),
      });
      if (!ownerMembership) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this community." });
      }
      return db.select({
        id: groups.id,
        name: groups.name,
        slug: groups.slug,
        category: groups.category,
        status: groups.status,
      }).from(groups)
        .where(eq(groups.communityId, input.communityId))
        .orderBy(asc(groups.name));
    }),

  // Community-owner operations are scoped to an active owner membership.
  updateOwnedCommunity: authedQuery
    .input(z.object({
      communityId: z.string().uuid(),
      name: z.string().trim().min(2).max(255).optional(),
      description: z.string().trim().max(5000).nullable().optional(),
      location: z.string().trim().max(255).nullable().optional(),
      contactEmail: z.string().email().max(320).nullable().optional(),
      contactPhone: z.string().trim().max(50).nullable().optional(),
    }).refine((input) => Object.keys(input).some((key) => key !== "communityId" && input[key as keyof typeof input] !== undefined), {
      message: "Provide at least one community field to update.",
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const ownerMembership = await db.query.communityMembers.findFirst({
        where: and(
          eq(communityMembers.communityId, input.communityId),
          eq(communityMembers.userId, ctx.user.id),
          eq(communityMembers.status, "active"),
          eq(communityMembers.role, "COMMUNITY_OWNER"),
        ),
      });
      if (!ownerMembership) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this community." });
      }

      const { communityId, ...changes } = input;
      const [updated] = await db.update(communities)
        .set({ ...changes, updatedAt: new Date() })
        .where(eq(communities.id, communityId))
        .returning({ id: communities.id, name: communities.name });

      await db.insert(auditLogs).values({
        actorId: ctx.user.id,
        action: "update_owned_community",
        resourceType: "community",
        resourceId: communityId,
        metadata: { fields: Object.keys(changes) },
        occurredAt: new Date(),
      });
      return { success: true, community: updated };
    }),

  createOwnedGroup: authedQuery
    .input(z.object({
      communityId: z.string().uuid(),
      name: z.string().trim().min(2).max(255),
      description: z.string().trim().max(2000).optional(),
      category: z.string().trim().min(2).max(100).default("Sunday School"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const ownerMembership = await db.query.communityMembers.findFirst({
        where: and(
          eq(communityMembers.communityId, input.communityId),
          eq(communityMembers.userId, ctx.user.id),
          eq(communityMembers.status, "active"),
          eq(communityMembers.role, "COMMUNITY_OWNER"),
        ),
      });
      if (!ownerMembership) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this community." });
      }
      const slugBase = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "group";
      const [created] = await db.insert(groups).values({
        communityId: input.communityId,
        name: input.name,
        description: input.description ?? null,
        category: input.category,
        slug: `${slugBase}-${crypto.randomUUID().slice(0, 8)}`,
        createdBy: ctx.user.id,
      }).returning({ id: groups.id, name: groups.name, slug: groups.slug });

      await db.insert(auditLogs).values({
        actorId: ctx.user.id,
        action: "create_owned_group",
        resourceType: "group",
        resourceId: String(created.id),
        metadata: { communityId: input.communityId, category: input.category },
        occurredAt: new Date(),
      });
      return { success: true, group: created };
    }),

  // ─── Get Group Details with Announcements & Active Reading Assignments ─────
  groupDetails: authedQuery
    .input(z.object({ groupId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();

      // Check group existence and membership
      const membership = await db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, input.groupId),
          eq(groupMembers.userId, ctx.user.id),
          eq(groupMembers.status, "active")
        ),
      });

      const group = await db.query.groups.findFirst({
        columns: {
          id: true,
          communityId: true,
          name: true,
          slug: true,
          description: true,
          groupImage: true,
          category: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        where: eq(groups.id, input.groupId),
      });

      if (!group) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
      }

      if (!membership) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not an active member of this group." });
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

      const db = await getDb();

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
      const db = await getDb();
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
