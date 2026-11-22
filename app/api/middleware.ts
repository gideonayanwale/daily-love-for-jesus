import { ErrorMessages } from "@contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
const rejectInvalidCredential = t.middleware(async ({ ctx, next }) => {
  if (ctx.authError) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or expired authentication token",
    });
  }
  return next();
});

export const publicQuery = t.procedure.use(rejectInvalidCredential);

const requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ErrorMessages.unauthenticated,
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

function requireRoles(roles: string[]) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || !roles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: ErrorMessages.insufficientRole,
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

export const authedQuery = t.procedure.use(requireAuth);

// Allows both admins and elevated_admins (most admin procedures)
export const adminQuery = authedQuery.use(requireRoles(["admin", "elevated_admin", "superadmin"]));

// Elevated-admin and above (alias kept for clarity in devotional/telegram routers)
export const elevatedAdminQuery = authedQuery.use(
  requireRoles(["admin", "elevated_admin", "superadmin"])
);

// Platform-owner tier: global admin or superadmin (e.g. visitor logs and role elevation).
export const strictAdminQuery = authedQuery.use(requireRoles(["admin", "superadmin"]));
