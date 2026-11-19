import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { adminQuery, createRouter, publicQuery } from "./middleware";
import type { TrpcContext } from "./context";
import type { User } from "@db/schema";

const baseContext = (): TrpcContext => ({
  req: new Request("http://localhost/api/trpc"),
  resHeaders: new Headers(),
});

const makeUser = (role: string): User => ({
  id: "11111111-1111-4111-8111-111111111111",
  email: "member@example.test",
  name: "Test Member",
  avatar: null,
  role,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignInAt: new Date(),
});

describe("tRPC authorization middleware", () => {
  it("allows anonymous access to explicitly public procedures", async () => {
    const router = createRouter({ ping: publicQuery.query(() => "pong") });
    await expect(router.createCaller(baseContext()).ping()).resolves.toBe("pong");
  });

  it("rejects an invalid supplied credential even on public procedures", async () => {
    const router = createRouter({ ping: publicQuery.query(() => "pong") });
    await expect(
      router.createCaller({ ...baseContext(), authError: true }).ping(),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("allows an administrator and rejects an ordinary user", async () => {
    const router = createRouter({
      secret: adminQuery.query(({ ctx }) => ctx.user.role),
    });
    await expect(
      router.createCaller({ ...baseContext(), user: makeUser("admin") }).secret(),
    ).resolves.toBe("admin");
    await expect(
      router.createCaller({ ...baseContext(), user: makeUser("user") }).secret(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
