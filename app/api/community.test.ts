import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthorizationError, assertGroupRole } from "./lib/rbac";
import { communityRestRouter } from "./routes/community";

// Mock DB connection and queries
vi.mock("./queries/connection", () => {
  const mockDb = {
    query: {
      users: {
        findFirst: vi.fn(),
      },
      groups: {
        findFirst: vi.fn(),
      },
      groupMembers: {
        findFirst: vi.fn(),
      },
      readingLogs: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
  return { getDb: () => mockDb };
});

// Mock Supabase Auth
vi.mock("./context", () => ({
  authenticateSupabaseRequest: vi.fn(),
}));

describe("Community & Sunday School System - Deliverables & Security", () => {
  const teacherUser = {
    id: "user-teacher-uuid",
    email: "teacher@lovefellowship.org",
    name: "Pastor David",
    role: "user",
    avatar: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignInAt: new Date(),
  };

  const studentUser = {
    id: "user-student-uuid",
    email: "student@lovefellowship.org",
    name: "Bro Emmanuel",
    role: "user",
    avatar: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignInAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Role-Based Access Control (RBAC)", () => {
    it("denies students from accessing teacher-only group actions", async () => {
      const { getDb } = await import("./queries/connection");
      const db = getDb() as any;

      // Mock user is a student in group 1
      db.query.users.findFirst.mockResolvedValue(studentUser);
      db.query.groupMembers.findFirst.mockResolvedValue({
        id: 10,
        groupId: 1,
        userId: studentUser.id,
        role: "student",
        status: "active",
      });

      // Calling assertGroupRole with required 'teacher' role should throw AuthorizationError
      await expect(
        assertGroupRole(studentUser.id, 1, ["teacher", "assistant_teacher"])
      ).rejects.toThrow(AuthorizationError);
    });

    it("permits teachers to perform teacher-authorized group actions", async () => {
      const { getDb } = await import("./queries/connection");
      const db = getDb() as any;

      db.query.users.findFirst.mockResolvedValue(teacherUser);
      db.query.groupMembers.findFirst.mockResolvedValue({
        id: 11,
        groupId: 1,
        userId: teacherUser.id,
        role: "teacher",
        status: "active",
      });

      const membership = await assertGroupRole(teacherUser.id, 1, ["teacher", "assistant_teacher"]);
      expect(membership.role).toBe("teacher");
    });
  });

  describe("2. Batch Offline Tracking Sync & Idempotency", () => {
    it("processes batch offline logs and skips duplicate clientLogIds", async () => {
      const { authenticateSupabaseRequest } = await import("./context");
      (authenticateSupabaseRequest as any).mockResolvedValue(studentUser);

      const { getDb } = await import("./queries/connection");
      const db = getDb() as any;

      // Mock first log is new, second log already exists in DB
      db.query.readingLogs.findFirst
        .mockResolvedValueOnce(null) // log 1: new
        .mockResolvedValueOnce({ id: 99, clientLogId: "client_uuid_dup" }); // log 2: duplicate

      const req = new Request("http://localhost/api/tracking/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logs: [
            {
              contentId: "bible:40:5",
              contentType: "bible_chapter",
              bookNumber: 40,
              chapter: 5,
              timeSpent: 120,
              scrollDepth: 95,
              completedAt: new Date().toISOString(),
              clientLogId: "client_uuid_new_1",
            },
            {
              contentId: "bible:40:6",
              contentType: "bible_chapter",
              bookNumber: 40,
              chapter: 6,
              timeSpent: 90,
              scrollDepth: 100,
              completedAt: new Date().toISOString(),
              clientLogId: "client_uuid_dup",
            },
          ],
        }),
      });

      const res = await communityRestRouter.fetch(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.receivedCount).toBe(2);
      expect(data.syncedCount).toBe(1);
      expect(data.duplicateSkippedCount).toBe(1);
      expect(data.syncedIds).toContain("client_uuid_new_1");
    });
  });

  describe("3. 6-Digit Class Invite Code & Joining", () => {
    it("allows student to join a Sunday School group using an active invite code", async () => {
      const { authenticateSupabaseRequest } = await import("./context");
      (authenticateSupabaseRequest as any).mockResolvedValue(studentUser);

      const { getDb } = await import("./queries/connection");
      const db = getDb() as any;

      // Mock finding group by invite code
      db.query.groups.findFirst.mockResolvedValue({
        id: 1,
        name: "Youth Sunday School",
        status: "active",
        inviteCode: "LF8421",
      });

      // Mock user is not yet a member
      db.query.groupMembers.findFirst.mockResolvedValue(null);

      // Mock insertion
      db.insert().values().returning.mockResolvedValue([{ id: 42 }]);

      const req = new Request("http://localhost/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: "LF8421",
        }),
      });

      const res = await communityRestRouter.fetch(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.groupId).toBe(1);
      expect(data.groupName).toBe("Youth Sunday School");
      expect(data.role).toBe("student");
    });
  });
});
