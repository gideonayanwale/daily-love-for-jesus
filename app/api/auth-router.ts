import { z } from "zod";
import * as cookie from "cookie";
import { eq } from "drizzle-orm";
import { createRouter, authedQuery, strictAdminQuery } from "./middleware";
import { upsertUser } from "./queries/users";
import { getDb } from "./queries/connection";
import * as schema from "@db/schema";
import { TRPCError } from "@trpc/server";

export const authRouter = createRouter({
  me: authedQuery.query((opts) => opts.ctx.user),

  updateProfile: authedQuery
    .input(
      z.object({
        name: z.string().trim().min(1).max(255).optional(),
        avatar: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await upsertUser({
        id: ctx.user.id,
        email: ctx.user.email,
        name: input.name ?? ctx.user.name,
        avatar: input.avatar ?? ctx.user.avatar,
        role: ctx.user.role,
      });
      return updated ?? ctx.user;
    }),

  logout: authedQuery.mutation(async ({ ctx }) => {
    for (const name of ["sb-access-token", "daily_love_token"]) {
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(name, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: true }),
      );
    }
    return { success: true };
  }),

  promoteToElevatedAdmin: strictAdminQuery
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const updated = await db
        .update(schema.users)
        .set({ role: "elevated_admin", updatedAt: new Date() })
        .where(eq(schema.users.id, input.userId))
        .returning({ id: schema.users.id, role: schema.users.role });
      if (!updated.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Target user not found." });
      }
      await db.insert(schema.auditLogs).values({
        actorId: ctx.user.id,
        action: "promote_elevated_admin",
        resourceType: "user",
        resourceId: input.userId,
        metadata: { previousRole: "user", targetRole: "elevated_admin" },
        occurredAt: new Date(),
      });
      return { success: true, user: updated[0] };
    }),
});
