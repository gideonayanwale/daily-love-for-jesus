import { getDb } from "../queries/connection";
import { groupMembers, communityMembers, users, type User } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { authenticateSupabaseRequest } from "../context";

export type GroupRole = "teacher" | "assistant_teacher" | "student" | "moderator";
export type CommunityRole = "COMMUNITY_OWNER" | "COMMUNITY_ADMIN" | "COMMUNITY_MODERATOR" | "MEMBER";

export class AuthorizationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 403) {
    super(message);
    this.name = "AuthorizationError";
    this.statusCode = statusCode;
  }
}

/**
 * Extracts and authenticates the requesting user from headers/cookies.
 */
export async function authenticateRequestUser(req: Request): Promise<User> {
  const user = await authenticateSupabaseRequest(req.headers);
  if (!user) {
    throw new AuthorizationError("Authentication required to access this resource", 401);
  }
  return user;
}

/**
 * Ensures the user has one of the allowed roles within a group (e.g. ['teacher', 'assistant_teacher']).
 */
export async function assertGroupRole(
  userId: string,
  groupId: number,
  allowedRoles: GroupRole[] = ["teacher", "assistant_teacher"]
) {
  const db = getDb();

  // Master admins always have permission
  const userRecord = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (userRecord?.role === "admin") {
    return { role: "teacher" as GroupRole, status: "active" };
  }

  const membership = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, userId),
      eq(groupMembers.status, "active")
    ),
  });

  if (!membership || !allowedRoles.includes(membership.role as GroupRole)) {
    throw new AuthorizationError(
      `Access denied: requires one of [${allowedRoles.join(", ")}] roles in group ${groupId}`,
      403
    );
  }

  return membership;
}

/**
 * Verifies that a user is an active member of the group (any role).
 */
export async function assertGroupMember(userId: string, groupId: number) {
  const db = getDb();
  const membership = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, userId),
      eq(groupMembers.status, "active")
    ),
  });

  if (!membership) {
    throw new AuthorizationError(`You are not a member of group ${groupId}`, 403);
  }

  return membership;
}

/**
 * Ensures the user has community administrator privileges.
 */
export async function assertCommunityAdmin(userId: string, communityId: string) {
  const db = getDb();

  const userRecord = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (userRecord?.role === "admin") {
    return { role: "COMMUNITY_ADMIN" as CommunityRole, status: "active" };
  }

  const membership = await db.query.communityMembers.findFirst({
    where: and(
      eq(communityMembers.communityId, communityId),
      eq(communityMembers.userId, userId),
      eq(communityMembers.status, "active")
    ),
  });

  if (!membership || !["COMMUNITY_OWNER", "COMMUNITY_ADMIN"].includes(membership.role)) {
    throw new AuthorizationError(
      `Access denied: Administrator privileges required for community ${communityId}`,
      403
    );
  }

  return membership;
}
