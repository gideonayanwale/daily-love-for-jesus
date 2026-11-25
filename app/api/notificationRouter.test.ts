import { describe, expect, it } from "vitest";
import { createRouter, elevatedAdminQuery, superadminQuery } from "./middleware";
import type { TrpcContext } from "./context";
import type { User } from "@db/schema";

const context = (role?: string): TrpcContext => ({
  req: new Request("http://localhost/api/trpc"),
  resHeaders: new Headers(),
  ...(role ? { user: {
    id: "11111111-1111-4111-8111-111111111111",
    email: "admin@example.test",
    name: "Admin",
    avatar: null,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignInAt: new Date(),
  } as User } : {}),
});

describe("elevated-admin notification gate", () => {
  it("allows elevated admins and superadmins", async () => {
    const router = createRouter({ send: elevatedAdminQuery.query(({ ctx }) => ctx.user.role) });
    await expect(router.createCaller(context("elevated_admin")).send()).resolves.toBe("elevated_admin");
    await expect(router.createCaller(context("superadmin")).send()).resolves.toBe("superadmin");
  });

  it("rejects standard members", async () => {
    const router = createRouter({ send: elevatedAdminQuery.query(() => "sent") });
    await expect(router.createCaller(context("user")).send()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("superadmin-only platform role appointment gate", () => {
  it("allows only superadmins to enter the elevated-admin appointment procedure", async () => {
    const router = createRouter({ promote: superadminQuery.query(({ ctx }) => ctx.user.role) });
    await expect(router.createCaller(context("superadmin")).promote()).resolves.toBe("superadmin");
    for (const role of ["user", "admin", "elevated_admin"]) {
      await expect(router.createCaller(context(role)).promote()).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });
});
