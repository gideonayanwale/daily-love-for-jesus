import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserMock, findUserByIdMock, upsertUserMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  findUserByIdMock: vi.fn(),
  upsertUserMock: vi.fn(),
}));

vi.mock("./lib/supabase", () => ({
  supabaseAdmin: { getUser: getUserMock },
}));

vi.mock("./queries/users", () => ({
  findUserById: findUserByIdMock,
  upsertUser: upsertUserMock,
}));

import { createContext } from "./context";

const makeRequest = (authorization?: string) =>
  new Request("https://example.test/api/trpc/auth.me", {
    headers: authorization ? { authorization } : undefined,
  });

const makeProfile = (role = "user") => ({
  id: "11111111-1111-4111-8111-111111111111",
  email: "member@example.test",
  name: "Test Member",
  avatar: null,
  role,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  lastSignInAt: new Date("2026-01-01T00:00:00.000Z"),
});

const makeContext = (authorization?: string) =>
  createContext({
    req: makeRequest(authorization),
    resHeaders: new Headers(),
  } as never);

describe("authenticated profile provisioning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a least-privileged profile for a valid first-time signup", async () => {
    const profile = makeProfile();
    getUserMock.mockResolvedValue({
      id: profile.id,
      email: profile.email,
      user_metadata: { full_name: profile.name },
    });
    findUserByIdMock.mockResolvedValue(undefined);
    upsertUserMock.mockResolvedValue(profile);

    const context = await makeContext("Bearer valid-access-token");

    expect(context.user).toEqual(profile);
    expect(context.authError).toBe(false);
    expect(upsertUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: "user",
      }),
    );
  });

  it("preserves an existing server-assigned elevated role", async () => {
    const profile = makeProfile("elevated_admin");
    getUserMock.mockResolvedValue({
      id: profile.id,
      email: profile.email,
      user_metadata: { full_name: profile.name },
    });
    findUserByIdMock.mockResolvedValue(profile);

    const context = await makeContext("Bearer valid-access-token");

    expect(context.user?.role).toBe("elevated_admin");
    expect(upsertUserMock).not.toHaveBeenCalled();
  });

  it("rejects a supplied invalid token instead of treating it as a guest", async () => {
    getUserMock.mockResolvedValue(null);

    const context = await makeContext("Bearer expired-or-invalid-token");

    expect(context.user).toBeUndefined();
    expect(context.authError).toBe(true);
    expect(upsertUserMock).not.toHaveBeenCalled();
  });

  it("allows a genuinely anonymous request without provisioning a profile", async () => {
    const context = await makeContext();

    expect(context.user).toBeUndefined();
    expect(context.authError).toBe(false);
    expect(getUserMock).not.toHaveBeenCalled();
    expect(upsertUserMock).not.toHaveBeenCalled();
  });

  it("fails closed when profile provisioning fails", async () => {
    getUserMock.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      email: "member@example.test",
      user_metadata: { full_name: "Test Member" },
    });
    findUserByIdMock.mockResolvedValue(undefined);
    upsertUserMock.mockRejectedValue(new Error("database unavailable"));

    const context = await makeContext("Bearer valid-access-token");

    expect(context.user).toBeUndefined();
    expect(context.authError).toBe(true);
  });
});
