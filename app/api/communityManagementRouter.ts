import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, elevatedAdminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { auditLogs, communities, communityMembers, users } from "@db/schema";

export const communityManagementRouter = createRouter({
  listActiveCommunities: elevatedAdminQuery.query(async () => {
    const db = await getDb();
    return db.select({ id: communities.id, name: communities.name })
      .from(communities)
      .where(eq(communities.status, "active"))
      .orderBy(asc(communities.name));
  }),

  listActiveMembers: elevatedAdminQuery
    .input(z.object({ communityId: z.string().uuid() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const community = await db.query.communities.findFirst({
        where: and(eq(communities.id, input.communityId), eq(communities.status, "active")),
      });
      if (!community) throw new TRPCError({ code: "NOT_FOUND", message: "Active community not found." });

      return db.select({
        userId: users.id,
        name: users.name,
        email: users.email,
        role: communityMembers.role,
      })
        .from(communityMembers)
        .innerJoin(users, eq(communityMembers.userId, users.id))
        .where(and(
          eq(communityMembers.communityId, input.communityId),
          eq(communityMembers.status, "active"),
        ))
        .orderBy(asc(users.name));
    }),

  appointOwner: elevatedAdminQuery
    .input(z.object({
      communityId: z.string().uuid(),
      userId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const community = await db.query.communities.findFirst({
        where: and(eq(communities.id, input.communityId), eq(communities.status, "active")),
      });
      if (!community) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Active community not found." });
      }
      const membership = await db.query.communityMembers.findFirst({
        where: and(
          eq(communityMembers.communityId, input.communityId),
          eq(communityMembers.userId, input.userId),
          eq(communityMembers.status, "active"),
        ),
      });
      if (!membership) {
        throw new TRPCError({ code: "NOT_FOUND", message: "The selected user must be an active member of this community." });
      }
      if (membership.role === "COMMUNITY_OWNER") {
        return { success: true, unchanged: true };
      }

      await db.update(communityMembers)
        .set({ role: "COMMUNITY_OWNER", approvedBy: ctx.user.id })
        .where(eq(communityMembers.id, membership.id));

      await db.insert(auditLogs).values({
        actorId: ctx.user.id,
        action: "appoint_community_owner",
        resourceType: "community_membership",
        resourceId: String(membership.id),
        metadata: {
          communityId: input.communityId,
          userId: input.userId,
          previousRole: membership.role,
          assignedRole: "COMMUNITY_OWNER",
        },
        occurredAt: new Date(),
      });

      return { success: true, unchanged: false };
    }),
});
