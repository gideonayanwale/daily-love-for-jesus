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

function requireRoles(roles: readonly string[]) {
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

// Legacy platform administrator access. Keep explicit while permissions are migrated.
export const adminQuery = authedQuery.use(
  requireRoles(["admin", "elevated_admin", "superadmin"]),
);

// Existing platform operations use this broader role set; individual mutations
// must still enforce their own resource scope.
export const elevatedAdminQuery = authedQuery.use(
  requireRoles(["admin", "elevated_admin", "superadmin"]),
);

// Legacy strict administrator gate, retained for existing admin-only tools.
export const strictAdminQuery = authedQuery.use(
  requireRoles(["admin", "superadmin"]),
);

// Only the highest platform authority may appoint or revoke elevated admins.
export const superadminQuery = authedQuery.use(requireRoles(["superadmin"]));
