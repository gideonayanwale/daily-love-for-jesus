import { createRouter, elevatedAdminQuery } from './middleware';
import { getDb } from './queries/connection';
import { groups, communities, groupMembers, users } from '@db/schema';
import { eq, and, notInArray } from 'drizzle-orm';
import { z } from 'zod';
import { communityMembers } from '@db/schema';
import { TRPCError } from '@trpc/server';

export const teacherAssignmentRouter = createRouter({
  // ── List all active groups with their current teacher ──────────────────────
  listGroups: elevatedAdminQuery.query(async () => {
    const db = await getDb();

    const rows = await db
      .select({
        groups: {
          id: groups.id,
          name: groups.name,
        },
        communities: {
          name: communities.name,
        },
        groupMembers: {
          userId: groupMembers.userId,
        },
        users: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(groups)
      .innerJoin(communities, eq(groups.communityId, communities.id))
      .leftJoin(
        groupMembers,
        and(
          eq(groupMembers.groupId, groups.id),
          eq(groupMembers.role, 'teacher'),
          eq(groupMembers.status, 'active')
        )
      )
      .leftJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groups.status, 'active'));

    return rows.map((row) => ({
      groupId: row.groups.id,
      groupName: row.groups.name,
      communityName: row.communities.name,
      currentTeacher:
        row.users.id != null
          ? { userId: row.users.id, name: row.users.name, email: row.users.email }
          : null,
    }));
  }),

  // ── List users eligible to be assigned as teacher for a group ─────────────
  listEligibleUsers: elevatedAdminQuery
    .input(z.object({ groupId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();

      const group = await db.query.groups.findFirst({
        where: eq(groups.id, input.groupId),
      });

      if (!group) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found' });
      }

      // Get existing active teacher userIds for this group
      const existingTeachers = await db
        .select({ userId: groupMembers.userId })
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, input.groupId),
            eq(groupMembers.role, 'teacher'),
            eq(groupMembers.status, 'active')
          )
        );

      const existingTeacherIds = existingTeachers.map((r) => r.userId);

      // Build base conditions for active community members
      const baseConditions = and(
        eq(communityMembers.status, 'active'),
        eq(communityMembers.communityId, group.communityId)
      );

      const rows =
        existingTeacherIds.length > 0
          ? await db
              .select({
                id: users.id,
                name: users.name,
                email: users.email,
              })
              .from(communityMembers)
              .innerJoin(users, eq(communityMembers.userId, users.id))
              .where(and(baseConditions, notInArray(users.id, existingTeacherIds)))
          : await db
              .select({
                id: users.id,
                name: users.name,
                email: users.email,
              })
              .from(communityMembers)
              .innerJoin(users, eq(communityMembers.userId, users.id))
              .where(baseConditions);

      return rows.map((row) => ({
        userId: row.id,
        name: row.name,
        email: row.email,
      }));
    }),

  // ── Assign a user as teacher of a group ───────────────────────────────────
  assign: elevatedAdminQuery
    .input(z.object({ groupId: z.number().int().positive(), userId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const db = await getDb();

      const group = await db.query.groups.findFirst({ where: eq(groups.id, input.groupId) });
      if (!group) throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found' });
      const eligible = await db.query.communityMembers.findFirst({
        where: and(
          eq(communityMembers.communityId, group.communityId),
          eq(communityMembers.userId, input.userId),
          eq(communityMembers.status, 'active'),
        ),
      });
      if (!eligible) throw new TRPCError({ code: 'FORBIDDEN', message: 'Teacher must be an active member of the group community' });

      const existing = await db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, input.groupId),
          eq(groupMembers.userId, input.userId)
        ),
      });

      if (existing) {
        await db
          .update(groupMembers)
          .set({ role: 'teacher', status: 'active' })
          .where(
            and(
              eq(groupMembers.groupId, input.groupId),
              eq(groupMembers.userId, input.userId)
            )
          );
      } else {
        await db.insert(groupMembers).values({
          groupId: input.groupId,
          userId: input.userId,
          role: 'teacher',
          status: 'active',
        });
      }

      return { success: true };
    }),

  // ── Remove teacher role from a group member ───────────────────────────────
  remove: elevatedAdminQuery
    .input(z.object({ groupId: z.number(), userId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const existing = await db.query.groupMembers.findFirst({
        where: and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.userId)),
      });
      if (!existing || existing.role !== 'teacher') {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Active teacher assignment not found' });
      }

      await db
        .update(groupMembers)
        .set({ role: 'student', status: 'active' })
        .where(
          and(
            eq(groupMembers.groupId, input.groupId),
            eq(groupMembers.userId, input.userId)
          )
        );

      return { success: true };
    }),
});
