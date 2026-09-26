import { getDb } from "../queries/connection";
import { pushTokens, notifications, groupMembers } from "@db/schema";
import { eq, inArray, and } from "drizzle-orm";

interface SendPushOptions {
  userIds?: string[];
  groupId?: number;
  title: string;
  body: string;
  data?: Record<string, any>;
  category?: string;
}

/**
 * Sends targeted push notifications to Expo client devices and stores in-app notifications.
 */
export async function sendTargetedPushNotification(options: SendPushOptions) {
  const db = getDb();
  let recipientIds = options.userIds ?? [];

  // If groupId is provided, resolve all active group members
  if (options.groupId && recipientIds.length === 0) {
    const members = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, options.groupId), eq(groupMembers.status, "active")));

    recipientIds = members.map((m) => m.userId);
  }

  if (recipientIds.length === 0) {
    return { sent: 0, recipientCount: 0 };
  }

  // 1. Create in-app notifications for each recipient
  const notificationRows = recipientIds.map((userId) => ({
    userId,
    groupId: options.groupId ?? null,
    title: options.title,
    body: options.body,
    category: options.category ?? "announcement",
    resourceType: options.data?.resourceType ?? "group",
    resourceId: options.data?.resourceId ? String(options.data.resourceId) : null,
    isRead: false,
  }));

  try {
    await db.insert(notifications).values(notificationRows);
  } catch (err) {
    console.error("[push] Failed to record in-app notifications:", err);
  }

  // 2. Fetch push tokens for recipient users
  const tokens = await db
    .select({ token: pushTokens.token, platform: pushTokens.platform })
    .from(pushTokens)
    .where(inArray(pushTokens.userId, recipientIds));

  if (tokens.length === 0) {
    return { sent: 0, recipientCount: recipientIds.length };
  }

  // 3. Dispatch to Expo Push API
  const messages = tokens.map((t) => ({
    to: t.token,
    sound: "default",
    title: options.title,
    body: options.body,
    data: options.data || {},
    badge: 1,
  }));

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    return { sent: messages.length, recipientCount: recipientIds.length, result };
  } catch (err) {
    console.warn("[push] Expo push dispatch error (will still show in-app):", err);
    return { sent: 0, recipientCount: recipientIds.length, error: String(err) };
  }
}
