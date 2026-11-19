import { z } from "zod";
import * as cookie from "cookie";
import { eq } from "drizzle-orm";
import { createRouter, authedQuery, strictAdminQuery } from "./middleware";
import { upsertUser } from "./queries/users";
import { getDb, getNeonDb, getSupabaseDb } from "./queries/connection";
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
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot change your own platform role." });
      }
      const db = await getDb();
      const [neonDb, supabaseDb] = await Promise.all([getNeonDb(), getSupabaseDb()]);
      const secondaryDb = db === neonDb ? supabaseDb : neonDb;
      const existing = await db
        .select({ role: schema.users.role })
        .from(schema.users)
        .where(eq(schema.users.id, input.userId))
        .limit(1);
      if (!existing.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Target user not found." });
      }
      if (!["user", "elevated_admin"].includes(existing[0].role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This account's platform role cannot be changed through this operation." });
      }
      const updated = await db
        .update(schema.users)
        .set({ role: "elevated_admin", updatedAt: new Date() })
        .where(eq(schema.users.id, input.userId))
        .returning({ id: schema.users.id, role: schema.users.role });
      if (secondaryDb && secondaryDb !== db) {
        await secondaryDb
          .update(schema.users)
          .set({ role: "elevated_admin", updatedAt: new Date() })
          .where(eq(schema.users.id, input.userId));
      }
      await db.insert(schema.auditLogs).values({
        actorId: ctx.user.id,
        action: "promote_elevated_admin",
        resourceType: "user",
        resourceId: input.userId,
        metadata: { previousRole: existing[0].role, targetRole: "elevated_admin" },
        occurredAt: new Date(),
      });
      return { success: true, user: updated[0] };
    }),
});
